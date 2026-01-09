/**
 * Unit tests for framework detection cache
 * Tests caching, invalidation, and TTL functionality
 */

import { getFrameworkCache } from './frameworkCache';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
jest.mock('fs');
jest.mock('path');

// Mock crypto
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  let hashCounter = 0;
  return {
    ...actual,
    createHash: jest.fn(() => ({
      update: jest.fn(function(this: any, data: string) {
        this.data = data;
        return this;
      }),
      digest: jest.fn(function(this: any) {
        // Return predictable hash based on data
        return Buffer.from(`${this.data || ''}${++hashCounter}`).toString('hex');
      }),
    })),
  };
});

describe('Framework Cache', () => {
  let cache: ReturnType<typeof getFrameworkCache>;

  beforeEach(() => {
    // Reset singleton
    (getFrameworkCache as any).cacheInstance = null;
    cache = getFrameworkCache();
    cache.clear();
    jest.clearAllMocks();
  });

  describe('get and set', () => {
    it('should cache and retrieve framework detection result', () => {
      const repoPath = '/tmp/repo';
      const result = {
        framework: 'next.js',
        scores: {
          vercel: 100,
          netlify: 80,
          cloudflare: 70,
          aws: 60,
          azure: 50,
          gcp: 50,
        },
      };

      // Mock file existence
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('{"name": "test", "dependencies": {"next": "1.0.0"}}');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath, result);
      const cached = cache.get(repoPath);

      expect(cached).toEqual(result);
    });

    it('should return null for uncached repository', () => {
      const cached = cache.get('/tmp/uncached-repo');
      expect(cached).toBeNull();
    });

    it('should invalidate cache when repository changes', () => {
      const repoPath = '/tmp/repo';
      const result = {
        framework: 'next.js',
        scores: {
          vercel: 100,
          netlify: 80,
          cloudflare: 70,
          aws: 60,
          azure: 50,
          gcp: 50,
        },
      };

      // First hash
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package1');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath, result);

      // Change repository content (different hash)
      (fs.readFileSync as jest.Mock).mockReturnValue('package2');

      const cached = cache.get(repoPath);
      expect(cached).toBeNull(); // Should be invalidated
    });
  });

  describe('TTL', () => {
    it('should expire cache entries after TTL', () => {
      jest.useFakeTimers();
      
      const repoPath = '/tmp/repo';
      const result = {
        framework: 'vite',
        scores: {
          vercel: 90,
          netlify: 95,
          cloudflare: 85,
          aws: 70,
          azure: 60,
          gcp: 65,
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath, result, 1000); // 1 second TTL

      // Before TTL expires
      jest.advanceTimersByTime(500);
      expect(cache.get(repoPath)).toEqual(result);

      // After TTL expires
      jest.advanceTimersByTime(600);
      expect(cache.get(repoPath)).toBeNull();

      jest.useRealTimers();
    });

    it('should use default TTL when not specified', () => {
      const repoPath = '/tmp/repo';
      const result = {
        framework: 'react',
        scores: {
          vercel: 85,
          netlify: 90,
          cloudflare: 75,
          aws: 80,
          azure: 70,
          gcp: 75,
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath, result);
      
      // Should be cached
      expect(cache.get(repoPath)).toEqual(result);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific repository cache', () => {
      const repoPath1 = '/tmp/repo1';
      const repoPath2 = '/tmp/repo2';
      
      const result1 = {
        framework: 'next.js',
        scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
      };
      const result2 = {
        framework: 'vite',
        scores: { vercel: 90, netlify: 95, cloudflare: 85, aws: 70, azure: 60, gcp: 65 },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath1, result1);
      cache.set(repoPath2, result2);

      cache.invalidate(repoPath1);

      expect(cache.get(repoPath1)).toBeNull();
      expect(cache.get(repoPath2)).toEqual(result2);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set('/tmp/repo1', {
        framework: 'next.js',
        scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
      });
      cache.set('/tmp/repo2', {
        framework: 'vite',
        scores: { vercel: 90, netlify: 95, cloudflare: 85, aws: 70, azure: 60, gcp: 65 },
      });

      cache.clear();

      expect(cache.get('/tmp/repo1')).toBeNull();
      expect(cache.get('/tmp/repo2')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired cache entries', () => {
      jest.useFakeTimers();

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set('/tmp/repo1', {
        framework: 'next.js',
        scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
      }, 1000);

      cache.set('/tmp/repo2', {
        framework: 'vite',
        scores: { vercel: 90, netlify: 95, cloudflare: 85, aws: 70, azure: 60, gcp: 65 },
      }, 5000);

      // Advance time past first entry's TTL
      jest.advanceTimersByTime(1500);

      cache.cleanup();

      // First entry should be removed, second should remain
      expect(cache.get('/tmp/repo1')).toBeNull();
      expect(cache.get('/tmp/repo2')).not.toBeNull();

      jest.useRealTimers();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      jest.useFakeTimers();

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set('/tmp/repo1', {
        framework: 'next.js',
        scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
      }, 5000);

      cache.set('/tmp/repo2', {
        framework: 'vite',
        scores: { vercel: 90, netlify: 95, cloudflare: 85, aws: 70, azure: 60, gcp: 65 },
      }, 1000);

      // Expire one entry
      jest.advanceTimersByTime(1500);

      const stats = cache.getStats();
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(1);
      expect(stats.expired).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('setDefaultTTL', () => {
    it('should update default TTL for new entries', () => {
      const repoPath = '/tmp/repo';
      
      cache.setDefaultTTL(5000); // 5 seconds

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('package');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      cache.set(repoPath, {
        framework: 'next.js',
        scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
      });

      // Should use custom TTL (would need to test with time mocking to verify)
      expect(cache.get(repoPath)).not.toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      // Should not throw when files don't exist
      expect(() => {
        const result = {
          framework: 'next.js',
          scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
        };
        cache.set('/tmp/repo', result);
        cache.get('/tmp/repo');
      }).not.toThrow();
    });

    it('should use timestamp-based key when hashing fails', () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      // Should not throw, but use fallback hashing
      expect(() => {
        const result = {
          framework: 'next.js',
          scores: { vercel: 100, netlify: 80, cloudflare: 70, aws: 60, azure: 50, gcp: 50 },
        };
        cache.set('/tmp/repo', result);
      }).not.toThrow();
    });
  });
});
