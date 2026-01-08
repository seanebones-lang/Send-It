import * as fs from 'fs';
import * as path from 'path';
import { Platform } from './database';

export interface FrameworkDetection {
  framework: string;
  scores: Record<Platform, number>;
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

  static detect(repoPath: string): FrameworkDetection {
    const packageJsonPath = path.join(repoPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return {
        framework: 'unknown',
        scores: {
          vercel: 50,
          netlify: 50,
          cloudflare: 50,
          aws: 50,
          azure: 50,
          gcp: 50,
        },
      };
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
          return {
            framework,
            scores: { ...config.platforms },
          };
        }
      }

      // Check for static site indicators
      if (dependencyKeys.some((dep) => dep.includes('gatsby'))) {
        return {
          framework: 'gatsby',
          scores: {
            vercel: 95,
            netlify: 95,
            cloudflare: 85,
            aws: 70,
            azure: 65,
            gcp: 70,
          },
        };
      }

      // Default: generic Node.js/React app
      return {
        framework: 'generic',
        scores: {
          vercel: 70,
          netlify: 75,
          cloudflare: 60,
          aws: 80,
          azure: 70,
          gcp: 75,
        },
      };
    } catch (error) {
      console.error('Error reading package.json:', error);
      return {
        framework: 'unknown',
        scores: {
          vercel: 50,
          netlify: 50,
          cloudflare: 50,
          aws: 50,
          azure: 50,
          gcp: 50,
        },
      };
    }
  }
}
