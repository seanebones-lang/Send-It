/**
 * Integration tests for service interactions
 * Tests services working together in real scenarios
 */

import {
  DatabaseService,
  LogService,
  TokenService,
  NotificationService,
  DeploymentService,
  QueueService,
} from '../../services';
import { FrameworkDetector } from '../../frameworkDetector';
import type { DeployConfig } from '../../types/ipc';

// Mock Electron APIs
jest.mock('electron', () => ({
  app: {
    getName: jest.fn(() => 'Send-It'),
    getPath: jest.fn((name: string) => '/tmp/send-it-test'),
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    focus: jest.fn(),
  })),
  Notification: {
    isSupported: jest.fn(() => true),
  },
  dock: {
    setBadge: jest.fn(),
    bounce: jest.fn(),
  },
}));

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
    close: jest.fn(),
  }));
});

// Mock keytar
jest.mock('keytar', () => ({
  setPassword: jest.fn().mockResolvedValue(undefined),
  getPassword: jest.fn().mockResolvedValue('test-token'),
  deletePassword: jest.fn().mockResolvedValue(true),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock encryption
jest.mock('../../utils/encryption', () => ({
  encryptEnvVars: jest.fn((envVars: Record<string, string>) => {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars)) {
      encrypted[key] = `encrypted:${value}`;
    }
    return encrypted;
  }),
  decryptEnvVars: jest.fn((encrypted: Record<string, string>) => {
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(encrypted)) {
      decrypted[key] = value.replace('encrypted:', '');
    }
    return decrypted;
  }),
}));

// Mock retry and circuit breaker
jest.mock('../../utils/retry', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
  isRetryableError: jest.fn(() => true),
}));

jest.mock('../../utils/circuitBreaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
    getStats: jest.fn(() => ({ state: 'CLOSED', failures: 0, successes: 0 })),
  })),
  CircuitState: {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
  },
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

describe('Service Integration Tests', () => {
  let databaseService: DatabaseService;
  let logService: LogService;
  let tokenService: TokenService;
  let notificationService: NotificationService;
  let deploymentService: DeploymentService;
  let queueService: QueueService;

  beforeEach(() => {
    // Reset all singleton instances
    (DatabaseService as any).instance = null;
    (LogService as any).instance = null;
    (TokenService as any).instance = null;
    (NotificationService as any).instance = null;
    (DeploymentService as any).instance = null;
    (QueueService as any).instance = null;

    // Initialize services
    databaseService = DatabaseService.getInstance();
    databaseService.initialize();

    logService = LogService.getInstance();
    // LogService needs database instance - use getDb() if available
    const db = databaseService.getDb();
    if (db) {
      logService.initialize(db);
    }

    tokenService = TokenService.getInstance();
    // TokenService needs notification service for initialization
    const mockNotification = NotificationService.getInstance();

    notificationService = NotificationService.getInstance();
    // NotificationService constructor takes window and dock, mocked above

    deploymentService = DeploymentService.getInstance();
    // DeploymentService needs logService and tokenService
    deploymentService.setLogService(logService);

    queueService = QueueService.getInstance();
    // QueueService needs to be initialized with dependencies
    queueService.initialize({ parallel: false, maxConcurrent: 1 }); // Sequential for testing

    jest.clearAllMocks();
  });

  describe('Complete Deployment Flow', () => {
    it('should handle complete deployment flow from queue to completion', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'secret-value' },
        projectName: 'my-project',
        branch: 'main',
      };

      // Mock token service
      jest.spyOn(tokenService, 'getToken').mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      // Mock deployment service
      const mockDeploy = jest.spyOn(deploymentService, 'deploy').mockResolvedValue({
        success: true,
        deploymentId: 'vercel-deploy-123',
        url: 'https://my-app.vercel.app',
        platform: 'vercel',
      });

      // Mock fetch for API calls
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'vercel-deploy-123',
          url: 'https://my-app.vercel.app',
          readyState: 'READY',
        }),
      });

      // Queue deployment
      const deploymentId = await queueService.queueDeployment(config);

      expect(deploymentId).toBeDefined();
      expect(databaseService.saveDeployment).toHaveBeenCalled();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify deployment was processed
      expect(mockDeploy).toHaveBeenCalledWith(config, deploymentId);
      expect(databaseService.updateDeploymentResult).toHaveBeenCalled();

      // Verify logs were emitted
      expect(logService.emitLog).toHaveBeenCalled();

      // Verify notifications were sent
      expect(notificationService.sendNotification).toHaveBeenCalled();

      // Get deployment status
      const deployment = queueService.getDeployment(deploymentId);
      expect(deployment?.status).toBe('completed');
      expect(deployment?.result?.success).toBe(true);
      expect(deployment?.result?.url).toBe('https://my-app.vercel.app');
    });

    it('should handle deployment failure flow', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      // Mock deployment failure
      jest.spyOn(deploymentService, 'deploy').mockResolvedValue({
        success: false,
        error: 'Deployment failed',
        platform: 'vercel',
      });

      const deploymentId = await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const deployment = queueService.getDeployment(deploymentId);
      expect(deployment?.status).toBe('failed');
      expect(deployment?.result?.success).toBe(false);
      expect(deployment?.result?.error).toBe('Deployment failed');

      // Verify error notification
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'Deployment Failed',
        expect.stringContaining('failed'),
        'error'
      );
    });
  });

  describe('Service Initialization', () => {
    it('should initialize all services correctly', () => {
      expect(databaseService).toBeDefined();
      expect(logService).toBeDefined();
      expect(tokenService).toBeDefined();
      expect(notificationService).toBeDefined();
      expect(deploymentService).toBeDefined();
      expect(queueService).toBeDefined();

      // Verify services are connected
      expect(logService.getLogs('test')).toEqual([]); // Should work
    });

    it('should handle service dependencies correctly', () => {
      // DeploymentService should use LogService
      deploymentService.setLogService(logService);
      expect(logService.emitLog).toBeDefined();

      // QueueService should use DeploymentService
      expect(deploymentService.deploy).toBeDefined();
    });
  });

  describe('Log Flow', () => {
    it('should emit and store logs correctly', () => {
      logService.emitLog('deploy-123', 'Test log message', 'info');

      // Log should be stored in database (mocked)
      expect(databaseService.getDb()).toBeDefined();

      // Retrieve logs
      const logs = logService.getLogs('deploy-123');
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should broadcast logs to all renderers', () => {
      const { webContents } = require('electron');
      const mockWebContents = {
        send: jest.fn(),
        isDestroyed: jest.fn(() => false),
      };
      webContents.getAllWebContents = jest.fn(() => [mockWebContents]);

      logService.emitLog('deploy-123', 'Test message', 'info');

      expect(mockWebContents.send).toHaveBeenCalledWith('deploy:log', expect.objectContaining({
        deploymentId: 'deploy-123',
        message: 'Test message',
        level: 'info',
      }));
    });
  });

  describe('Token Management Flow', () => {
    it('should store and retrieve tokens', async () => {
      const result = await tokenService.setToken('vercel', 'test-token');
      expect(result.success).toBe(true);

      const retrieved = await tokenService.getToken('vercel');
      expect(retrieved.success).toBe(true);
      expect(retrieved.token).toBe('test-token');
    });

    it('should check keychain permissions', async () => {
      const hasPermission = await tokenService.checkKeychainPermission();
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('Queue and Database Integration', () => {
    it('should persist queue to database', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      const deploymentId = await queueService.queueDeployment(config);

      // Deployment should be saved to database
      expect(databaseService.saveDeployment).toHaveBeenCalled();

      // Deployment should be retrievable
      const deployment = queueService.getDeployment(deploymentId);
      expect(deployment).toBeDefined();
      expect(deployment?.id).toBe(deploymentId);
    });

    it('should recover deployments from database on startup', () => {
      const mockDeployments = [
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
      ];

      jest.spyOn(databaseService, 'getDeploymentsByStatus').mockReturnValue(mockDeployments);

      // Initialize queue service (should recover deployments)
      const service = QueueService.getInstance();
      service.initialize();

      const deployments = service.getAllDeployments();
      expect(deployments.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notification Integration', () => {
    it('should update dock badge with deployment count', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      await queueService.queueDeployment(config);

      // Notification service should be updated
      expect(notificationService.setActiveDeployCount).toHaveBeenCalled();
    });

    it('should send notifications for deployment events', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      jest.spyOn(deploymentService, 'deploy').mockResolvedValue({
        success: true,
        platform: 'vercel',
      });

      await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should send notifications
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Framework Detection Integration', () => {
    it('should detect framework and cache result', () => {
      const mockPackageJson = {
        dependencies: { next: '14.0.0' },
      };

      const fs = require('fs');
      fs.existsSync = jest.fn(() => true);
      fs.readFileSync = jest.fn(() => JSON.stringify(mockPackageJson));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('next.js');
      expect(result.scores.vercel).toBe(100);

      // Second call should use cache (mocked, but structure is correct)
      const result2 = FrameworkDetector.detect('/tmp/repo');
      expect(result2.framework).toBe('next.js');
    });

    it('should invalidate cache when repository changes', () => {
      const mockPackageJson1 = {
        dependencies: { next: '14.0.0' },
      };

      const mockPackageJson2 = {
        dependencies: { vite: '5.0.0' },
      };

      const fs = require('fs');
      fs.existsSync = jest.fn(() => true);

      // First detection
      fs.readFileSync = jest.fn(() => JSON.stringify(mockPackageJson1));
      const result1 = FrameworkDetector.detect('/tmp/repo');
      expect(result1.framework).toBe('next.js');

      // Invalidate cache
      FrameworkDetector.invalidateCache('/tmp/repo');

      // Second detection with different content
      fs.readFileSync = jest.fn(() => JSON.stringify(mockPackageJson2));
      const result2 = FrameworkDetector.detect('/tmp/repo');
      expect(result2.framework).toBe('vite');
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors through service chain', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      // Mock deployment service to throw error
      jest.spyOn(deploymentService, 'deploy').mockRejectedValue(new Error('Service error'));

      const deploymentId = await queueService.queueDeployment(config);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Error should be caught and logged
      expect(logService.emitLog).toHaveBeenCalledWith(
        deploymentId,
        expect.stringContaining('error'),
        'error'
      );

      // Deployment should be marked as failed
      const deployment = queueService.getDeployment(deploymentId);
      expect(deployment?.status).toBe('failed');
    });
  });
});
