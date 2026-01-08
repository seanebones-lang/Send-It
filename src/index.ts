import { app, BrowserWindow, ipcMain, webContents } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import simpleGit, { SimpleGit } from 'simple-git';
import * as keytar from 'keytar';
import Database from 'better-sqlite3';
import { Database as OldDatabase } from './database';
import { FrameworkDetector } from './frameworkDetector';
import type { DeployConfig, DeployResult, DeployStatus, TokenResult, QueueItem, LogMessage, Platform } from './types/ipc';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const SERVICE_NAME = 'send-it';
const MAIN_WINDOW_KEY = 'main-window';

// Initialize databases after app is ready
let db: OldDatabase | null = null;
let deployDb: Database | null = null;
let mainWindow: BrowserWindow | null = null;

// Deployment queue
const deployQueue: QueueItem[] = [];
let isProcessingQueue = false;

// Active deployments tracking
const activeDeployments = new Map<string, DeployStatus>();

app.whenReady().then(() => {
  db = new OldDatabase();
  
  // Initialize better-sqlite3 for deployments
  const dbPath = path.join(app.getPath('userData'), 'deployments.db');
  deployDb = new Database(dbPath);
  
  // Create deployments table
  deployDb.exec(`
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      env_vars TEXT NOT NULL,
      project_name TEXT,
      branch TEXT,
      status TEXT NOT NULL,
      deployment_id TEXT,
      url TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    );
    
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deployment_id TEXT NOT NULL,
      message TEXT NOT NULL,
      level TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

// ========== Secure Token Management ==========

async function getToken(platform: Platform): Promise<TokenResult> {
  try {
    const token = await keytar.getPassword(SERVICE_NAME, `${platform}-token`);
    if (!token) {
      return { success: false, error: 'No token found for platform' };
    }
    return { success: true, token };
  } catch (error) {
    console.error(`Error getting token for ${platform}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function setToken(platform: Platform, token: string): Promise<TokenResult> {
  try {
    await keytar.setPassword(SERVICE_NAME, `${platform}-token`, token);
    return { success: true, token };
  } catch (error) {
    console.error(`Error setting token for ${platform}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ========== Log Streaming ==========

function emitLog(deploymentId: string, message: string, level: LogMessage['level'] = 'info') {
  const logMessage: LogMessage = {
    deploymentId,
    message,
    level,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to all renderer processes
  webContents.getAllWebContents().forEach((contents) => {
    if (!contents.isDestroyed()) {
      contents.send('deploy:log', logMessage);
    }
  });

  // Store in database
  if (deployDb) {
    try {
      deployDb
        .prepare('INSERT INTO deployment_logs (deployment_id, message, level) VALUES (?, ?, ?)')
        .run(deploymentId, message, level);
    } catch (error) {
      console.error('Error storing log:', error);
    }
  }
}

// ========== Deployment Functions ==========

async function deployVercel(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
  emitLog(deploymentId, 'Starting Vercel deployment...', 'info');
  
  try {
    const tokenResult = await getToken('vercel');
    if (!tokenResult.success || !tokenResult.token) {
      emitLog(deploymentId, 'Vercel token not found', 'error');
      return { success: false, error: 'Vercel token not found', platform: 'vercel' };
    }

    emitLog(deploymentId, 'Reading repository files...', 'info');
    
    // Create a tarball of the repo (simplified - in production use archiver)
    const repoPath = config.repoPath;
    if (!fs.existsSync(repoPath)) {
      emitLog(deploymentId, 'Repository path does not exist', 'error');
      return { success: false, error: 'Repository path does not exist', platform: 'vercel' };
    }

    // Get project name from config or repo path
    const projectName = config.projectName || path.basename(repoPath);

    emitLog(deploymentId, 'Creating Vercel deployment...', 'info');

    // Step 1: Create deployment
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: 'github',
          repo: config.repoPath, // In production, extract from git remote
        },
        env: Object.entries(config.envVars).map(([key, value]) => ({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview'],
        })),
        target: 'production',
      }),
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      emitLog(deploymentId, `Vercel API error: ${errorText}`, 'error');
      return { success: false, error: `Vercel API error: ${deployResponse.statusText}`, platform: 'vercel' };
    }

    const deployData = await deployResponse.json();
    const vercelDeploymentId = deployData.id;
    const url = deployData.url;

    emitLog(deploymentId, `Deployment created: ${url}`, 'success');
    emitLog(deploymentId, 'Waiting for deployment to complete...', 'info');

    // Poll deployment status
    let status = 'building';
    let attempts = 0;
    const maxAttempts = 60;

    while (status === 'building' || status === 'queued' || status === 'initializing') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${vercelDeploymentId}`, {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        status = statusData.readyState || 'building';
        emitLog(deploymentId, `Deployment status: ${status}`, 'info');
      }

      if (attempts >= maxAttempts) {
        emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'vercel' };
      }
    }

    if (status === 'READY') {
      emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: vercelDeploymentId, url, platform: 'vercel' };
    } else {
      emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'vercel' };
    }
  } catch (error) {
    emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'vercel' };
  }
}

async function deployRailway(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
  emitLog(deploymentId, 'Starting Railway deployment...', 'info');
  
  try {
    const tokenResult = await getToken('railway');
    if (!tokenResult.success || !tokenResult.token) {
      emitLog(deploymentId, 'Railway token not found', 'error');
      return { success: false, error: 'Railway token not found', platform: 'railway' };
    }

    emitLog(deploymentId, 'Reading repository files...', 'info');

    const repoPath = config.repoPath;
    if (!fs.existsSync(repoPath)) {
      emitLog(deploymentId, 'Repository path does not exist', 'error');
      return { success: false, error: 'Repository path does not exist', platform: 'railway' };
    }

    const projectName = config.projectName || path.basename(repoPath);

    emitLog(deploymentId, 'Creating Railway deployment...', 'info');

    // Step 1: Create or get project
    const projectsResponse = await fetch('https://api.railway.app/v1/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
      },
    });

    if (!projectsResponse.ok) {
      emitLog(deploymentId, 'Failed to fetch Railway projects', 'error');
      return { success: false, error: 'Failed to fetch Railway projects', platform: 'railway' };
    }

    const projects = await projectsResponse.json();
    let project = projects.projects?.find((p: any) => p.name === projectName);

    if (!project) {
      // Create new project
      const createProjectResponse = await fetch('https://api.railway.app/v1/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName }),
      });

      if (!createProjectResponse.ok) {
        emitLog(deploymentId, 'Failed to create Railway project', 'error');
        return { success: false, error: 'Failed to create Railway project', platform: 'railway' };
      }

      project = await createProjectResponse.json();
    }

    emitLog(deploymentId, `Project found/created: ${project.id}`, 'info');

    // Step 2: Create service and deployment
    const deployResponse = await fetch(`https://api.railway.app/v1/projects/${project.id}/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId: project.id, // Simplified - in production create service first
        variables: config.envVars,
      }),
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      emitLog(deploymentId, `Railway API error: ${errorText}`, 'error');
      return { success: false, error: `Railway API error: ${deployResponse.statusText}`, platform: 'railway' };
    }

    const deployData = await deployResponse.json();
    const railwayDeploymentId = deployData.id;

    emitLog(deploymentId, `Deployment created: ${railwayDeploymentId}`, 'success');

    // Poll deployment status
    let status = 'DEPLOYING';
    let attempts = 0;
    const maxAttempts = 60;

    while (status === 'DEPLOYING' || status === 'QUEUED') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const statusResponse = await fetch(`https://api.railway.app/v1/deployments/${railwayDeploymentId}`, {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        status = statusData.status || 'DEPLOYING';
        emitLog(deploymentId, `Deployment status: ${status}`, 'info');
      }

      if (attempts >= maxAttempts) {
        emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'railway' };
      }
    }

    if (status === 'SUCCESS') {
      const url = deployData.service?.url || `https://${projectName}.railway.app`;
      emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: railwayDeploymentId, url, platform: 'railway' };
    } else {
      emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'railway' };
    }
  } catch (error) {
    emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'render' };
  }
}

async function deployRender(config: DeployConfig, deploymentId: string): Promise<DeployResult> {
  emitLog(deploymentId, 'Starting Render deployment...', 'info');
  
  try {
    const tokenResult = await getToken('render');
    if (!tokenResult.success || !tokenResult.token) {
      emitLog(deploymentId, 'Render token not found', 'error');
      return { success: false, error: 'Render token not found', platform: 'render' };
    }

    emitLog(deploymentId, 'Reading repository files...', 'info');

    const repoPath = config.repoPath;
    if (!fs.existsSync(repoPath)) {
      emitLog(deploymentId, 'Repository path does not exist', 'error');
      return { success: false, error: 'Repository path does not exist', platform: 'render' };
    }

    const projectName = config.projectName || path.basename(repoPath);

    emitLog(deploymentId, 'Creating Render service...', 'info');

    // Step 1: Create service
    const serviceResponse = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'web_service',
        name: projectName,
        repo: config.repoPath, // In production, extract from git remote
        envVars: Object.entries(config.envVars).map(([key, value]) => ({
          key,
          value,
        })),
        branch: config.branch || 'main',
      }),
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      emitLog(deploymentId, `Render API error: ${errorText}`, 'error');
      return { success: false, error: `Render API error: ${serviceResponse.statusText}`, platform: 'render' };
    }

    const serviceData = await serviceResponse.json();
    const serviceId = serviceData.service?.id;

    if (!serviceId) {
      emitLog(deploymentId, 'Failed to create Render service', 'error');
      return { success: false, error: 'Failed to create Render service', platform: 'render' };
    }

    emitLog(deploymentId, `Service created: ${serviceId}`, 'info');
    emitLog(deploymentId, 'Waiting for deployment to complete...', 'info');

    // Poll deployment status
    let status = 'live';
    let attempts = 0;
    const maxAttempts = 60;

    while (status !== 'live' && status !== 'suspended') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const statusResponse = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        status = statusData.service?.serviceDetails?.healthCheckPath ? 'live' : 'building';
        emitLog(deploymentId, `Deployment status: ${status}`, 'info');
      }

      if (attempts >= maxAttempts) {
        emitLog(deploymentId, 'Deployment timeout', 'error');
        return { success: false, error: 'Deployment timeout', platform: 'render' };
      }
    }

    if (status === 'live') {
      const url = serviceData.service?.serviceDetails?.url || `https://${projectName}.onrender.com`;
      emitLog(deploymentId, `Deployment successful: ${url}`, 'success');
      return { success: true, deploymentId: serviceId, url, platform: 'render' };
    } else {
      emitLog(deploymentId, `Deployment failed with status: ${status}`, 'error');
      return { success: false, error: `Deployment failed: ${status}`, platform: 'render' };
    }
  } catch (error) {
    emitLog(deploymentId, `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', platform: 'render' };
  }
}

// ========== Deployment Queue Processing ==========

async function processDeploymentQueue() {
  if (isProcessingQueue || deployQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (deployQueue.length > 0) {
    const item = deployQueue.shift();
    if (!item) break;

    item.status = 'processing';
    item.startedAt = new Date().toISOString();

    // Update database
    if (deployDb) {
      deployDb
        .prepare('UPDATE deployments SET status = ?, started_at = ? WHERE id = ?')
        .run('processing', item.startedAt, item.id);
    }

    emitLog(item.id, `Processing deployment: ${item.config.platform}`, 'info');

    let result: DeployResult;

    switch (item.config.platform) {
      case 'vercel':
        result = await deployVercel(item.config, item.id);
        break;
      case 'railway':
        result = await deployRailway(item.config, item.id);
        break;
      case 'render':
        result = await deployRender(item.config, item.id);
        break;
      default:
        result = { success: false, error: 'Unknown platform', platform: item.config.platform };
    }

    item.result = result;
    item.status = result.success ? 'completed' : 'failed';
    item.completedAt = new Date().toISOString();

    // Update database
    if (deployDb) {
      deployDb
        .prepare(
          'UPDATE deployments SET status = ?, deployment_id = ?, url = ?, error = ?, completed_at = ? WHERE id = ?'
        )
        .run(
          item.status,
          result.deploymentId || null,
          result.url || null,
          result.error || null,
          item.completedAt,
          item.id
        );
    }

    emitLog(item.id, `Deployment ${result.success ? 'completed' : 'failed'}`, result.success ? 'success' : 'error');

    // Broadcast status update
    webContents.getAllWebContents().forEach((contents) => {
      if (!contents.isDestroyed()) {
        contents.send('deploy:status', {
          id: item.id,
          status: item.status,
          result,
        });
      }
    });
  }

  isProcessingQueue = false;
}

// ========== IPC Handlers ==========

// Token Management
ipcMain.handle('token:get', async (_event, platform: Platform) => {
  return await getToken(platform);
});

ipcMain.handle('token:set', async (_event, platform: Platform, token: string) => {
  return await setToken(platform, token);
});

// Deployment
ipcMain.handle('deploy:queue', async (_event, config: DeployConfig) => {
  const deploymentId = `deploy_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const item: QueueItem = {
    id: deploymentId,
    config,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  deployQueue.push(item);

  // Store in database
  if (deployDb) {
    deployDb
      .prepare(
        'INSERT INTO deployments (id, platform, repo_path, env_vars, project_name, branch, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        deploymentId,
        config.platform,
        config.repoPath,
        JSON.stringify(config.envVars),
        config.projectName || null,
        config.branch || null,
        'queued'
      );
  }

  // Start processing queue
  processDeploymentQueue().catch((error) => {
    console.error('Error processing deployment queue:', error);
  });

  return { success: true, deploymentId };
});

ipcMain.handle('deploy:status', async (_event, deploymentId: string) => {
  // Find in queue
  const queueItem = deployQueue.find((item) => item.id === deploymentId);
  if (queueItem) {
    return {
      id: queueItem.id,
      status: queueItem.status,
      result: queueItem.result,
      createdAt: queueItem.createdAt,
      startedAt: queueItem.startedAt,
      completedAt: queueItem.completedAt,
    };
  }

  // Find in database
  if (deployDb) {
    const row = deployDb.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId) as any;
    if (row) {
      return {
        id: row.id,
        status: row.status,
        result: {
          success: row.status === 'completed',
          deploymentId: row.deployment_id,
          url: row.url,
          error: row.error,
          platform: row.platform as Platform,
        },
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
      };
    }
  }

  return { success: false, error: 'Deployment not found' };
});

ipcMain.handle('deploy:logs', async (_event, deploymentId: string) => {
  if (deployDb) {
    const logs = deployDb
      .prepare('SELECT * FROM deployment_logs WHERE deployment_id = ? ORDER BY timestamp ASC')
      .all(deploymentId) as any[];

    return logs.map((log) => ({
      deploymentId: log.deployment_id,
      message: log.message,
      level: log.level,
      timestamp: log.timestamp,
    }));
  }
  return [];
});

ipcMain.handle('deploy:queue:list', async () => {
  const queueItems = [...deployQueue];

  if (deployDb) {
    const dbItems = deployDb.prepare('SELECT * FROM deployments ORDER BY created_at DESC LIMIT 100').all() as any[];
    dbItems.forEach((row) => {
      if (!queueItems.find((item) => item.id === row.id)) {
        queueItems.push({
          id: row.id,
          config: {
            platform: row.platform as Platform,
            repoPath: row.repo_path,
            envVars: JSON.parse(row.env_vars),
            projectName: row.project_name || undefined,
            branch: row.branch || undefined,
          },
          status: row.status as QueueItem['status'],
          result: row.deployment_id
            ? {
                success: row.status === 'completed',
                deploymentId: row.deployment_id,
                url: row.url || undefined,
                error: row.error || undefined,
                platform: row.platform as Platform,
              }
            : undefined,
          createdAt: row.created_at,
          startedAt: row.started_at || undefined,
          completedAt: row.completed_at || undefined,
        });
      }
    });
  }

  return queueItems;
});

ipcMain.handle('repo:clone', async (_event, repoUrl: string, targetPath?: string) => {
  try {
    const reposDir = path.join(app.getPath('userData'), 'repos');
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true });
    }

    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const clonePath = targetPath || path.join(reposDir, repoName);

    // Remove existing directory if it exists
    if (fs.existsSync(clonePath)) {
      fs.rmSync(clonePath, { recursive: true, force: true });
    }

    const git: SimpleGit = simpleGit();
    await git.clone(repoUrl, clonePath);

    return { success: true, path: clonePath };
  } catch (error) {
    console.error('Error cloning repo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('repo:analyzeFramework', async (_event, repoPath: string, repoUrl?: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      return { success: false, error: 'Repository path does not exist' };
    }

    const detection = FrameworkDetector.detect(repoPath);
    
    // Persist to SQLite
    if (repoUrl && db) {
      await db.saveAnalysis({
        repoUrl,
        repoPath,
        framework: detection.framework,
        scores: JSON.stringify(detection.scores),
        analyzedAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      framework: detection.framework,
      scores: detection.scores,
    };
  } catch (error) {
    console.error('Error analyzing framework:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  // Electron Forge webpack plugin automatically provides MAIN_WINDOW_WEBPACK_ENTRY
  // @ts-ignore - This is injected by Electron Forge webpack plugin
  if (typeof MAIN_WINDOW_WEBPACK_ENTRY !== 'undefined' && MAIN_WINDOW_WEBPACK_ENTRY) {
    // @ts-ignore
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
  if (deployDb) {
    deployDb.close();
  }
});

// In this file you can include the rest of your app's specific main process code.
// You can also put them in separate files and import them here.
