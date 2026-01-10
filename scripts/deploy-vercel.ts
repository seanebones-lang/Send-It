#!/usr/bin/env ts-node

/**
 * Deploy to Vercel using credentials stored in macOS keychain
 * 
 * This script:
 * 1. Retrieves the Vercel token from macOS keychain
 * 2. Builds the project using webpack
 * 3. Deploys to Vercel using the Vercel API
 */

import * as keytar from 'keytar';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SERVICE_NAME = 'send-it';
const ACCOUNT_NAME = 'vercel-token';

interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: string;
}

/**
 * Check if Vercel CLI is already authenticated
 */
function checkVercelCLIAuth(): boolean {
  const vercelCmd = getVercelCommand();
  try {
    execSync(`${vercelCmd} whoami`, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve Vercel token from macOS keychain or use Vercel CLI auth
 */
async function getTokenFromKeychain(): Promise<string | null> {
  try {
    // First check if Vercel CLI is already authenticated
    if (checkVercelCLIAuth()) {
      console.log('✓ Vercel CLI is already authenticated, will use CLI credentials');
      return null; // Return null to indicate we should use Vercel CLI directly
    }

    // Try to get token from keychain
    const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (!token) {
      // Try alternative account names
      const alternatives = ['vercel', 'Vercel', 'VERCEL_TOKEN'];
      for (const alt of alternatives) {
        const altToken = await keytar.getPassword(SERVICE_NAME, alt);
        if (altToken) {
          console.log(`✓ Found token with account name: "${alt}"`);
          return altToken;
        }
      }
      return null;
    }
    return token;
  } catch (error) {
    console.warn('Warning: Could not retrieve token from keychain:', error);
    return null;
  }
}

/**
 * Build the project for Vercel
 */
async function buildProject(): Promise<void> {
  console.log('Building project for Vercel...');
  try {
    execSync('npm run build:web', { stdio: 'inherit' });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    throw new Error('Build process failed');
  }
}

/**
 * Get project metadata from package.json
 */
function getProjectMetadata(): { name: string; version: string } {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  return {
    name: packageJson.name || 'send-it',
    version: packageJson.version || '1.0.0',
  };
}

/**
 * Create or get Vercel project
 */
async function getOrCreateProject(token: string, projectName: string): Promise<string> {
  console.log(`Checking for existing project: ${projectName}...`);
  
  try {
    // Try to get existing project
    const response = await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const project = await response.json();
      console.log(`Found existing project: ${project.id}`);
      return project.id;
    }

    if (response.status === 404) {
      // Project doesn't exist, create it
      console.log(`Creating new project: ${projectName}...`);
      const createResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          framework: null,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create project: ${createResponse.statusText} - ${errorText}`);
      }

      const newProject = await createResponse.json();
      console.log(`Created new project: ${newProject.id}`);
      return newProject.id;
    }

    throw new Error(`Unexpected response: ${response.statusText}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to create project')) {
      throw error;
    }
    console.error('Error getting/creating project:', error);
    throw new Error('Failed to get or create Vercel project');
  }
}

/**
 * Deploy to Vercel using the Vercel CLI (recommended) or API
 */
async function deployToVercel(
  token: string | null,
  projectId: string,
  projectName: string
): Promise<VercelDeploymentResponse> {
  console.log('Deploying to Vercel...');

  const outputDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(outputDir)) {
    throw new Error('Build output directory not found. Please run build first.');
  }

  try {
    // Check if Vercel CLI is available
    const vercelCliAvailable = checkVercelCLI();
    
    if (vercelCliAvailable) {
      console.log('Using Vercel CLI for deployment...');
      return await deployWithCLI(token, projectName);
    } else {
      console.error('\n⚠️  Vercel CLI not found.');
      console.error('Please install Vercel CLI: npm install -g vercel');
      console.error('Or use npx: npx vercel --version');
      throw new Error('Vercel CLI is required for deployment. Install it with: npm install -g vercel');
    }
  } catch (error) {
    console.error('Deployment error:', error);
    throw error;
  }
}

/**
 * Get Vercel CLI command (use npx if vercel not in PATH)
 */
function getVercelCommand(): string {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return 'vercel';
  } catch {
    try {
      execSync('npx vercel --version', { stdio: 'ignore' });
      return 'npx vercel';
    } catch {
      return 'npx vercel'; // Default to npx if available
    }
  }
}

/**
 * Check if Vercel CLI is available
 */
function checkVercelCLI(): boolean {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync('npx vercel --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Deploy using Vercel CLI
 */
async function deployWithCLI(token: string | null, projectName: string): Promise<VercelDeploymentResponse> {
  const vercelCmd = getVercelCommand();
  
  try {
    // First, link the project if not already linked
    const vercelConfigPath = path.join(process.cwd(), '.vercel');
    const vercelConfigFile = path.join(vercelConfigPath, 'project.json');
    
    if (!fs.existsSync(vercelConfigFile)) {
      console.log('Linking project to Vercel...');
      try {
        // If we have a token, use it; otherwise let Vercel CLI handle auth
        if (token) {
          execSync(
            `${vercelCmd} link --yes --token=${token} --project=${projectName}`,
            {
              cwd: process.cwd(),
              stdio: 'pipe',
              encoding: 'utf-8',
              env: { ...process.env, VERCEL_TOKEN: token },
            }
          );
        } else {
          execSync(
            `${vercelCmd} link --yes --project=${projectName}`,
            {
              cwd: process.cwd(),
              stdio: 'inherit', // Show prompts if needed
              encoding: 'utf-8',
            }
          );
        }
      } catch (linkError) {
        // If link fails, continue anyway - Vercel will prompt or create new project
        console.log('Note: Project linking skipped, Vercel will handle it during deployment');
      }
    }

    // Deploy to production
    console.log('Creating production deployment...');
    const envVars = token ? { ...process.env, VERCEL_TOKEN: token } : process.env;
    const output = execSync(
      `${vercelCmd} --prod --yes`,
      {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf-8',
        env: envVars,
      }
    );

    // Parse deployment URL from output
    // Vercel CLI outputs URLs in various formats, try to match common patterns
    const urlPatterns = [
      /https:\/\/[\w-]+\.vercel\.app/g,
      /https:\/\/[\w-]+-\w+\.vercel\.app/g,
      /https:\/\/[\w-]+-[\w-]+\.vercel\.app/g,
    ];

    let url: string | null = null;
    for (const pattern of urlPatterns) {
      const matches = output.match(pattern);
      if (matches && matches.length > 0) {
        url = matches[matches.length - 1]; // Get the last (usually production) URL
        break;
      }
    }

    if (!url) {
      console.warn('Could not parse deployment URL from output.');
      if (token) {
        console.warn('Attempting to get deployment from API...');
        // Fallback: get the latest deployment from API (only if we have token)
        try {
          const deploymentsResponse = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${projectName}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (deploymentsResponse.ok) {
            const deployments = await deploymentsResponse.json();
            if (deployments.deployments && deployments.deployments.length > 0) {
              const deployment = deployments.deployments[0];
              url = `https://${deployment.url}`;
            }
          }
        } catch (apiError) {
          console.warn('Could not fetch from API:', apiError);
        }
      }
    }

    if (!url) {
      console.log('\n⚠️  Could not automatically determine deployment URL.');
      console.log('Check the Vercel CLI output above or visit https://vercel.com/dashboard');
      // Return a placeholder - the deployment was successful even if we can't parse the URL
      return {
        id: 'cli-deployment',
        url: 'Check Vercel dashboard',
        readyState: 'READY',
      };
    }

    // Get deployment details from API (only if we have token)
    let deploymentId = '';
    let readyState = 'READY';
    
    if (token) {
      try {
        const deploymentResponse = await fetch(
          `https://api.vercel.com/v13/deployments?url=${url.replace('https://', '')}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (deploymentResponse.ok) {
          const deployments = await deploymentResponse.json();
          const deployment = deployments.deployments?.[0];
          if (deployment) {
            deploymentId = deployment.uid || deployment.id;
            readyState = deployment.readyState || 'READY';
          }
        }
      } catch (apiError) {
        // If API call fails, deployment still succeeded via CLI
        console.warn('Could not fetch deployment details from API');
      }
    }

    console.log(`✓ Deployment successful: ${url}`);
    return {
      id: deploymentId || 'unknown',
      url,
      readyState,
    };
  } catch (error: any) {
    if (error.stdout) {
      console.error('Vercel CLI output:', error.stdout);
    }
    if (error.stderr) {
      console.error('Vercel CLI error:', error.stderr);
    }
    console.error('CLI deployment failed:', error.message);
    throw error;
  }
}


/**
 * Poll deployment status
 */
async function waitForDeployment(
  token: string,
  deploymentId: string,
  maxWaitTime: number = 300000
): Promise<void> {
  console.log('Waiting for deployment to complete...');
  const startTime = Date.now();
  let delay = 2000;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const deployment = await response.json();
        const state = deployment.readyState;

        if (state === 'READY') {
          console.log('✓ Deployment is ready!');
          return;
        } else if (state === 'ERROR' || state === 'CANCELED') {
          throw new Error(`Deployment failed with state: ${state}`);
        }

        console.log(`Deployment status: ${state}...`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 10000); // Exponential backoff, max 10s
    } catch (error) {
      console.error('Error checking deployment status:', error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Deployment timeout');
}

/**
 * Main deployment function
 */
async function main() {
  try {
    console.log('🚀 Starting Vercel deployment...\n');

    // Step 1: Get token from keychain or use Vercel CLI auth
    console.log('Step 1: Checking for Vercel credentials...');
    const token = await getTokenFromKeychain();
    
    if (!token && !checkVercelCLIAuth()) {
      console.error('\n❌ No Vercel credentials found.');
      console.error('\nOptions:');
      console.error('1. Authenticate with Vercel CLI: vercel login');
      console.error('2. Store token in keychain using your Electron app');
      console.error(`3. Store token manually: node -e "require('keytar').setPassword('${SERVICE_NAME}', '${ACCOUNT_NAME}', 'YOUR_TOKEN')"`);
      throw new Error('Vercel credentials not found');
    }
    
    if (token) {
      console.log('✓ Token retrieved from keychain\n');
    } else {
      console.log('✓ Using Vercel CLI authentication\n');
    }

    // Step 2: Build project
    console.log('Step 2: Building project...');
    await buildProject();
    console.log('');

    // Step 3: Get project metadata
    const metadata = getProjectMetadata();
    const projectName = metadata.name;

    // Step 4: Get or create project (only if we have token, otherwise skip)
    let projectId = projectName;
    if (token) {
      console.log('Step 3: Setting up Vercel project...');
      projectId = await getOrCreateProject(token, projectName);
      console.log('');
    } else {
      console.log('Step 3: Using Vercel CLI project management...');
      console.log('');
    }

    // Step 5: Deploy
    console.log('Step 4: Deploying to Vercel...');
    const deployment = await deployToVercel(token || '', projectId, projectName);
    console.log('');

    // Step 6: Wait for deployment to complete (only if we have token for API polling)
    if (token && deployment.id && deployment.id !== 'cli-deployment' && deployment.id !== 'unknown') {
      await waitForDeployment(token as string, deployment.id);
      console.log('');
    } else {
      // If using Vercel CLI without token, it will handle the deployment wait itself
      console.log('Deployment initiated via Vercel CLI...');
    }

    console.log('🎉 Deployment completed successfully!');
    console.log(`   URL: ${deployment.url}`);
    console.log(`   Deployment ID: ${deployment.id}`);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
