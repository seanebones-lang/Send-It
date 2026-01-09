/**
 * Unit tests for DeploymentService
 * Tests deployment logic with API mocking and retry/circuit breaker integration
 */

import { DeploymentService } from './DeploymentService';
import { TokenService } from './TokenService';
import { LogService } from './LogService';
import { CircuitBreaker } from '../utils/circuitBreaker';
import type { DeployConfig } from '../types/ipc';

// Mock fetch globally
global.fetch = jest.fn();

// Mock TokenService
jest.mock('./TokenService', () => ({
  TokenService: {
    getInstance: jest.fn(() => ({
      getToken: jest.fn(),
    })),
  },
}));

// Mock LogService
jest.mock('./LogService', () => ({
  LogService: {
    getInstance: jest.fn(() => ({
      emitLog: jest.fn(),
    })),
  },
}));

// Mock circuit breaker
jest.mock('../utils/circuitBreaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
    getStats: jest.fn(() => ({
      state: 'CLOSED',
      failures: 0,
      successes: 0,
    })),
  })),
  CircuitState: {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
  },
}));

// Mock retry utilities
jest.mock('../utils/retry', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
  isRetryableError: jest.fn(() => true),
}));

// Mock encryption
jest.mock('../utils/encryption', () => ({
  decryptEnvVars: jest.fn((envVars: Record<string, string>) => {
    // Mock decryption (remove "encrypted:" prefix)
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars)) {
      decrypted[key] = value.replace('encrypted:', '');
    }
    return decrypted;
  }),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

import * as fs from 'fs';

describe('DeploymentService', () => {
  let deploymentService: DeploymentService;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    // Reset singleton instance
    (DeploymentService as any).instance = null;
    deploymentService = DeploymentService.getInstance();

    mockTokenService = {
      getToken: jest.fn(),
    } as any;

    mockLogService = {
      emitLog: jest.fn(),
    } as any;

    deploymentService.setLogService(mockLogService);

    // Mock TokenService.getInstance to return our mock
    (TokenService.getInstance as jest.Mock).mockReturnValue(mockTokenService);

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('deploy - Vercel', () => {
    it('should deploy to Vercel successfully', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'encrypted:secret-value' },
        projectName: 'my-project',
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      // Mock deployment creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'vercel-deploy-123',
          url: 'https://my-app.vercel.app',
        }),
      });

      // Mock status polling (ready immediately)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          readyState: 'READY',
        }),
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('vercel-deploy-123');
      expect(result.url).toBe('https://my-app.vercel.app');
      expect(result.platform).toBe('vercel');
      expect(mockLogService.emitLog).toHaveBeenCalled();
    });

    it('should handle Vercel token not found', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: false,
        error: 'Token not found',
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token not found');
      expect(mockLogService.emitLog).toHaveBeenCalledWith('deploy-123', expect.stringContaining('Token not found'), 'error');
    });

    it('should handle repository path not existing', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/nonexistent',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Repository path does not exist');
    });

    it('should handle Vercel API errors', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Invalid request',
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Vercel API error');
      expect(mockLogService.emitLog).toHaveBeenCalledWith('deploy-123', expect.stringContaining('Vercel API error'), 'error');
    });

    it('should handle deployment timeout', async () => {
      jest.useFakeTimers();

      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      // Mock deployment creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'vercel-deploy-123',
          url: 'https://my-app.vercel.app',
        }),
      });

      // Mock status polling (always building)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          readyState: 'building',
        }),
      });

      const deployPromise = deploymentService.deploy(config, 'deploy-123');

      // Advance time past timeout (60 attempts * 5 seconds = 300 seconds)
      jest.advanceTimersByTime(301000);

      const result = await deployPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      jest.useRealTimers();
    });
  });

  describe('deploy - Railway', () => {
    it('should deploy to Railway successfully', async () => {
      const config: DeployConfig = {
        platform: 'railway',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'encrypted:secret-value' },
        projectName: 'my-project',
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'railway-token',
      });

      // Mock projects fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [],
        }),
      });

      // Mock project creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'railway-project-123',
        }),
      });

      // Mock deployment creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'railway-deploy-123',
        }),
      });

      // Mock status polling
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'SUCCESS',
        }),
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('railway-deploy-123');
      expect(result.platform).toBe('railway');
    });

    it('should use existing Railway project if found', async () => {
      const config: DeployConfig = {
        platform: 'railway',
        repoPath: '/tmp/repo',
        envVars: {},
        projectName: 'existing-project',
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'railway-token',
      });

      // Mock projects fetch (project exists)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [{ id: 'railway-project-123', name: 'existing-project' }],
        }),
      });

      // Mock deployment creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'railway-deploy-123',
        }),
      });

      // Mock status polling
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'SUCCESS',
        }),
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(true);
      // Should not create new project
      expect(global.fetch).toHaveBeenCalledTimes(3); // Projects fetch, deploy, status
    });
  });

  describe('deploy - Render', () => {
    it('should deploy to Render successfully', async () => {
      const config: DeployConfig = {
        platform: 'render',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'encrypted:secret-value' },
        projectName: 'my-project',
        branch: 'main',
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'render-token',
      });

      // Mock service creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          service: {
            id: 'render-service-123',
            serviceDetails: {
              healthCheckPath: '/health',
              url: 'https://my-app.onrender.com',
            },
          },
        }),
      });

      // Mock status polling (live immediately)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          service: {
            serviceDetails: {
              healthCheckPath: '/health',
            },
          },
        }),
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('render-service-123');
      expect(result.url).toBe('https://my-app.onrender.com');
      expect(result.platform).toBe('render');
    });

    it('should handle Render service creation failure', async () => {
      const config: DeployConfig = {
        platform: 'render',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'render-token',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          service: {}, // No id
        }),
      });

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create Render service');
    });
  });

  describe('deploy - error handling', () => {
    it('should handle unknown platform', async () => {
      const config: DeployConfig = {
        platform: 'invalid' as any,
        repoPath: '/tmp/repo',
        envVars: {},
      };

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown platform');
    });

    it('should handle deployment errors gracefully', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await deploymentService.deploy(config, 'deploy-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(mockLogService.emitLog).toHaveBeenCalledWith(
        'deploy-123',
        expect.stringContaining('Deployment error'),
        'error'
      );
    });
  });

  describe('getCircuitBreakerStats', () => {
    it('should return circuit breaker statistics', () => {
      const stats = deploymentService.getCircuitBreakerStats('vercel');

      expect(stats).toBeDefined();
      expect(stats.state).toBe('CLOSED');
    });
  });

  describe('circuit breaker integration', () => {
    it('should use circuit breaker for API calls', async () => {
      const config: DeployConfig = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: {},
      };

      const mockExecute = jest.fn((fn) => fn());
      (CircuitBreaker as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        getStats: jest.fn(),
      }));

      // Reset singleton to use new circuit breaker
      (DeploymentService as any).instance = null;
      const service = DeploymentService.getInstance();
      service.setLogService(mockLogService);

      mockTokenService.getToken.mockResolvedValue({
        success: true,
        token: 'vercel-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'deploy-123',
          url: 'https://app.vercel.app',
          readyState: 'READY',
        }),
      });

      await service.deploy(config, 'deploy-123');

      // Circuit breaker should have been used
      expect(mockExecute).toHaveBeenCalled();
    });
  });
});
