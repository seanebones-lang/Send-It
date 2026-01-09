/**
 * Unit tests for DatabaseService
 * Tests database operations, encryption, and persistence
 */

import { DatabaseService } from './DatabaseService';
import Database from 'better-sqlite3';
import type { DeployConfig, DeployResult } from '../types/ipc';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    exec: jest.fn(),
    prepare: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock encryption
jest.mock('../utils/encryption', () => ({
  encryptEnvVars: jest.fn((envVars: Record<string, string>) => {
    // Simple mock encryption (adds "encrypted:" prefix)
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars)) {
      encrypted[key] = `encrypted:${value}`;
    }
    return encrypted;
  }),
  decryptEnvVars: jest.fn((encrypted: Record<string, string>) => {
    // Simple mock decryption (removes "encrypted:" prefix)
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(encrypted)) {
      decrypted[key] = value.replace('encrypted:', '');
    }
    return decrypted;
  }),
}));

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return '/tmp/send-it-test';
      return '/tmp';
    }),
  },
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockDb: jest.Mocked<Database>;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  beforeEach(() => {
    // Reset singleton instance
    (DatabaseService as any).instance = null;
    databaseService = DatabaseService.getInstance();

    // Setup mocks
    mockStatement = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    };

    mockPrepare = jest.fn(() => mockStatement);
    mockDb = new Database(':memory:') as jest.Mocked<Database>;
    mockDb.prepare = mockPrepare;
    mockDb.exec = jest.fn();

    // Mock the database instance in service
    (databaseService as any).deployDb = mockDb;

    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create tables and indexes on initialization', () => {
      databaseService.initialize();

      expect(mockDb.exec).toHaveBeenCalled();
      const execCall = (mockDb.exec as jest.Mock).mock.calls[0][0];
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS deployments');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS deployment_logs');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS');
    });
  });

  describe('saveDeployment', () => {
    it('should save deployment with encrypted env vars', () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'secret-value' },
        projectName: 'my-project',
        branch: 'main',
      };

      databaseService.saveDeployment('deploy-123', config, 'queued');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO deployments')
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'deploy-123',
        'vercel',
        '/tmp/repo',
        expect.stringContaining('encrypted:'),
        'my-project',
        'main',
        'queued'
      );
    });

    it('should handle optional fields', () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      databaseService.saveDeployment('deploy-123', config, 'queued');

      expect(mockStatement.run).toHaveBeenCalledWith(
        'deploy-123',
        'vercel',
        '/tmp/repo',
        expect.any(String),
        null,
        null,
        'queued'
      );
    });

    it('should throw error if database not initialized', () => {
      (databaseService as any).deployDb = null;

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      expect(() => {
        databaseService.saveDeployment('deploy-123', config, 'queued');
      }).toThrow('Database not initialized');
    });
  });

  describe('updateDeploymentStatus', () => {
    it('should update deployment status', () => {
      databaseService.updateDeploymentStatus('deploy-123', 'processing');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE deployments SET status')
      );
      expect(mockStatement.run).toHaveBeenCalledWith('processing', 'deploy-123');
    });

    it('should update status with start time', () => {
      const startedAt = '2026-01-01T00:00:00.000Z';
      databaseService.updateDeploymentStatus('deploy-123', 'processing', startedAt);

      expect(mockStatement.run).toHaveBeenCalledWith('processing', startedAt, 'deploy-123');
    });

    it('should handle missing database gracefully', () => {
      (databaseService as any).deployDb = null;

      // Should not throw
      expect(() => {
        databaseService.updateDeploymentStatus('deploy-123', 'processing');
      }).not.toThrow();
    });
  });

  describe('updateDeploymentResult', () => {
    it('should update deployment result on success', () => {
      const result: DeployResult = {
        success: true,
        deploymentId: 'vercel-deploy-123',
        url: 'https://my-app.vercel.app',
        platform: 'vercel',
      };

      databaseService.updateDeploymentResult('deploy-123', result, '2026-01-01T01:00:00.000Z');

      expect(mockStatement.run).toHaveBeenCalledWith(
        'completed',
        'vercel-deploy-123',
        'https://my-app.vercel.app',
        null,
        '2026-01-01T01:00:00.000Z',
        'deploy-123'
      );
    });

    it('should update deployment result on failure', () => {
      const result: DeployResult = {
        success: false,
        error: 'Deployment failed',
        platform: 'vercel',
      };

      databaseService.updateDeploymentResult('deploy-123', result, '2026-01-01T01:00:00.000Z');

      expect(mockStatement.run).toHaveBeenCalledWith(
        'failed',
        null,
        null,
        'Deployment failed',
        '2026-01-01T01:00:00.000Z',
        'deploy-123'
      );
    });

    it('should handle missing database gracefully', () => {
      (databaseService as any).deployDb = null;

      const result: DeployResult = {
        success: true,
        platform: 'vercel',
      };

      // Should not throw
      expect(() => {
        databaseService.updateDeploymentResult('deploy-123', result, '2026-01-01T01:00:00.000Z');
      }).not.toThrow();
    });
  });

  describe('getDeployment', () => {
    it('should retrieve deployment with decrypted env vars', () => {
      const mockRow = {
        id: 'deploy-123',
        platform: 'vercel',
        repo_path: '/tmp/repo',
        env_vars: JSON.stringify({ API_KEY: 'encrypted:secret-value' }),
        project_name: 'my-project',
        branch: 'main',
        status: 'completed',
        deployment_id: 'vercel-deploy-123',
        url: 'https://my-app.vercel.app',
        error: null,
        created_at: '2026-01-01T00:00:00.000Z',
        started_at: '2026-01-01T00:30:00.000Z',
        completed_at: '2026-01-01T01:00:00.000Z',
      };

      mockStatement.get = jest.fn(() => mockRow);

      const deployment = databaseService.getDeployment('deploy-123');

      expect(deployment).toBeDefined();
      expect(deployment?.id).toBe('deploy-123');
      expect(deployment?.status).toBe('completed');
      expect(deployment?.config.envVars.API_KEY).toBe('secret-value'); // Should be decrypted
      expect(deployment?.result?.success).toBe(true);
      expect(deployment?.result?.url).toBe('https://my-app.vercel.app');
    });

    it('should return null if deployment not found', () => {
      mockStatement.get = jest.fn(() => undefined);

      const deployment = databaseService.getDeployment('nonexistent');

      expect(deployment).toBeNull();
    });

    it('should handle decryption errors gracefully', () => {
      const mockRow = {
        id: 'deploy-123',
        platform: 'vercel',
        repo_path: '/tmp/repo',
        env_vars: 'invalid-json',
        project_name: null,
        branch: null,
        status: 'queued',
        deployment_id: null,
        url: null,
        error: null,
        created_at: '2026-01-01T00:00:00.000Z',
        started_at: null,
        completed_at: null,
      };

      mockStatement.get = jest.fn(() => mockRow);

      // Should not throw, but handle error
      const deployment = databaseService.getDeployment('deploy-123');
      expect(deployment).toBeDefined();
    });

    it('should return null if database not initialized', () => {
      (databaseService as any).deployDb = null;

      const deployment = databaseService.getDeployment('deploy-123');
      expect(deployment).toBeNull();
    });
  });

  describe('getAllDeployments', () => {
    it('should retrieve all deployments with pagination', () => {
      const mockRows = [
        {
          id: 'deploy-1',
          platform: 'vercel',
          repo_path: '/tmp/repo1',
          env_vars: JSON.stringify({ KEY: 'encrypted:value1' }),
          project_name: 'project1',
          branch: 'main',
          status: 'completed',
          deployment_id: 'vercel-1',
          url: 'https://app1.vercel.app',
          error: null,
          created_at: '2026-01-01T00:00:00.000Z',
          started_at: '2026-01-01T00:30:00.000Z',
          completed_at: '2026-01-01T01:00:00.000Z',
        },
        {
          id: 'deploy-2',
          platform: 'railway',
          repo_path: '/tmp/repo2',
          env_vars: JSON.stringify({ KEY: 'encrypted:value2' }),
          project_name: 'project2',
          branch: 'dev',
          status: 'failed',
          deployment_id: null,
          url: null,
          error: 'Deployment failed',
          created_at: '2026-01-01T02:00:00.000Z',
          started_at: '2026-01-01T02:30:00.000Z',
          completed_at: '2026-01-01T03:00:00.000Z',
        },
      ];

      mockStatement.all = jest.fn(() => mockRows);

      const deployments = databaseService.getAllDeployments(100, 0);

      expect(deployments).toHaveLength(2);
      expect(deployments[0].id).toBe('deploy-1');
      expect(deployments[0].status).toBe('completed');
      expect(deployments[1].status).toBe('failed');
      expect(deployments[1].result?.error).toBe('Deployment failed');
      expect(mockStatement.all).toHaveBeenCalledWith(100, 0);
    });

    it('should decrypt env vars for all deployments', () => {
      const mockRows = [
        {
          id: 'deploy-1',
          platform: 'vercel',
          repo_path: '/tmp/repo1',
          env_vars: JSON.stringify({ API_KEY: 'encrypted:secret' }),
          project_name: null,
          branch: null,
          status: 'queued',
          deployment_id: null,
          url: null,
          error: null,
          created_at: '2026-01-01T00:00:00.000Z',
          started_at: null,
          completed_at: null,
        },
      ];

      mockStatement.all = jest.fn(() => mockRows);

      const deployments = databaseService.getAllDeployments();
      expect(deployments[0].config.envVars.API_KEY).toBe('secret'); // Decrypted
    });

    it('should return empty array if database not initialized', () => {
      (databaseService as any).deployDb = null;

      const deployments = databaseService.getAllDeployments();
      expect(deployments).toEqual([]);
    });
  });

  describe('getDeploymentsByStatus', () => {
    it('should filter deployments by status', () => {
      const mockRows = [
        {
          id: 'deploy-1',
          platform: 'vercel',
          repo_path: '/tmp/repo1',
          env_vars: JSON.stringify({}),
          project_name: null,
          branch: null,
          status: 'queued',
          deployment_id: null,
          url: null,
          error: null,
          created_at: '2026-01-01T00:00:00.000Z',
          started_at: null,
          completed_at: null,
        },
      ];

      mockStatement.all = jest.fn(() => mockRows);

      const deployments = databaseService.getDeploymentsByStatus('queued');

      expect(deployments).toHaveLength(1);
      expect(deployments[0].status).toBe('queued');
      expect(mockStatement.all).toHaveBeenCalledWith('queued');
    });

    it('should return empty array if no deployments found', () => {
      mockStatement.all = jest.fn(() => []);

      const deployments = databaseService.getDeploymentsByStatus('completed');
      expect(deployments).toEqual([]);
    });

    it('should return empty array if database not initialized', () => {
      (databaseService as any).deployDb = null;

      const deployments = databaseService.getDeploymentsByStatus('queued');
      expect(deployments).toEqual([]);
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      databaseService.close();

      expect(mockDb.close).toHaveBeenCalled();
      expect((databaseService as any).deployDb).toBeNull();
    });

    it('should handle close when database not initialized', () => {
      (databaseService as any).deployDb = null;

      // Should not throw
      expect(() => {
        databaseService.close();
      }).not.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
