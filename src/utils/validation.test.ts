/**
 * Unit tests for validation utilities
 * Tests input validation and sanitization functions
 */

import * as path from 'path';
import {
  validateAndSanitizePath,
  validateRepoUrl,
  validateDeployPlatform,
  validateEnvVarKey,
  validateProjectName,
  validateBranchName,
  validateDeploymentId,
  validateEnvVars,
  validateDeployConfig,
} from './validation';

describe('Validation Utilities', () => {
  describe('validateAndSanitizePath', () => {
    it('should validate and sanitize valid path', () => {
      const allowedBase = '/tmp/allowed';
      const filePath = '/tmp/allowed/repo';
      
      const result = validateAndSanitizePath(filePath, allowedBase);
      expect(result).toBe(path.resolve(filePath));
    });

    it('should throw error for path outside allowed directory', () => {
      const allowedBase = '/tmp/allowed';
      const filePath = '/tmp/other/repo';
      
      expect(() => {
        validateAndSanitizePath(filePath, allowedBase);
      }).toThrow('Path traversal detected');
    });

    it('should throw error for path traversal attempt', () => {
      const allowedBase = '/tmp/allowed';
      const filePath = '/tmp/allowed/../../etc/passwd';
      
      expect(() => {
        validateAndSanitizePath(filePath, allowedBase);
      }).toThrow('Path traversal detected');
    });

    it('should throw error for invalid path type', () => {
      expect(() => {
        validateAndSanitizePath(null as any, '/tmp/allowed');
      }).toThrow('Invalid path');
    });
  });

  describe('validateRepoUrl', () => {
    it('should validate valid GitHub URL', () => {
      const url = 'https://github.com/user/repo.git';
      expect(validateRepoUrl(url)).toBe(url);
    });

    it('should validate valid GitLab URL', () => {
      const url = 'https://gitlab.com/user/repo.git';
      expect(validateRepoUrl(url)).toBe(url);
    });

    it('should validate valid Bitbucket URL', () => {
      const url = 'https://bitbucket.org/user/repo.git';
      expect(validateRepoUrl(url)).toBe(url);
    });

    it('should validate SSH URL', () => {
      const url = 'git@github.com:user/repo.git';
      expect(validateRepoUrl(url)).toBe(url);
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        validateRepoUrl('not-a-url');
      }).toThrow('Invalid URL format');
    });

    it('should throw error for unsupported protocol', () => {
      expect(() => {
        validateRepoUrl('ftp://example.com/repo.git');
      }).toThrow('Invalid URL protocol');
    });

    it('should throw error for path traversal in URL', () => {
      expect(() => {
        validateRepoUrl('https://github.com/user/../other/repo.git');
      }).toThrow('dangerous path traversal');
    });
  });

  describe('validateDeployPlatform', () => {
    it('should validate vercel platform', () => {
      expect(validateDeployPlatform('vercel')).toBe('vercel');
    });

    it('should validate railway platform', () => {
      expect(validateDeployPlatform('railway')).toBe('railway');
    });

    it('should validate render platform', () => {
      expect(validateDeployPlatform('render')).toBe('render');
    });

    it('should throw error for invalid platform', () => {
      expect(() => {
        validateDeployPlatform('invalid' as any);
      }).toThrow('Invalid deployment platform');
    });
  });

  describe('validateEnvVarKey', () => {
    it('should validate valid environment variable key', () => {
      expect(validateEnvVarKey('API_KEY')).toBe('API_KEY');
      expect(validateEnvVarKey('DATABASE_URL')).toBe('DATABASE_URL');
      expect(validateEnvVarKey('MY_VAR_123')).toBe('MY_VAR_123');
    });

    it('should convert to uppercase', () => {
      expect(validateEnvVarKey('api_key')).toBe('API_KEY');
      expect(validateEnvVarKey('myVar')).toBe('MYVAR');
    });

    it('should throw error for invalid key format', () => {
      expect(() => {
        validateEnvVarKey('123invalid');
      }).toThrow('must start with a letter or underscore');

      expect(() => {
        validateEnvVarKey('invalid-key');
      }).toThrow('uppercase letters, numbers, and underscores');

      expect(() => {
        validateEnvVarKey('invalid.key');
      }).toThrow('uppercase letters, numbers, and underscores');
    });

    it('should throw error for empty key', () => {
      expect(() => {
        validateEnvVarKey('');
      }).toThrow('Environment variable key is required');
    });

    it('should throw error for key too long', () => {
      expect(() => {
        validateEnvVarKey('A'.repeat(256));
      }).toThrow('255 characters or less');
    });
  });

  describe('validateProjectName', () => {
    it('should validate valid project name', () => {
      expect(validateProjectName('my-project')).toBe('my-project');
      expect(validateProjectName('my_project')).toBe('my_project');
      expect(validateProjectName('myProject123')).toBe('myProject123');
    });

    it('should throw error for invalid project name', () => {
      expect(() => {
        validateProjectName('_invalid');
      }).toThrow('must start with a letter or number');

      expect(() => {
        validateProjectName('invalid name');
      }).toThrow('letters, numbers, hyphens, and underscores');

      expect(() => {
        validateProjectName('');
      }).toThrow('Project name is required');
    });

    it('should throw error for name too long', () => {
      expect(() => {
        validateProjectName('a'.repeat(101));
      }).toThrow('100 characters or less');
    });
  });

  describe('validateBranchName', () => {
    it('should validate valid branch name', () => {
      expect(validateBranchName('main')).toBe('main');
      expect(validateBranchName('feature/my-feature')).toBe('feature/my-feature');
      expect(validateBranchName('release-v1.0.0')).toBe('release-v1.0.0');
    });

    it('should throw error for invalid branch name', () => {
      expect(() => {
        validateBranchName('.invalid');
      }).toThrow('cannot start or end with a dot');

      expect(() => {
        validateBranchName('invalid..name');
      }).toThrow('cannot contain consecutive dots');

      expect(() => {
        validateBranchName('');
      }).toThrow('Branch name is required');
    });
  });

  describe('validateDeploymentId', () => {
    it('should validate valid deployment ID', () => {
      expect(validateDeploymentId('deploy_123')).toBe('deploy_123');
      expect(validateDeploymentId('deploy-123')).toBe('deploy-123');
      expect(validateDeploymentId('abc123')).toBe('abc123');
    });

    it('should throw error for invalid deployment ID', () => {
      expect(() => {
        validateDeploymentId('invalid id');
      }).toThrow('letters, numbers, underscores, and hyphens');

      expect(() => {
        validateDeploymentId('');
      }).toThrow('Deployment ID is required');
    });
  });

  describe('validateEnvVars', () => {
    it('should validate valid environment variables', () => {
      const envVars = {
        API_KEY: 'value1',
        DATABASE_URL: 'value2',
      };

      const result = validateEnvVars(envVars);
      expect(result).toEqual({
        API_KEY: 'value1',
        DATABASE_URL: 'value2',
      });
    });

    it('should normalize keys to uppercase', () => {
      const envVars = {
        api_key: 'value1',
        database_url: 'value2',
      };

      const result = validateEnvVars(envVars);
      expect(Object.keys(result)).toEqual(['API_KEY', 'DATABASE_URL']);
    });

    it('should throw error for invalid input type', () => {
      expect(() => {
        validateEnvVars(null as any);
      }).toThrow('must be an object');

      expect(() => {
        validateEnvVars([] as any);
      }).toThrow('must be an object');
    });

    it('should throw error for invalid key', () => {
      expect(() => {
        validateEnvVars({ '123invalid': 'value' });
      }).toThrow();
    });
  });

  describe('validateDeployConfig', () => {
    it('should validate valid deployment config', () => {
      const config = {
        platform: 'vercel',
        repoPath: '/tmp/repo',
        envVars: { API_KEY: 'value' },
        projectName: 'my-project',
        branch: 'main',
      };

      const result = validateDeployConfig(config);
      expect(result.platform).toBe('vercel');
      expect(result.repoPath).toBe('/tmp/repo');
      expect(result.envVars).toEqual({ API_KEY: 'value' });
      expect(result.projectName).toBe('my-project');
      expect(result.branch).toBe('main');
    });

    it('should throw error for missing platform', () => {
      expect(() => {
        validateDeployConfig({ repoPath: '/tmp/repo', envVars: {} } as any);
      }).toThrow('Platform is required');
    });

    it('should throw error for missing repo path', () => {
      expect(() => {
        validateDeployConfig({ platform: 'vercel', envVars: {} } as any);
      }).toThrow('Repository path is required');
    });

    it('should throw error for invalid input type', () => {
      expect(() => {
        validateDeployConfig(null as any);
      }).toThrow('must be an object');
    });
  });
});
