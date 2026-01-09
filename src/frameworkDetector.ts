import * as fs from 'fs';
import * as path from 'path';
import type { AnalysisPlatform } from './types/ipc';
import { getFrameworkCache } from './utils/frameworkCache';

export interface FrameworkDetection {
  framework: string;
  scores: Record<AnalysisPlatform, number>;
}

export class FrameworkDetector {
  private static readonly FRAMEWORKS = {
    'next.js': {
      indicators: ['next', '@next/font', 'next-auth'],
      platforms: {
        vercel: 100,
        netlify: 80,
        cloudflare: 70,
        aws: 60,
        azure: 50,
        gcp: 50,
      },
    },
    'vite': {
      indicators: ['vite', '@vitejs/plugin-react', '@vitejs/plugin-vue'],
      platforms: {
        vercel: 90,
        netlify: 95,
        cloudflare: 85,
        aws: 70,
        azure: 60,
        gcp: 65,
      },
    },
    'create-react-app': {
      indicators: ['react-scripts', 'react-app-rewired'],
      platforms: {
        vercel: 85,
        netlify: 90,
        cloudflare: 75,
        aws: 80,
        azure: 70,
        gcp: 75,
      },
    },
    'vue': {
      indicators: ['@vue/cli-service', 'vue', 'nuxt'],
      platforms: {
        vercel: 90,
        netlify: 95,
        cloudflare: 80,
        aws: 70,
        azure: 65,
        gcp: 70,
      },
    },
    'angular': {
      indicators: ['@angular/cli', '@angular/core'],
      platforms: {
        vercel: 85,
        netlify: 90,
        cloudflare: 70,
        aws: 75,
        azure: 80,
        gcp: 75,
      },
    },
    'svelte': {
      indicators: ['svelte', 'sveltekit', '@sveltejs/kit'],
      platforms: {
        vercel: 90,
        netlify: 95,
        cloudflare: 85,
        aws: 70,
        azure: 65,
        gcp: 70,
      },
    },
    'remix': {
      indicators: ['@remix-run/node', '@remix-run/react'],
      platforms: {
        vercel: 95,
        netlify: 90,
        cloudflare: 85,
        aws: 80,
        azure: 75,
        gcp: 80,
      },
    },
    'astro': {
      indicators: ['astro'],
      platforms: {
        vercel: 95,
        netlify: 95,
        cloudflare: 90,
        aws: 75,
        azure: 70,
        gcp: 75,
      },
    },
  };

  static detect(repoPath: string, useCache: boolean = true): FrameworkDetection {
    // Check cache first
    if (useCache) {
      const cache = getFrameworkCache();
      const cached = cache.get(repoPath);
      if (cached) {
        return cached;
      }
    }

    const packageJsonPath = path.join(repoPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      const result = {
        framework: 'unknown',
        scores: {
          vercel: 50,
          netlify: 50,
          cloudflare: 50,
          aws: 50,
          azure: 50,
          gcp: 50,
        } as Record<AnalysisPlatform, number>,
      };

      // Cache result even for unknown
      if (useCache) {
        const cache = getFrameworkCache();
        cache.set(repoPath, result);
      }

      return result;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const dependencyKeys = Object.keys(dependencies).map((k) => k.toLowerCase());

      // Check for framework indicators
      for (const [framework, config] of Object.entries(this.FRAMEWORKS)) {
        const matchCount = config.indicators.filter((indicator) =>
          dependencyKeys.some((dep) => dep.includes(indicator.toLowerCase()))
        ).length;

        if (matchCount > 0) {
          const result = {
            framework,
            scores: { ...config.platforms } as Record<AnalysisPlatform, number>,
          };

          // Cache result
          if (useCache) {
            const cache = getFrameworkCache();
            cache.set(repoPath, result);
          }

          return result;
        }
      }

      // Check for static site indicators
      if (dependencyKeys.some((dep) => dep.includes('gatsby'))) {
        const result = {
          framework: 'gatsby',
          scores: {
            vercel: 95,
            netlify: 95,
            cloudflare: 85,
            aws: 70,
            azure: 65,
            gcp: 70,
          } as Record<AnalysisPlatform, number>,
        };

        // Cache result
        if (useCache) {
          const cache = getFrameworkCache();
          cache.set(repoPath, result);
        }

        return result;
      }

      // Default: generic Node.js/React app
      const result = {
        framework: 'generic',
        scores: {
          vercel: 70,
          netlify: 75,
          cloudflare: 60,
          aws: 80,
          azure: 70,
          gcp: 75,
        } as Record<AnalysisPlatform, number>,
      };

      // Cache result
      if (useCache) {
        const cache = getFrameworkCache();
        cache.set(repoPath, result);
      }

      return result;
    } catch (error) {
      console.error('Error reading package.json:', error);
      const result = {
        framework: 'unknown',
        scores: {
          vercel: 50,
          netlify: 50,
          cloudflare: 50,
          aws: 50,
          azure: 50,
          gcp: 50,
        } as Record<AnalysisPlatform, number>,
      };

      // Cache error result with shorter TTL (5 minutes)
      if (useCache) {
        const cache = getFrameworkCache();
        cache.set(repoPath, result, 5 * 60 * 1000);
      }

      return result;
    }
  }

  /**
   * Invalidates cache for a repository
   * Useful when repository has been updated
   * 
   * @param repoPath - Repository path
   */
  static invalidateCache(repoPath: string): void {
    const cache = getFrameworkCache();
    cache.invalidate(repoPath);
  }

  /**
   * Clears all cached framework detections
   */
  static clearCache(): void {
    const cache = getFrameworkCache();
    cache.clear();
  }
}
