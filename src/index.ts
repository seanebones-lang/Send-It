import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { Database as OldDatabase } from './database';
import { FrameworkDetector } from './frameworkDetector';
import type { DeployConfig, TokenResult } from './types/ipc';
import {
  TokenService,
  LogService,
  NotificationService,
  DatabaseService,
  DeploymentService,
  QueueService,
} from './services';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Service instances (initialized in app.whenReady())
let db: OldDatabase | null = null;
let mainWindow: BrowserWindow | null = null;

// Service singletons
let tokenService: TokenService;
let logService: LogService;
let notificationService: NotificationService;
let databaseService: DatabaseService;
let deploymentService: DeploymentService;
let queueService: QueueService;

// Global reference for menu bar (updated after initialization)
let globalNotificationService: NotificationService | null = null;

// Note: Notification and dock badge functions moved to NotificationService

// Create macOS menu bar
function createMenuBar() {
  if (process.platform !== 'darwin') {
    return;
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' as const, label: `About ${app.getName()}` },
        { type: 'separator' },
        { role: 'services' as const, submenu: [] },
        { type: 'separator' },
        { role: 'hide' as const, label: `Hide ${app.getName()}` },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' },
        { role: 'quit' as const, label: `Quit ${app.getName()}` },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Deployment',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:new-deployment');
            }
          },
        },
        { type: 'separator' },
        { role: 'close' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Deployments',
      submenu: [
        {
          label: 'View Queue',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:view-queue');
            }
          },
        },
        {
          label: 'Deployment History',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:view-history');
            }
          },
        },
        { type: 'separator' },
        {
          label: `Active Deployments: ${globalNotificationService?.getActiveDeployCount() || 0}`,
          enabled: false,
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { type: 'separator' },
        { role: 'front' as const },
        { type: 'separator' },
        { role: 'window' as const },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/seanebones-lang/Send-It');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/seanebones-lang/Send-It/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Note: Keychain permission check moved to TokenService

// Note: Token management, OAuth, and log streaming moved to services

// Note: Deployment functions and queue processing moved to DeploymentService and QueueService

// ========== IPC Handlers ==========
// Note: IPC handlers use service singletons which are initialized in app.whenReady()
// Handlers are safe because they won't be called until the app is ready

// Token Management
ipcMain.handle('token:get', async (_event, platform) => {
  return await TokenService.getInstance().getToken(platform);
});

ipcMain.handle('token:set', async (_event, platform, token: string) => {
  return await TokenService.getInstance().setToken(platform, token);
});

ipcMain.handle('token:oauth', async (_event, platform: 'vercel' | 'railway') => {
  return await TokenService.getInstance().authenticateOAuth(platform);
});

ipcMain.handle('keychain:check', async () => {
  const hasPermission = await TokenService.getInstance().checkKeychainPermission();
  return { success: hasPermission, hasPermission };
});

// Deployment
ipcMain.handle('deploy:queue', async (_event, config: DeployConfig) => {
  try {
    const deploymentId = await QueueService.getInstance().queueDeployment(config);
    return { success: true, deploymentId };
  } catch (error) {
    console.error('Error queueing deployment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('deploy:status', async (_event, deploymentId: string) => {
  const item = await QueueService.getInstance().getDeployment(deploymentId);
  if (item) {
    return {
      id: item.id,
      status: item.status,
      result: item.result,
      createdAt: item.createdAt,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
    };
  }
  return { success: false, error: 'Deployment not found' };
});

ipcMain.handle('deploy:logs', async (_event, deploymentId: string) => {
  return LogService.getInstance().getLogs(deploymentId);
});

ipcMain.handle('deploy:queue:list', async () => {
  return await QueueService.getInstance().getAllDeployments();
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
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: process.platform === 'darwin' 
      ? path.join(__dirname, '../assets/icon.icns')
      : path.join(__dirname, '../assets/icon.png'),
  });

  // Set up menu bar on macOS
  if (process.platform === 'darwin') {
    createMenuBar();
    
    // Update menu bar periodically with deployment count
    setInterval(() => {
      createMenuBar(); // Rebuild menu to update deployment count
    }, 5000);
  }

  // and load the index.html of the app.
  // Electron Forge webpack plugin automatically provides MAIN_WINDOW_WEBPACK_ENTRY
  // @ts-ignore - This is injected by Electron Forge webpack plugin
  if (typeof MAIN_WINDOW_WEBPACK_ENTRY !== 'undefined' && MAIN_WINDOW_WEBPACK_ENTRY) {
    // @ts-ignore
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }

  // Open the DevTools only in development mode
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize old database for framework analysis
  db = new OldDatabase();
  
  // Initialize services
  databaseService = DatabaseService.getInstance();
  databaseService.initialize();
  
  logService = LogService.getInstance();
  logService.initialize(databaseService.getDb()!);
  
  tokenService = TokenService.getInstance();
  
  notificationService = NotificationService.getInstance();
  
  deploymentService = DeploymentService.getInstance();
  deploymentService.setLogService(logService);
  
  queueService = QueueService.getInstance();
  await queueService.initialize({ maxConcurrent: 3, parallel: true });
  
  // Create window
  mainWindow = createWindow();
  
  // Initialize notification service with main window
  notificationService.initialize(mainWindow);
  globalNotificationService = notificationService;
  
  // Update menu bar with deployment count
  if (process.platform === 'darwin') {
    createMenuBar();
    // Update menu bar periodically with deployment count
    setInterval(() => {
      createMenuBar(); // Rebuild menu to update deployment count
    }, 5000);
  }
  
  // Initialize dock badge on macOS
  if (process.platform === 'darwin') {
    notificationService.updateDockBadge();
  }
});

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
  if (databaseService) {
    databaseService.close();
  }
});

// In this file you can include the rest of your app's specific main process code.
// You can also put them in separate files and import them here.
