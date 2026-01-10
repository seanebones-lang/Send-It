/**
 * Web Deployment Service
 * Frontend-only deployment service - NO BACKEND NEEDED!
 * Calls platform APIs directly from the browser using fetch()
 * 
 * CRITICAL: This is where actual deployments happen - all from the frontend!
 */

import type { DeployConfig, DeployResult, DeployPlatform, TokenResult } from '../types/ipc';
import { retryWithBackoff, isRetryableError } from '../utils/retry';
import { CircuitBreaker, CircuitBreakerConfig } from '../utils/circuitBreaker';
import { WebTokenService } from './WebTokenService';

/**
 * Web-compatible log service (in-memory + console)
 */
class WebLogService {
  private logs: Map<string, Array<{ message: string; level: string; timestamp: number }>> = new Map();
  private listeners: Map<string, Array<(message: string) => void>> = new Map();

  emitLog(deploymentId: string, message: string, level: 'info' | 'error' | 'success' = 'info'): void {
    if (!this.logs.has(deploymentId)) {
      this.logs.set(deploymentId, []);
    }
    
    const log = { message, level, timestamp: Date.now() };
    this.logs.get(deploymentId)!.push(log);
    
    // Emit to listeners
    const listeners = this.listeners.get(deploymentId) || [];
    listeners.forEach(listener => listener(message));
    
    // Also log to console
    console.log(`[${level.toUpperCase()}] ${deploymentId}: ${message}`);
  }

  getLogs(deploymentId: string): string[] {
    const logs = this.logs.get(deploymentId) || [];
    return logs.map(log => `[${log.level}] ${log.message}`);
  }

  onLog(deploymentId: string, callback: (message: string) => void): () => void {
    if (!this.listeners.has(deploymentId)) {
      this.listeners.set(deploymentId, []);
    }
    this.listeners.get(deploymentId)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(deploymentId) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
}

/**
 * Extract owner and repo from GitHub URL
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

/**
 * Extract repo info from path (github://owner/repo or URL)
 */
function extractRepoInfo(repoPath: string): { owner: string; repo: string } | null {
  // Try to parse from repoPath first (github://owner/repo format from browserAPI)
  if (repoPath.startsWith('github://')) {
    const parts = repoPath.replace('github://', '').split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  
  // Try to parse repoPath as URL
  return parseGitHubUrl(repoPath);
}

/**
 * Web Deployment Service
 * Calls platform APIs directly from the browser
 */
export class WebDeploymentService {
  private static instance: WebDeploymentService | null = null;
  private tokenService: WebTokenService;
  private logService: WebLogService;
  private circuitBreakers: Map<DeployPlatform, CircuitBreaker> = new Map();

  private constructor() {
    this.tokenService = WebTokenService.getInstance();
    this.logService = new WebLogService();
    this.initializeCircuitBreakers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebDeploymentService {
    if (!WebDeploymentService.instance) {
      WebDeploymentService.instance = new WebDeploymentService();
    }
    return WebDeploymentService.instance;
  }

  private initializeCircuitBreakers(): void {
    const platforms: DeployPlatform[] = ['vercel', 'netlify', 'railway', 'render'];
    
    platforms.forEach((platform) => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenTimeout: 10000,
        isFailure: (error) => isRetryableError(error),
        onOpen: () => console.warn(`Circuit breaker opened for ${platform}`),
        onClose: () => console.log(`Circuit breaker closed for ${platform}`),
        onHalfOpen: () => console.log(`Circuit breaker half-open for ${platform}`),
      };
      
      this.circuitBreakers.set(platform, new CircuitBreaker(config));
    });
  }

  private getCircuitBreaker(platform: DeployPlatform): CircuitBreaker {
    return this.circuitBreakers.get(platform) || this.circuitBreakers.get('vercel')!;
  }

  getLogService(): WebLogService {
    return this.logService;
  }

  /**
   * Get token for platform
   */
  async getToken(platform: DeployPlatform): Promise<TokenResult> {
    return this.tokenService.getToken(platform);
  }

  /**
   * Set token for platform
   */
  async setToken(platform: DeployPlatform, token: string): Promise<TokenResult> {
    return this.tokenService.setToken(platform, token);
  }

  /**
   * Deploy to a platform
   * CRITICAL: This is where actual deployment happens - directly from browser!
   */
  async deploy(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    const circuitBreaker = this.getCircuitBreaker(config.platform);

    return circuitBreaker.execute(async () => {
      switch (config.platform) {
        case 'vercel':
          return await this.deployVercel(config, deploymentId);
        case 'netlify':
          return await this.deployNetlify(config, deploymentId);
        case 'railway':
          return await this.deployRailway(config, deploymentId);
        case 'render':
          return await this.deployRender(config, deploymentId);
        default:
          return {
            success: false,
            error: `Platform ${config.platform} not yet implemented. Please use Vercel, Netlify, Railway, or Render.`,
            platform: config.platform,
          };
      }
    });
  }

  /**
   * Deploy to Vercel - Direct API call from browser
   * CRITICAL: This actually deploys to Vercel!
   */
  private async deployVercel(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Vercel deployment...', 'info');

    try {
      const tokenResult = await this.tokenService.getToken('vercel');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Vercel token not found. Please authenticate first.', 'error');
        return { success: false, error: 'Vercel token not found. Please authenticate first.', platform: 'vercel' };
      }
      const token = tokenResult.token;

      // Extract repo info from GitHub URL (repoPath might be github://owner/repo or actual URL)
      const repoInfo = extractRepoInfo(config.repoPath);
      if (!repoInfo) {
        this.logService.emitLog(deploymentId, 'Invalid repository URL. Please provide a valid GitHub URL.', 'error');
        return { success: false, error: 'Invalid repository URL', platform: 'vercel' };
      }

      const projectName = config.projectName || repoInfo.repo;
      this.logService.emitLog(deploymentId, `Creating Vercel deployment for ${repoInfo.owner}/${repoInfo.repo}...`, 'info');

      // CRITICAL: Direct API call to Vercel from browser!
      const deployResponse = await retryWithBackoff(
        async () => {
          return await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: projectName,
              gitSource: {
                type: 'github',
                repo: `${repoInfo.owner}/${repoInfo.repo}`,
                ref: config.branch || 'main',
              },
              env: Object.entries(config.envVars).map(([key, value]) => ({
                key,
                value,
                type: 'encrypted',
                target: ['production', 'preview'],
              })),
              target: 'production',
              projectSettings: {
                framework: config.framework || null,
              },
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
      const url = deployData.url || `https://${deployData.alias?.[0] || deployData.name}-${deployData.team?.slug || 'vercel'}.vercel.app`;

      this.logService.emitLog(deploymentId, `Deployment created: ${url}`, 'success');
      this.logService.emitLog(deploymentId, 'Waiting for deployment to complete...', 'info');

      // Poll deployment status
      const result = await this.pollVercelStatus(deploymentId, vercelDeploymentId, token, url);

      return result;
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'vercel' };
    }
  }

  /**
   * Poll Vercel deployment status
   */
  private async pollVercelStatus(
    deploymentId: string,
    vercelDeploymentId: string,
    token: string,
    url: string
  ): Promise<DeployResult> {
    let status = 'building';
    let attempts = 0;
    const maxAttempts = 60; // Max 5 minutes (60 * 5 seconds)

    while (status === 'building' || status === 'queued' || status === 'initializing' || status === 'readying') {
      if (attempts >= maxAttempts) {
        this.logService.emitLog(deploymentId, 'Deployment timeout - still building after 5 minutes', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'vercel' };
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds

      try {
        const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${vercelDeploymentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.readyState || status;
          
          this.logService.emitLog(deploymentId, `Deployment status: ${status}`, 'info');

          if (status === 'READY' || status === 'ready') {
            this.logService.emitLog(deploymentId, `Deployment successful! Live at: ${url}`, 'success');
            return {
              success: true,
              deploymentId: vercelDeploymentId,
              url: url,
              platform: 'vercel',
            };
          } else if (status === 'ERROR' || status === 'error' || status === 'CANCELED') {
            this.logService.emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
            return {
              success: false,
              error: `Deployment failed: ${status}`,
              platform: 'vercel',
            };
          }
        }
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling status: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }

      attempts++;
    }

    return { success: false, error: 'Unknown deployment status', platform: 'vercel' };
  }

  /**
   * Deploy to Railway - Direct API call from browser
   */
  private async deployRailway(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Railway deployment...', 'info');

    try {
      const tokenResult = await this.tokenService.getToken('railway');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Railway token not found. Please authenticate first.', 'error');
        return { success: false, error: 'Railway token not found', platform: 'railway' };
      }
      const token = tokenResult.token;

      const repoInfo = extractRepoInfo(config.repoPath);
      if (!repoInfo) {
        return { success: false, error: 'Invalid repository URL', platform: 'railway' };
      }

      const projectName = config.projectName || repoInfo.repo;
      this.logService.emitLog(deploymentId, `Creating Railway service for ${repoInfo.owner}/${repoInfo.repo}...`, 'info');

      // CRITICAL: Direct API call to Railway from browser!
      const deployResponse = await retryWithBackoff(
        async () => {
          // First, create or get project
          const projectsResponse = await fetch('https://api.railway.app/v1/projects', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          let projectId: string;
          if (projectsResponse.ok) {
            const projects = await projectsResponse.json();
            projectId = projects[0]?.id || projects.projects?.[0]?.id;
          } else {
            // Create project if none exists
            const createProjectResponse = await fetch('https://api.railway.app/v1/projects', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: projectName,
              }),
            });
            const project = await createProjectResponse.json();
            projectId = project.id || project.project?.id;
          }

          // Create service
          return await fetch('https://api.railway.app/v1/services', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              name: projectName,
              source: {
                repo: `${repoInfo.owner}/${repoInfo.repo}`,
                branch: config.branch || 'main',
              },
              variables: Object.entries(config.envVars).map(([key, value]) => ({
                name: key,
                value,
              })),
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
      const serviceId = deployData.id || deployData.service?.id;

      this.logService.emitLog(deploymentId, 'Railway service created. Deployment in progress...', 'info');

      // Railway automatically deploys when service is created
      // Poll for service URL
      const url = await this.pollRailwayService(deploymentId, serviceId, token);

      if (url) {
        return {
          success: true,
          deploymentId: serviceId,
          url: url,
          platform: 'railway',
        };
      }

      return {
        success: false,
        error: 'Failed to get Railway deployment URL',
        platform: 'railway',
      };
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'railway' };
    }
  }

  /**
   * Poll Railway service for URL
   */
  private async pollRailwayService(deploymentId: string, serviceId: string, token: string): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const response = await fetch(`https://api.railway.app/v1/services/${serviceId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const service = data.service || data;
          
          if (service.domain?.domain) {
            return `https://${service.domain.domain}`;
          }
          
          // Check deployments
          if (service.deployments && service.deployments.length > 0) {
            const deployment = service.deployments[0];
            if (deployment.status === 'SUCCESS' && deployment.url) {
              return deployment.url;
            }
          }
        }
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling Railway service: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }

      attempts++;
    }

    return null;
  }

  /**
   * Deploy to Render - Direct API call from browser
   */
  private async deployRender(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Render deployment...', 'info');

    try {
      const tokenResult = await this.tokenService.getToken('render');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Render token not found. Please authenticate first.', 'error');
        return { success: false, error: 'Render token not found', platform: 'render' };
      }
      const token = tokenResult.token;

      const repoInfo = extractRepoInfo(config.repoPath);
      if (!repoInfo) {
        return { success: false, error: 'Invalid repository URL', platform: 'render' };
      }

      const projectName = config.projectName || repoInfo.repo;
      this.logService.emitLog(deploymentId, `Creating Render service for ${repoInfo.owner}/${repoInfo.repo}...`, 'info');

      // CRITICAL: Direct API call to Render from browser!
      const deployResponse = await retryWithBackoff(
        async () => {
          return await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'web_service',
              name: projectName,
              repo: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
              branch: config.branch || 'main',
              buildCommand: config.buildCommand || null,
              startCommand: config.startCommand || null,
              envVars: Object.entries(config.envVars).map(([key, value]) => ({
                key,
                value,
              })),
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
        this.logService.emitLog(deploymentId, `Render API error: ${errorText}`, 'error');
        return { success: false, error: `Render API error: ${deployResponse.statusText}`, platform: 'render' };
      }

      const deployData = await deployResponse.json();
      const serviceId = deployData.service?.id || deployData.id;
      const url = deployData.service?.serviceDetails?.url || deployData.serviceDetails?.url;

      this.logService.emitLog(deploymentId, 'Render service created. Deployment in progress...', 'info');

      if (url) {
        return {
          success: true,
          deploymentId: serviceId,
          url: url,
          platform: 'render',
        };
      }

      // Poll for URL if not immediately available
      const finalUrl = await this.pollRenderService(deploymentId, serviceId, token);
      
      if (finalUrl) {
        return {
          success: true,
          deploymentId: serviceId,
          url: finalUrl,
          platform: 'render',
        };
      }

      return {
        success: false,
        error: 'Failed to get Render service URL',
        platform: 'render',
      };
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'render' };
    }
  }

  /**
   * Poll Render service for URL
   */
  private async pollRenderService(deploymentId: string, serviceId: string, token: string): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const response = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const service = data.service || data;
          
          if (service.serviceDetails?.url) {
            return `https://${service.serviceDetails.url}`;
          }
          
          if (service.url) {
            return service.url.startsWith('http') ? service.url : `https://${service.url}`;
          }

          // Check if service is ready
          if (service.serviceDetails?.deployStatus === 'live') {
            // URL should be available
            continue;
          }
        }
      } catch (error) {
        this.logService.emitLog(deploymentId, `Error polling Render service: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }

      attempts++;
    }

    return null;
  }

  /**
   * Deploy to Netlify - Direct API call from browser
   * CRITICAL: This actually deploys to Netlify - all from frontend!
   */
  private async deployNetlify(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
    this.logService.emitLog(deploymentId, 'Starting Netlify deployment...', 'info');

    try {
      const tokenResult = await this.tokenService.getToken('netlify');
      if (!tokenResult.success || !tokenResult.token) {
        this.logService.emitLog(deploymentId, 'Netlify token not found. Please authenticate first.', 'error');
        return { success: false, error: 'Netlify token not found. Please authenticate first.', platform: 'netlify' };
      }
      const token = tokenResult.token;

      const repoInfo = extractRepoInfo(config.repoPath);
      if (!repoInfo) {
        this.logService.emitLog(deploymentId, 'Invalid repository URL. Please provide a valid GitHub URL.', 'error');
        return { success: false, error: 'Invalid repository URL', platform: 'netlify' };
      }

      const siteName = config.projectName || repoInfo.repo;
      this.logService.emitLog(deploymentId, `Creating Netlify site for ${repoInfo.owner}/${repoInfo.repo}...`, 'info');

      // CRITICAL: Direct API call to Netlify from browser - NO BACKEND!
      const deployResponse = await retryWithBackoff(
        async () => {
          // Create site with Git integration
          return await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: siteName,
              repo: {
                provider: 'github',
                repo: repoInfo.repo,
                owner: repoInfo.owner,
                branch: config.branch || 'main',
              },
              build_settings: {
                cmd: config.buildCommand || 'npm run build',
                dir: config.rootDirectory || 'dist',
              },
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
        this.logService.emitLog(deploymentId, `Netlify API error: ${errorText}`, 'error');
        return { success: false, error: `Netlify API error: ${deployResponse.statusText}`, platform: 'netlify' };
      }

      const deployData = await deployResponse.json();
      const siteId = deployData.id || deployData.site_id;
      const url = deployData.url || deployData.ssl_url || `https://${siteName}.netlify.app`;

      this.logService.emitLog(deploymentId, `Netlify site created: ${url}`, 'success');
      this.logService.emitLog(deploymentId, 'Setting environment variables...', 'info');

      // Set environment variables
      if (Object.keys(config.envVars).length > 0) {
        try {
          const envVars = Object.entries(config.envVars).map(([key, value]) => ({
            key,
            values: [{ value, context: 'production', context_parameter: null }],
          }));

          await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(envVars),
          });

          this.logService.emitLog(deploymentId, 'Environment variables set.', 'success');
        } catch (error) {
          this.logService.emitLog(deploymentId, `Warning: Failed to set some environment variables: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
        }
      }

      // Netlify automatically triggers build when site is created with repo
      this.logService.emitLog(deploymentId, 'Build triggered automatically. Deployment in progress...', 'info');
      
      return {
        success: true,
        deploymentId: siteId,
        url: url,
        platform: 'netlify',
      };
    } catch (error) {
      this.logService.emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'netlify' };
    }
  }
}

/**
 * Singleton instance
 */
export const webDeploymentService = WebDeploymentService.getInstance();
