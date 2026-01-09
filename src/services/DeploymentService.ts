/**
 * Deployment Service
 * 
 * Handles deployments to Vercel, Railway, and Render platforms
 * Integrates retry mechanism and circuit breaker for reliability
 * 
 * @module services/DeploymentService
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DeployConfig, DeployResult, DeployPlatform } from '../types/ipc';
import { TokenService } from './TokenService';
import { LogService } from './LogService';
import { decryptEnvVars } from '../utils/encryption';
import { retryWithBackoff, isRetryableError } from '../utils/retry';
import { CircuitBreaker, CircuitBreakerConfig } from '../utils/circuitBreaker';

/**
 * Service for managing deployments to various platforms
 */
export class DeploymentService {
  private static instance: DeploymentService | null = null;
  private tokenService: TokenService;
  private logService: LogService;
  private circuitBreakers: Map<DeployPlatform, CircuitBreaker> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
    this.tokenService = TokenService.getInstance();
    this.logService = LogService.getInstance();
    
    // Initialize circuit breakers for each platform
    this.initializeCircuitBreakers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DeploymentService {
    if (!DeploymentService.instance) {
      DeploymentService.instance = new DeploymentService();
    }
    return DeploymentService.instance;
  }

  /**
   * Initialize circuit breakers for each platform
   */
  private initializeCircuitBreakers(): void {
    const platforms: DeployPlatform[] = ['vercel', 'railway', 'render'];
    
    platforms.forEach((platform) => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        halfOpenTimeout: 10000, // 10 seconds
        isFailure: (error) => isRetryableError(error),
        onOpen: () => {
          console.warn(`Circuit breaker opened for ${platform}`);
        },
        onClose: () => {
          console.log(`Circuit breaker closed for ${platform} - service recovered`);
        },
        onHalfOpen: () => {
          console.log(`Circuit breaker entering half-open state for ${platform}`);
        },
      };
      
      this.circuitBreakers.set(platform, new CircuitBreaker(config));
    });
  }

  /**
   * Gets circuit breaker for a platform
   */
  private getCircuitBreaker(platform: DeployPlatform): CircuitBreaker {
    return this.circuitBreakers.get(platform) || this.circuitBreakers.get('vercel')!;
  }

  /**
   * Sets log service instance
   */
  setLogService(logService: LogService): void {
    this.logService = logService;
  }

  /**
   * Deploys to a platform
   * 
   * @param config - Deployment configuration
   * @param deploymentId - Deployment ID
   * @returns Deployment result
   */
  async deploy(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    const circuitBreaker = this.getCircuitBreaker(config.platform);

    // Use circuit breaker to protect external API calls
    return circuitBreaker.execute(async () => {
      switch (config.platform) {
        case 'vercel':
          return await this.deployVercel(config, deploymentId);
        case 'railway':
          return await this.deployRailway(config, deploymentId);
        case 'render':
          return await this.deployRender(config, deploymentId);
        default:
          return {
            success: false,
            error: `Unknown platform: ${config.platform}`,
            platform: config.platform,
          };
      }
    });
  }

  /**
   * Deploys to Vercel
   */
  private async deployVercel(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Vercel deployment...', 'info');

    try {
      // Decrypt env vars before deployment
      const decryptedEnvVars = decryptEnvVars(config.envVars);

      const tokenResult = await this.tokenService.getToken('vercel');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Vercel token not found', 'error');
        return { success: false, error: 'Vercel token not found', platform: 'vercel' };
      }

      this.logService.emitLog(deploymentId, 'Reading repository files...', 'info');

      const repoPath = config.repoPath;
      if (!fs.existsSync(repoPath)) {
        this.logService.emitLog(deploymentId, 'Repository path does not exist', 'error');
        return { success: false, error: 'Repository path does not exist', platform: 'vercel' };
      }

      const projectName = config.projectName || path.basename(repoPath);
      this.logService.emitLog(deploymentId, 'Creating Vercel deployment...', 'info');

      // Step 1: Create deployment with retry
      const deployResponse = await retryWithBackoff(
        async () => {
          return await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: projectName,
              gitSource: {
                type: 'github',
                repo: config.repoPath, // In production, extract from git remote
              },
              env: Object.entries(decryptedEnvVars).map(([key, value]) => ({
                key,
                value,
                type: 'encrypted',
                target: ['production', 'preview'],
              })),
              target: 'production',
            }),
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          multiplier: 2,
          isRetryable: isRetryableError,
        }
      );

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        this.logService.emitLog(deploymentId, `Vercel API error: ${errorText}`, 'error');
        return { success: false, error: `Vercel API error: ${deployResponse.statusText}`, platform: 'vercel' };
      }

      const deployData = await deployResponse.json();
      const vercelDeploymentId = deployData.id;
      const url = deployData.url;

      this.logService.emitLog(deploymentId, `Deployment created: ${url}`, 'success');
      this.logService.emitLog(deploymentId, 'Waiting for deployment to complete...', 'info');

      // Poll deployment status with exponential backoff
      const result = await this.pollVercelStatus(deploymentId, vercelDeploymentId, tokenResult.token, url);

      return result;
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'vercel' };
    }
  }

  /**
   * Polls Vercel deployment status with exponential backoff
   */
  private async pollVercelStatus(
    deploymentId: string,
    vercelDeploymentId: string,
    token: string,
    url: string
  ): Promise<DeployResult> {
    let status = 'building';
    let attempts = 0;
    const maxAttempts = 60;
    let lastDelay = 2000; // Start with 2 seconds

    while (status === 'building' || status === 'queued' || status === 'initializing') {
      await new Promise((resolve) => setTimeout(resolve, lastDelay));
      attempts++;

      try {
        const statusResponse = await retryWithBackoff(
          async () => {
            return await fetch(`https://api.vercel.com/v13/deployments/${vercelDeploymentId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            isRetryable: isRetryableError,
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.readyState || 'building';
          this.logService.emitLog(deploymentId, `Deployment status: ${status}`, 'info');
        }

        // Exponential backoff with max delay of 10 seconds
        lastDelay = Math.min(lastDelay * 1.5, 10000);
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling status: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }

      if (attempts >= maxAttempts) {
        this.logService.emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'vercel' };
      }
    }

    if (status === 'READY') {
      this.logService.emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: vercelDeploymentId, url, platform: 'vercel' };
    } else {
      this.logService.emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'vercel' };
    }
  }

  /**
   * Deploys to Railway
   */
  private async deployRailway(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Railway deployment...', 'info');

    try {
      const decryptedEnvVars = decryptEnvVars(config.envVars);

      const tokenResult = await this.tokenService.getToken('railway');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Railway token not found', 'error');
        return { success: false, error: 'Railway token not found', platform: 'railway' };
      }

      this.logService.emitLog(deploymentId, 'Reading repository files...', 'info');

      const repoPath = config.repoPath;
      if (!fs.existsSync(repoPath)) {
        this.logService.emitLog(deploymentId, 'Repository path does not exist', 'error');
        return { success: false, error: 'Repository path does not exist', platform: 'railway' };
      }

      const projectName = config.projectName || path.basename(repoPath);
      this.logService.emitLog(deploymentId, 'Creating Railway deployment...', 'info');

      // Step 1: Get or create project with retry
      const projectsResponse = await retryWithBackoff(
        async () => {
          return await fetch('https://api.railway.app/v1/projects', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
            },
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          isRetryable: isRetryableError,
        }
      );

      if (!projectsResponse.ok) {
        this.logService.emitLog(deploymentId, 'Failed to fetch Railway projects', 'error');
        return { success: false, error: 'Failed to fetch Railway projects', platform: 'railway' };
      }

      const projects = await projectsResponse.json();
      let project = projects.projects?.find((p: any) => p.name === projectName);

      if (!project) {
        // Create new project with retry
        const createProjectResponse = await retryWithBackoff(
          async () => {
            return await fetch('https://api.railway.app/v1/projects', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenResult.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: projectName }),
            });
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            isRetryable: isRetryableError,
          }
        );

        if (!createProjectResponse.ok) {
          this.logService.emitLog(deploymentId, 'Failed to create Railway project', 'error');
          return { success: false, error: 'Failed to create Railway project', platform: 'railway' };
        }

        project = await createProjectResponse.json();
      }

      this.logService.emitLog(deploymentId, `Project found/created: ${project.id}`, 'info');

      // Step 2: Create deployment with retry
      const deployResponse = await retryWithBackoff(
        async () => {
          return await fetch(`https://api.railway.app/v1/projects/${project.id}/deployments`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceId: project.id, // Simplified - in production create service first
              variables: decryptedEnvVars,
            }),
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          isRetryable: isRetryableError,
        }
      );

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        this.logService.emitLog(deploymentId, `Railway API error: ${errorText}`, 'error');
        return { success: false, error: `Railway API error: ${deployResponse.statusText}`, platform: 'railway' };
      }

      const deployData = await deployResponse.json();
      const railwayDeploymentId = deployData.id;

      this.logService.emitLog(deploymentId, `Deployment created: ${railwayDeploymentId}`, 'success');

      // Poll deployment status
      const result = await this.pollRailwayStatus(deploymentId, railwayDeploymentId, tokenResult.token, projectName);

      return result;
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'railway' };
    }
  }

  /**
   * Polls Railway deployment status with exponential backoff
   */
  private async pollRailwayStatus(
    deploymentId: string,
    railwayDeploymentId: string,
    token: string,
    projectName: string
  ): Promise<DeployResult> {
    let status = 'DEPLOYING';
    let attempts = 0;
    const maxAttempts = 60;
    let lastDelay = 2000;

    while (status === 'DEPLOYING' || status === 'QUEUED') {
      await new Promise((resolve) => setTimeout(resolve, lastDelay));
      attempts++;

      try {
        const statusResponse = await retryWithBackoff(
          async () => {
            return await fetch(`https://api.railway.app/v1/deployments/${railwayDeploymentId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            isRetryable: isRetryableError,
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.status || 'DEPLOYING';
          this.logService.emitLog(deploymentId, `Deployment status: ${status}`, 'info');
        }

        lastDelay = Math.min(lastDelay * 1.5, 10000);
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling status: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }

      if (attempts >= maxAttempts) {
        this.logService.emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'railway' };
      }
    }

    if (status === 'SUCCESS') {
      const url = `https://${projectName}.railway.app`;
      this.logService.emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: railwayDeploymentId, url, platform: 'railway' };
    } else {
      this.logService.emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'railway' };
    }
  }

  /**
   * Deploys to Render
   */
  private async deployRender(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Render deployment...', 'info');

    try {
      const decryptedEnvVars = decryptEnvVars(config.envVars);

      const tokenResult = await this.tokenService.getToken('render');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Render token not found', 'error');
        return { success: false, error: 'Render token not found', platform: 'render' };
      }

      this.logService.emitLog(deploymentId, 'Reading repository files...', 'info');

      const repoPath = config.repoPath;
      if (!fs.existsSync(repoPath)) {
        this.logService.emitLog(deploymentId, 'Repository path does not exist', 'error');
        return { success: false, error: 'Repository path does not exist', platform: 'render' };
      }

      const projectName = config.projectName || path.basename(repoPath);
      this.logService.emitLog(deploymentId, 'Creating Render service...', 'info');

      // Create service with retry
      const serviceResponse = await retryWithBackoff(
        async () => {
          return await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'web_service',
              name: projectName,
              repo: config.repoPath, // In production, extract from git remote
              envVars: Object.entries(decryptedEnvVars).map(([key, value]) => ({
                key,
                value,
              })),
              branch: config.branch || 'main',
            }),
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          isRetryable: isRetryableError,
        }
      );

      if (!serviceResponse.ok) {
        const errorText = await serviceResponse.text();
        this.logService.emitLog(deploymentId, `Render API error: ${errorText}`, 'error');
        return { success: false, error: `Render API error: ${serviceResponse.statusText}`, platform: 'render' };
      }

      const serviceData = await serviceResponse.json();
      const serviceId = serviceData.service?.id;

      if (!serviceId) {
        this.logService.emitLog(deploymentId, 'Failed to create Render service', 'error');
        return { success: false, error: 'Failed to create Render service', platform: 'render' };
      }

      this.logService.emitLog(deploymentId, `Service created: ${serviceId}`, 'info');
      this.logService.emitLog(deploymentId, 'Waiting for deployment to complete...', 'info');

      // Poll deployment status
      const result = await this.pollRenderStatus(deploymentId, serviceId, tokenResult.token, projectName);

      return result;
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'render' };
    }
  }

  /**
   * Polls Render deployment status with exponential backoff
   */
  private async pollRenderStatus(
    deploymentId: string,
    serviceId: string,
    token: string,
    projectName: string
  ): Promise<DeployResult> {
    let status = 'building';
    let attempts = 0;
    const maxAttempts = 60;
    let lastDelay = 2000;

    while (status !== 'live' && status !== 'suspended') {
      await new Promise((resolve) => setTimeout(resolve, lastDelay));
      attempts++;

      try {
        const statusResponse = await retryWithBackoff(
          async () => {
            return await fetch(`https://api.render.com/v1/services/${serviceId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            isRetryable: isRetryableError,
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.service?.serviceDetails?.healthCheckPath ? 'live' : 'building';
          this.logService.emitLog(deploymentId, `Deployment status: ${status}`, 'info');
        }

        lastDelay = Math.min(lastDelay * 1.5, 10000);
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling status: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }

      if (attempts >= maxAttempts) {
        this.logService.emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'render' };
      }
    }

    if (status === 'live') {
      const url = `https://${projectName}.onrender.com`;
      this.logService.emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: serviceId, url, platform: 'render' };
    } else {
      this.logService.emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'render' };
    }
  }

  /**
   * Gets circuit breaker stats for a platform
   */
  getCircuitBreakerStats(platform: DeployPlatform) {
    return this.getCircuitBreaker(platform).getStats();
  }
}
