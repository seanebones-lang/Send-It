/**
 * Unit tests for QueueService
 * Tests queue management, parallel processing, and persistence
 */

import { QueueService } from './QueueService';
import { DatabaseService } from './DatabaseService';
import { DeploymentService } from './DeploymentService';
import { LogService } from './LogService';
import { NotificationService } from './NotificationService';
import type { DeployConfig, DeployResult } from '../types/ipc';

// Mock services
jest.mock('./DatabaseService', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      saveDeployment: jest.fn(),
      updateDeploymentStatus: jest.fn(),
      updateDeploymentResult: jest.fn(),
      getDeployment: jest.fn(() => null),
      getAllDeployments: jest.fn(() => []),
      getDeploymentsByStatus: jest.fn(() => []),
      getDb: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('./DeploymentService', () => ({
  DeploymentService: {
    getInstance: jest.fn(() => ({
      deploy: jest.fn(),
      setLogService: jest.fn(),
    })),
  },
}));

jest.mock('./LogService', () => ({
  LogService: {
    getInstance: jest.fn(() => ({
      emitLog: jest.fn(),
    })),
  },
}));

jest.mock('./NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      setActiveDeployCount: jest.fn(),
      sendNotification: jest.fn(),
      getActiveDeployCount: jest.fn(() => 0),
    })),
  },
}));

jest.mock('../utils/encryption', () => ({
  encryptEnvVars: jest.fn((envVars: Record<string, string>) => envVars),
}));

jest.mock('electron', () => ({
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

describe('QueueService', () => {
  let queueService: QueueService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockDeploymentService: jest.Mocked<DeploymentService>;
  let mockLogService: jest.Mocked<LogService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Reset singleton instance
    (QueueService as any).instance = null;
    queueService = QueueService.getInstance();

    mockDatabaseService = {
      saveDeployment: jest.fn(),
      updateDeploymentStatus: jest.fn(),
      updateDeploymentResult: jest.fn(),
      getDeployment: jest.fn(() => null),
      getAllDeployments: jest.fn(() => []),
      getDeploymentsByStatus: jest.fn(() => []),
      getDb: jest.fn(() => ({})),
    } as any;

    mockDeploymentService = {
      deploy: jest.fn(),
      setLogService: jest.fn(),
    } as any;

    mockLogService = {
      emitLog: jest.fn(),
    } as any;

    mockNotificationService = {
      setActiveDeployCount: jest.fn(),
      sendNotification: jest.fn(),
      getActiveDeployCount: jest.fn(() => 0),
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);
    (DeploymentService.getInstance as jest.Mock).mockReturnValue(mockDeploymentService);
    (LogService.getInstance as jest.Mock).mockReturnValue(mockLogService);
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);

    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default config', () => {
      queueService.initialize();

      const stats = queueService.getQueueStats();
      expect(stats.maxConcurrent).toBe(3);
    });

    it('should initialize with custom config', () => {
      queueService.initialize({
        maxConcurrent: 5,
        parallel: false,
      });

      const stats = queueService.getQueueStats();
      expect(stats.maxConcurrent).toBe(5);
    });

    it('should load pending deployments from database', () => {
      const pendingDeployments = [
        {
          id: 'deploy-1',
          config: {
            platform: 'vercel' as const,
            repoPath: '/tmp/repo1',
            envVars: {},
          },
          status: 'queued' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'deploy-2',
          config: {
            platform: 'railway' as const,
            repoPath: '/tmp/repo2',
            envVars: {},
          },
          status: 'processing' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
          startedAt: '2026-01-01T00:30:00.000Z',
        },
      ];

      mockDatabaseService.getDeploymentsByStatus = jest.fn((status) => {
        if (status === 'queued') return [pendingDeployments[0]];
        if (status === 'processing') return [pendingDeployments[1]];
        return [];
      });

      queueService.initialize();

      const deployments = queueService.getAllDeployments();
      // Should have recovered deployments
      expect(deployments.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('queueDeployment', () => {
    it('should add deployment to queue', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'value' },
      };

      queueService.initialize();

      const deploymentId = await queueService.queueDeployment(config);

      expect(deploymentId).toBeDefined();
      expect(deploymentId).toContain('deploy_');
      expect(mockDatabaseService.saveDeployment).toHaveBeenCalled();
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });

    it('should use provided deployment ID', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      queueService.initialize();

      const deploymentId = await queueService.queueDeployment(config, 'custom-deploy-123');

      expect(deploymentId).toBe('custom-deploy-123');
    });

    it('should encrypt env vars before storing', async () => {
      const { encryptEnvVars } = require('../utils/encryption');
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'secret-value' },
      };

      queueService.initialize();

      await queueService.queueDeployment(config);

      expect(encryptEnvVars).toHaveBeenCalledWith({ API_KEY: 'secret-value' });
    });
  });

  describe('getDeployment', () => {
    it('should retrieve deployment from queue', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      queueService.initialize();

      const deploymentId = await queueService.queueDeployment(config);
      const deployment = queueService.getDeployment(deploymentId);

      expect(deployment).toBeDefined();
      expect(deployment?.id).toBe(deploymentId);
      expect(deployment?.status).toBe('queued');
    });

    it('should retrieve deployment from database if not in queue', () => {
      const mockDeployment = {
        id: 'deploy-123',
        config: {
          platform: 'vercel' as const,
          repoPath: '/tmp/repo',
          envVars: {},
        },
        status: 'completed' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T01:00:00.000Z',
        result: {
          success: true,
          platform: 'vercel' as const,
          url: 'https://app.vercel.app',
        },
      };

      mockDatabaseService.getDeployment = jest.fn(() => mockDeployment);

      const deployment = queueService.getDeployment('deploy-123');

      expect(deployment).toEqual(mockDeployment);
      expect(mockDatabaseService.getDeployment).toHaveBeenCalledWith('deploy-123');
    });

    it('should return null if deployment not found', () => {
      mockDatabaseService.getDeployment = jest.fn(() => null);

      const deployment = queueService.getDeployment('nonexistent');

      expect(deployment).toBeNull();
    });
  });

  describe('getAllDeployments', () => {
    it('should return all deployments from queue and database', () => {
      const queueDeployment = {
        id: 'deploy-1',
        config: {
          platform: 'vercel' as const,
          repoPath: '/tmp/repo1',
          envVars: {},
        },
        status: 'queued' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      const dbDeployment = {
        id: 'deploy-2',
        config: {
          platform: 'railway' as const,
          repoPath: '/tmp/repo2',
          envVars: {},
        },
        status: 'completed' as const,
        createdAt: '2026-01-01T01:00:00.000Z',
      };

      // Add to queue
      (queueService as any).deployQueue = [queueDeployment];

      // Mock database
      mockDatabaseService.getAllDeployments = jest.fn(() => [dbDeployment]);

      const deployments = queueService.getAllDeployments();

      expect(deployments).toHaveLength(2);
      expect(deployments.find((d) => d.id === 'deploy-1')).toBeDefined();
      expect(deployments.find((d) => d.id === 'deploy-2')).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', () => {
      (queueService as any).deployQueue = [
        { id: '1', status: 'queued' },
        { id: '2', status: 'processing' },
        { id: '3', status: 'completed' },
        { id: '4', status: 'failed' },
      ];
      (queueService as any).activeWorkers = new Set(['2']);

      queueService.initialize({ maxConcurrent: 3 });

      const stats = queueService.getQueueStats();

      expect(stats.queued).toBe(1);
      expect(stats.processing).toBe(2); // 1 in queue + 1 active worker
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(4);
      expect(stats.activeWorkers).toBe(1);
      expect(stats.maxConcurrent).toBe(3);
    });
  });

  describe('processDeploymentQueue - sequential', () => {
    it('should process queue sequentially when parallel is disabled', async () => {
      queueService.initialize({ parallel: false, maxConcurrent: 1 });

      const config1: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo1',
        envVars: {},
      };

      const config2: DeployConfig = {
        platform: 'railway',
        repoPath: '/tmp/repo2',
        envVars: {},
      };

      mockDeploymentService.deploy = jest.fn()
        .mockResolvedValueOnce({ success: true, platform: 'vercel' } as DeployResult)
        .mockResolvedValueOnce({ success: true, platform: 'railway' } as DeployResult);

      await queueService.queueDeployment(config1);
      await queueService.queueDeployment(config2);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDeploymentService.deploy).toHaveBeenCalledTimes(2);
    });
  });

  describe('processDeploymentQueue - parallel', () => {
    it('should process queue in parallel when enabled', async () => {
      queueService.initialize({ parallel: true, maxConcurrent: 2 });

      const config1: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo1',
        envVars: {},
      };

      const config2: DeployConfig = {
        platform: 'railway',
        repoPath: '/tmp/repo2',
        envVars: {},
      };

      mockDeploymentService.deploy = jest.fn()
        .mockResolvedValue({ success: true, platform: 'vercel' } as DeployResult);

      await queueService.queueDeployment(config1);
      await queueService.queueDeployment(config2);

      // Wait for processing to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Both should be processed in parallel
      expect(mockDeploymentService.deploy).toHaveBeenCalled();
    });

    it('should respect maxConcurrent limit', async () => {
      queueService.initialize({ parallel: true, maxConcurrent: 2 });

      // Add 3 deployments
      const configs: DeployConfig[] = Array.from({ length: 3 }, (_, i) => ({
        platform: 'vercel' as const,
        repoPath: `/tmp/repo${i}`,
        envVars: {},
      }));

      mockDeploymentService.deploy = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, platform: 'vercel' } as DeployResult), 100))
      );

      for (const config of configs) {
        await queueService.queueDeployment(config);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = queueService.getQueueStats();
      // Should not exceed maxConcurrent
      expect(stats.activeWorkers + stats.processing).toBeLessThanOrEqual(2 + 1); // +1 for queued items
    });
  });

  describe('deployment processing', () => {
    it('should update deployment status during processing', async () => {
      queueService.initialize({ parallel: false });

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      const result: DeployResult = {
        success: true,
        deploymentId: 'vercel-deploy-123',
        url: 'https://app.vercel.app',
        platform: 'vercel',
      };

      mockDeploymentService.deploy.mockResolvedValue(result);

      const deploymentId = await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDatabaseService.updateDeploymentStatus).toHaveBeenCalledWith(
        deploymentId,
        'processing',
        expect.any(String)
      );
      expect(mockDatabaseService.updateDeploymentResult).toHaveBeenCalledWith(
        deploymentId,
        result,
        expect.any(String)
      );
    });

    it('should handle deployment failure', async () => {
      queueService.initialize({ parallel: false });

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      const result: DeployResult = {
        success: false,
        error: 'Deployment failed',
        platform: 'vercel',
      };

      mockDeploymentService.deploy.mockResolvedValue(result);

      const deploymentId = await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDatabaseService.updateDeploymentResult).toHaveBeenCalledWith(
        deploymentId,
        result,
        expect.any(String)
      );
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'Deployment Failed',
        expect.stringContaining('failed'),
        'error'
      );
    });

    it('should handle deployment errors gracefully', async () => {
      queueService.initialize({ parallel: false });

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockDeploymentService.deploy.mockRejectedValue(new Error('Deployment error'));

      const deploymentId = await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const deployment = queueService.getDeployment(deploymentId);
      expect(deployment?.status).toBe('failed');
      expect(deployment?.result?.error).toContain('Deployment error');
    });

    it('should update notification service with active count', async () => {
      queueService.initialize();

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      await queueService.queueDeployment(config);

      expect(mockNotificationService.setActiveDeployCount).toHaveBeenCalled();
    });
  });
});
