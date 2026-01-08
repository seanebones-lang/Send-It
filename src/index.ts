import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { Database } from './database';
import { FrameworkDetector } from './frameworkDetector';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize database after app is ready
let db: Database | null = null;

app.whenReady().then(() => {
  db = new Database();
});

// IPC Handlers
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
  const mainWindow = new BrowserWindow({
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
});

// In this file you can include the rest of your app's specific main process code.
// You can also put them in separate files and import them here.
