// Browser API implementation using GitHub API and other web APIs
// This allows the web version to work without Electron

import type { CloneResult, FrameworkAnalysisResult, AnalysisPlatform } from '../electron';

/**
 * GitHub API rate limit tracking
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

let rateLimitInfo: RateLimitInfo | null = null;

/**
 * Check GitHub API rate limit from response headers
 */
function updateRateLimitFromHeaders(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  
  if (limit && remaining && reset) {
    rateLimitInfo = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
  }
}

/**
 * Get current rate limit status
 */
export function getRateLimitInfo(): RateLimitInfo | null {
  return rateLimitInfo;
}

/**
 * Check if rate limit is exceeded
 */
function isRateLimitExceeded(): boolean {
  if (!rateLimitInfo) return false;
  return rateLimitInfo.remaining === 0 && Date.now() / 1000 < rateLimitInfo.reset;
}

/**
 * Get time until rate limit reset
 */
export function getTimeUntilReset(): number {
  if (!rateLimitInfo) return 0;
  return Math.max(0, rateLimitInfo.reset - Date.now() / 1000);
}

/**
 * Extract owner and repo from GitHub URL
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

/**
 * Fetch file content from GitHub API
 */
async function fetchGitHubFile(owner: string, repo: string, path: string): Promise<string | null> {
  // Check rate limit before making request
  if (isRateLimitExceeded()) {
    const timeUntil = getTimeUntilReset();
    const minutes = Math.ceil(timeUntil / 60);
    console.warn(`GitHub API rate limit exceeded. Resets in ${minutes} minutes.`);
    throw new Error(`GitHub API rate limit exceeded. Please try again in ${minutes} minutes.`);
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Update rate limit info from response
    updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const timeUntil = parseInt(resetTime, 10) - Date.now() / 1000;
          const minutes = Math.ceil(timeUntil / 60);
          throw new Error(`GitHub API rate limit exceeded. Resets in ${minutes} minutes.`);
        }
      }
      return null;
    }

    const data = await response.json();
    if (data.type === 'file' && data.encoding === 'base64') {
      return atob(data.content.replace(/\n/g, ''));
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw error;
    }
    return null;
  }
}

/**
 * Analyze framework from GitHub repository
 */
async function analyzeFrameworkFromGitHub(owner: string, repo: string): Promise<FrameworkAnalysisResult> {
  // Fetch package.json to detect framework
  const packageJsonContent = await fetchGitHubFile(owner, repo, 'package.json');
  
  if (!packageJsonContent) {
    // Try alternative locations
    const altLocations = ['frontend/package.json', 'client/package.json', 'web/package.json'];
    for (const loc of altLocations) {
      const content = await fetchGitHubFile(owner, repo, loc);
      if (content) {
        return analyzeFromPackageJson(content);
      }
    }
    return {
      success: false,
      error: 'Could not find package.json in repository',
    };
  }

  return analyzeFromPackageJson(packageJsonContent);
}

/**
 * Analyze framework from package.json content
 */
function analyzeFromPackageJson(packageJsonContent: string): FrameworkAnalysisResult {
  try {
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const depNames = Object.keys(dependencies).map(d => d.toLowerCase());

    // Framework detection logic (simplified version)
    let framework = 'unknown';
    const scores: Record<AnalysisPlatform, number> = {
      vercel: 70,
      netlify: 70,
      cloudflare: 60,
      aws: 50,
      azure: 50,
      gcp: 50,
    };

    // Next.js detection
    if (depNames.includes('next') || depNames.some(d => d.includes('next'))) {
      framework = 'next.js';
      scores.vercel = 100;
      scores.netlify = 80;
      scores.cloudflare = 70;
    }
    // Vite detection
    else if (depNames.includes('vite') || depNames.some(d => d.includes('vite'))) {
      framework = 'vite';
      scores.vercel = 90;
      scores.netlify = 95;
      scores.cloudflare = 85;
    }
    // Create React App
    else if (depNames.includes('react-scripts')) {
      framework = 'create-react-app';
      scores.vercel = 85;
      scores.netlify = 90;
      scores.cloudflare = 75;
    }
    // Vue
    else if (depNames.includes('vue') || depNames.includes('@vue/cli-service')) {
      framework = 'vue';
      scores.vercel = 90;
      scores.netlify = 95;
      scores.cloudflare = 85;
    }
    // Nuxt
    else if (depNames.includes('nuxt')) {
      framework = 'nuxt';
      scores.vercel = 95;
      scores.netlify = 90;
      scores.cloudflare = 80;
    }
    // Angular
    else if (depNames.includes('@angular/core')) {
      framework = 'angular';
      scores.vercel = 85;
      scores.netlify = 85;
      scores.cloudflare = 75;
    }
    // Svelte
    else if (depNames.includes('svelte')) {
      framework = 'svelte';
      scores.vercel = 90;
      scores.netlify = 90;
      scores.cloudflare = 80;
    }
    // React (generic)
    else if (depNames.includes('react')) {
      framework = 'react';
      scores.vercel = 85;
      scores.netlify = 90;
      scores.cloudflare = 75;
    }

    return {
      success: true,
      framework,
      scores,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse package.json',
    };
  }
}

/**
 * Browser-compatible clone function (simulates clone by analyzing from GitHub API)
 */
export async function cloneRepoBrowser(repoUrl: string): Promise<CloneResult> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitHub URL. Please provide a valid GitHub repository URL.',
    };
  }

  // Check rate limit before making request
  if (isRateLimitExceeded()) {
    const timeUntil = getTimeUntilReset();
    const minutes = Math.ceil(timeUntil / 60);
    return {
      success: false,
      error: `GitHub API rate limit exceeded. Please try again in ${minutes} minutes, or download the desktop app for unlimited access.`,
    };
  }

  // Verify repository exists
  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Update rate limit info
    updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Repository not found. Please check the URL and ensure the repository is public.',
        };
      }
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const timeUntil = parseInt(resetTime, 10) - Date.now() / 1000;
          const minutes = Math.ceil(timeUntil / 60);
          return {
            success: false,
            error: `GitHub API rate limit exceeded. Resets in ${minutes} minutes. Download the desktop app for unlimited access.`,
          };
        }
      }
      return {
        success: false,
        error: `GitHub API error: ${response.statusText}`,
      };
    }

    const repoData = await response.json();

    // Return success with a virtual path (we don't actually clone in browser)
    return {
      success: true,
      path: `github://${parsed.owner}/${parsed.repo}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to access repository',
    };
  }
}

/**
 * Browser-compatible framework analysis
 */
export async function analyzeFrameworkBrowser(repoPath: string, repoUrl?: string): Promise<FrameworkAnalysisResult> {
  // Extract owner/repo from path or URL
  let owner: string;
  let repo: string;

  if (repoPath.startsWith('github://')) {
    const parts = repoPath.replace('github://', '').split('/');
    owner = parts[0];
    repo = parts[1];
  } else if (repoUrl) {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return {
        success: false,
        error: 'Invalid repository URL',
      };
    }
    owner = parsed.owner;
    repo = parsed.repo;
  } else {
    return {
      success: false,
      error: 'Repository information not available',
    };
  }

  return analyzeFrameworkFromGitHub(owner, repo);
}
