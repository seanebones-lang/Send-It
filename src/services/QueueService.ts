/**
 * Queue Service
 * 
 * Manages deployment queue with parallel processing support
 * Implements worker pool pattern for concurrent deployments
 * Persists queue state in database for recovery
 * 
 * @module services/QueueService
 */

import { webContents } from 'electron';
import type { DeployConfig, DeployResult, QueueItem } from '../types/ipc';
import { DatabaseService } from './DatabaseService';
import { DeploymentService } from './DeploymentService';
import { LogService } from './LogService';
import { NotificationService } from './NotificationService';
import { encryptEnvVars } from '../utils/encryption';

/**
 * Configuration for queue processing
 */
export interface QueueConfig {
  /** Maximum number of concurrent deployments (default: 3) */
  maxConcurrent?: number;
  /** Enable parallel processing (default: true) */
  parallel?: boolean;
}

/**
 * Service for managing deployment queue
 */
export class QueueService {
  private static instance: QueueService | null = null;
  private deployQueue: QueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private activeWorkers: Set<string> = new Set(); // Track active deployment IDs
  private maxConcurrent: number = 3;
  private parallel: boolean = true;
  private databaseService: DatabaseService;
  private deploymentService: DeploymentService;
  private logService: LogService;
  private notificationService: NotificationService;

  private constructor() {
    // Private constructor for singleton pattern
    this.databaseService = DatabaseService.getInstance();
    this.deploymentService = DeploymentService.getInstance();
    this.logService = LogService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize queue service
   * 
   * @param config - Queue configuration
   */
  initialize(config: QueueConfig = {}): void {
    this.maxConcurrent = config.maxConcurrent || 3;
    this.parallel = config.parallel !== false;

    // Load pending deployments from database on startup
    this.loadPendingDeployments();
  }

  /**
   * Loads pending deployments from database on startup
   */
  private loadPendingDeployments(): void {
    try {
      const pending = this.databaseService.getDeploymentsByStatus('queued');
      const processing = this.databaseService.getDeploymentsByStatus('processing');

      // Re-queue pending and processing deployments (in case of crash)
      [...pending, ...processing].forEach((item) => {
        if (!this.deployQueue.find((q) => q.id === item.id)) {
          this.deployQueue.push({ ...item, status: 'queued' }); // Reset processing to queued
        }
      });

      if (this.deployQueue.length > 0) {
        console.log(`Recovered ${this.deployQueue.length} deployments from database`);
        this.processDeploymentQueue();
      }
    } catch (error) {
      console.error('Error loading pending deployments:', error);
    }
  }

  /**
   * Adds a deployment to the queue
   * 
   * @param config - Deployment configuration
   * @param deploymentId - Deployment ID (optional, will generate if not provided)
   * @returns Deployment ID
   */
  async queueDeployment(config: DeployConfig, deploymentId?: string): Promise<string> {
    const id = deploymentId || `deploy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Encrypt env vars before storing
    const encryptedEnvVars = encryptEnvVars(config.envVars);
    const configWithEncrypted = { ...config, envVars: encryptedEnvVars };

    const item: QueueItem = {
      id,
      config: configWithEncrypted,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    this.deployQueue.push(item);

    // Update notification service
    const activeCount = this.deployQueue.filter((d) => d.status === 'processing' || d.status === 'queued').length;
    this.notificationService.setActiveDeployCount(activeCount);

    // Send notification
    this.notificationService.sendNotification(
      'Deployment Queued',
      `New ${config.platform} deployment added to queue`,
      'info'
    );

    // Store in database with encrypted env vars
    this.databaseService.saveDeployment(id, configWithEncrypted, 'queued');

    // Start processing queue
    this.processDeploymentQueue().catch((error) => {
      console.error('Error processing deployment queue:', error);
      this.logService.emitLog(id, `Queue processing error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    });

    return id;
  }

  /**
   * Gets a deployment from queue by ID
   * 
   * @param deploymentId - Deployment ID
   * @returns QueueItem or null if not found
   */
  getDeployment(deploymentId: string): QueueItem | null {
    // First check in-memory queue
    const queueItem = this.deployQueue.find((item) => item.id === deploymentId);
    if (queueItem) {
      return queueItem;
    }

    // Check database
    return this.databaseService.getDeployment(deploymentId);
  }

  /**
   * Gets all deployments in queue
   * 
   * @returns Array of queue items
   */
  getAllDeployments(): QueueItem[] {
    const queueItems = [...this.deployQueue];

    // Also get from database (may have items not in memory)
    const dbItems = this.databaseService.getAllDeployments(100);
    dbItems.forEach((dbItem) => {
      if (!queueItems.find((item) => item.id === dbItem.id)) {
        queueItems.push(dbItem);
      }
    });

    return queueItems;
  }

  /**
   * Processes deployment queue (parallel or sequential)
   */
  async processDeploymentQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    if (this.deployQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      if (this.parallel) {
        await this.processDeploymentQueueParallel();
      } else {
        await this.processDeploymentQueueSequential();
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Processes deployment queue sequentially (original behavior)
   */
  private async processDeploymentQueueSequential(): Promise<void> {
    while (this.deployQueue.length > 0) {
      const item = this.deployQueue.shift();
      if (!item) break;

      await this.processDeploymentItem(item);
    }
  }

  /**
   * Processes deployment queue in parallel (new behavior)
   * Optimized: Uses event-driven approach, no fixed delays, efficient worker management
   */
  private async processDeploymentQueueParallel(): Promise<void> {
    const workerPromises: Map<string, Promise<void>> = new Map();

    // Helper to wait for next worker completion
    const waitForNextWorker = async (): Promise<void> => {
      if (workerPromises.size === 0) {
        return Promise.resolve();
      }
      return Promise.race(Array.from(workerPromises.values()));
    };

    while (this.deployQueue.length > 0 || this.activeWorkers.size > 0) {
      // Start new workers up to maxConcurrent
      while (this.activeWorkers.size < this.maxConcurrent && this.deployQueue.length > 0) {
        const item = this.deployQueue.shift();
        if (!item) break;

        // Mark as active
        this.activeWorkers.add(item.id);

        // Create worker promise
        const workerPromise = this.processDeploymentItem(item)
          .finally(() => {
            // Clean up on completion
            this.activeWorkers.delete(item.id);
            workerPromises.delete(item.id);
          });

        workerPromises.set(item.id, workerPromise);
      }

      // If at capacity or no more items, wait for a worker to complete
      if (this.activeWorkers.size >= this.maxConcurrent || 
          (this.deployQueue.length === 0 && this.activeWorkers.size > 0)) {
        await waitForNextWorker();
      } else if (this.deployQueue.length === 0 && this.activeWorkers.size === 0) {
        // No more work, exit
        break;
      } else {
        // Small delay only when idle (no active workers and queue empty)
        // This prevents tight loop during rapid queue additions
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Wait for all remaining workers to complete
    if (workerPromises.size > 0) {
      await Promise.allSettled(Array.from(workerPromises.values()));
    }
  }

  /**
   * Processes a single deployment item
   */
  private async processDeploymentItem(item: QueueItem): Promise<void> {
    try {
      item.status = 'processing';
      item.startedAt = new Date().toISOString();

      // Update database
      this.databaseService.updateDeploymentStatus(item.id, 'processing', item.startedAt);

      // Update notification service
      const activeCount = this.deployQueue.filter((d) => d.status === 'processing' || d.status === 'queued').length + this.activeWorkers.size;
      this.notificationService.setActiveDeployCount(activeCount);

      this.logService.emitLog(item.id, `Processing deployment: ${item.config.platform}`, 'info');
      this.notificationService.sendNotification(
        'Deployment Started',
        `${item.config.platform} deployment in progress`,
        'info'
      );

      // Execute deployment
      const result = await this.deploymentService.deploy(item.config, item.id);

      item.result = result;
      item.status = result.success ? 'completed' : 'failed';
      item.completedAt = new Date().toISOString();

      // Update database
      this.databaseService.updateDeploymentResult(item.id, result, item.completedAt);

      this.logService.emitLog(item.id, `Deployment ${result.success ? 'completed' : 'failed'}`, result.success ? 'success' : 'error');

      // Update notification service
      const newActiveCount = this.deployQueue.filter((d) => d.status === 'processing' || d.status === 'queued').length + this.activeWorkers.size - 1;
      this.notificationService.setActiveDeployCount(Math.max(0, newActiveCount));

      // Send notification
      if (result.success) {
        this.notificationService.sendNotification(
          'Deployment Successful',
          `${item.config.platform} deployment completed${result.url ? `: ${result.url}` : ''}`,
          'success'
        );
      } else {
        this.notificationService.sendNotification(
          'Deployment Failed',
          `${item.config.platform} deployment failed: ${result.error || 'Unknown error'}`,
          'error'
        );
      }

      // Broadcast status update
      webContents.getAllWebContents().forEach((contents) => {
        if (!contents.isDestroyed()) {
          contents.send('deploy:status', {
            id: item.id,
            status: item.status,
            result,
          });
        }
      });
    } catch (error) {
      item.status = 'failed';
      item.completedAt = new Date().toISOString();
      item.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: item.config.platform,
      };

      // Update database
      this.databaseService.updateDeploymentResult(item.id, item.result, item.completedAt);

      this.logService.emitLog(item.id, `Deployment error: ${item.result.error}`, 'error');

      // Update notification service
      const newActiveCount = this.deployQueue.filter((d) => d.status === 'processing' || d.status === 'queued').length + this.activeWorkers.size - 1;
      this.notificationService.setActiveDeployCount(Math.max(0, newActiveCount));

      this.notificationService.sendNotification(
        'Deployment Failed',
        `${item.config.platform} deployment failed: ${item.result.error}`,
        'error'
      );
    }
  }

  /**
   * Gets queue statistics
   */
  getQueueStats() {
    return {
      queued: this.deployQueue.filter((d) => d.status === 'queued').length,
      processing: this.deployQueue.filter((d) => d.status === 'processing').length + this.activeWorkers.size,
      completed: this.deployQueue.filter((d) => d.status === 'completed').length,
      failed: this.deployQueue.filter((d) => d.status === 'failed').length,
      total: this.deployQueue.length,
      activeWorkers: this.activeWorkers.size,
      maxConcurrent: this.maxConcurrent,
    };
  }
}
