// Browser API implementation using GitHub API and other web APIs
// This allows the web version to work without Electron

import type { CloneResult, FrameworkAnalysisResult, AnalysisPlatform } from '../electron';

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
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.type === 'file' && data.encoding === 'base64') {
      return atob(data.content);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
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

  // Verify repository exists
  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Repository not found. Please check the URL and ensure the repository is public.',
        };
      }
      return {
        success: false,
        error: `GitHub API error: ${response.statusText}`,
      };
    }

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
