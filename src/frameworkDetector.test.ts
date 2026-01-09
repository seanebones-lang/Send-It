/**
 * Unit tests for FrameworkDetector
 * Tests framework detection logic and caching integration
 */

import { FrameworkDetector } from './frameworkDetector';
import * as fs from 'fs';
import * as path from 'path';

// Mock framework cache
jest.mock('./utils/frameworkCache', () => ({
  getFrameworkCache: jest.fn(() => ({
    get: jest.fn(() => null),
    set: jest.fn(),
    invalidate: jest.fn(),
    clear: jest.fn(),
  })),
}));

import { getFrameworkCache } from './utils/frameworkCache';

describe('FrameworkDetector', () => {
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = {
      get: jest.fn(() => null),
      set: jest.fn(),
      invalidate: jest.fn(),
      clear: jest.fn(),
    };
    (getFrameworkCache as jest.Mock).mockReturnValue(mockCache);
  });

  describe('detect', () => {
    it('should detect Next.js framework', () => {
      const packageJson = {
        dependencies: { next: '14.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('next.js');
      expect(result.scores.vercel).toBe(100);
    });

    it('should detect Vite framework', () => {
      const packageJson = {
        dependencies: { vite: '5.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('vite');
      expect(result.scores.netlify).toBe(95);
    });

    it('should detect Create React App', () => {
      const packageJson = {
        dependencies: { 'react-scripts': '5.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('create-react-app');
      expect(result.scores.netlify).toBe(90);
    });

    it('should detect Vue framework', () => {
      const packageJson = {
        dependencies: { vue: '3.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('vue');
      expect(result.scores.netlify).toBe(95);
    });

    it('should detect Angular framework', () => {
      const packageJson = {
        dependencies: { '@angular/core': '17.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('angular');
      expect(result.scores.netlify).toBe(90);
    });

    it('should detect Svelte framework', () => {
      const packageJson = {
        dependencies: { svelte: '4.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('svelte');
      expect(result.scores.netlify).toBe(95);
    });

    it('should detect Remix framework', () => {
      const packageJson = {
        dependencies: { '@remix-run/react': '2.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('remix');
      expect(result.scores.vercel).toBe(95);
    });

    it('should detect Astro framework', () => {
      const packageJson = {
        dependencies: { astro: '3.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('astro');
      expect(result.scores.vercel).toBe(95);
    });

    it('should detect Gatsby framework', () => {
      const packageJson = {
        dependencies: { gatsby: '5.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('gatsby');
      expect(result.scores.vercel).toBe(95);
    });

    it('should return generic for unknown frameworks', () => {
      const packageJson = {
        dependencies: { express: '4.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('generic');
      expect(result.scores.aws).toBe(80); // Generic scores
    });

    it('should return unknown for missing package.json', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('unknown');
      expect(result.scores.vercel).toBe(50); // Default scores
    });

    it('should handle package.json parse errors', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('unknown');
    });

    it('should check both dependencies and devDependencies', () => {
      const packageJson = {
        dependencies: { express: '4.0.0' },
        devDependencies: { next: '14.0.0' }, // In devDependencies
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('next.js'); // Should detect from devDependencies
    });

    it('should use cache when available', () => {
      const cachedResult = {
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

      mockCache.get = jest.fn(() => cachedResult);

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result).toEqual(cachedResult);
      expect(mockCache.get).toHaveBeenCalledWith('/tmp/repo');
      // Should not read file when cached
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should cache result after detection', () => {
      const packageJson = {
        dependencies: { next: '14.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      FrameworkDetector.detect('/tmp/repo');

      expect(mockCache.set).toHaveBeenCalledWith(
        '/tmp/repo',
        expect.objectContaining({ framework: 'next.js' }),
        undefined // Default TTL
      );
    });

    it('should disable cache when useCache is false', () => {
      const packageJson = {
        dependencies: { next: '14.0.0' },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      FrameworkDetector.detect('/tmp/repo', false);

      // Should not check cache
      expect(mockCache.get).not.toHaveBeenCalled();
      // Should still cache (if detection succeeds)
      // This is fine - caching is optional but still happens
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for repository', () => {
      FrameworkDetector.invalidateCache('/tmp/repo');

      expect(mockCache.invalidate).toHaveBeenCalledWith('/tmp/repo');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached detections', () => {
      FrameworkDetector.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('framework priority', () => {
    it('should detect first matching framework in order', () => {
      // If multiple frameworks match, should use first one found
      const packageJson = {
        dependencies: {
          next: '14.0.0',
          vite: '5.0.0', // Both present
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      // Should detect next.js first (earlier in FRAMEWORKS object)
      expect(result.framework).toBe('next.js');
    });
  });

  describe('case insensitivity', () => {
    it('should handle case-insensitive dependency matching', () => {
      const packageJson = {
        dependencies: { 'NEXT': '14.0.0' }, // Uppercase
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJson));
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = FrameworkDetector.detect('/tmp/repo');

      expect(result.framework).toBe('next.js'); // Should still detect
    });
  });
});
