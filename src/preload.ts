import { contextBridge, ipcRenderer } from 'electron';
import type { DeployConfig, Platform, QueueItem, LogMessage } from './types/ipc';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  git: {
    // Git-related IPC methods
    status: () => ipcRenderer.invoke('git:status'),
    commit: (message: string) => ipcRenderer.invoke('git:commit', message),
    push: () => ipcRenderer.invoke('git:push'),
    pull: () => ipcRenderer.invoke('git:pull'),
    branch: () => ipcRenderer.invoke('git:branch'),
    log: (options?: { limit?: number }) => ipcRenderer.invoke('git:log', options),
  },
  deploy: {
    // Deploy-related IPC methods
    queue: (config: DeployConfig) => ipcRenderer.invoke('deploy:queue', config),
    status: (deploymentId: string) => ipcRenderer.invoke('deploy:status', deploymentId),
    logs: (deploymentId: string) => ipcRenderer.invoke('deploy:logs', deploymentId),
    queueList: () => ipcRenderer.invoke('deploy:queue:list'),
    onLog: (callback: (log: LogMessage) => void) => {
      ipcRenderer.on('deploy:log', (_event, log: LogMessage) => callback(log));
      return () => ipcRenderer.removeAllListeners('deploy:log');
    },
    onStatus: (callback: (data: { id: string; status: string; result?: unknown }) => void) => {
      ipcRenderer.on('deploy:status', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('deploy:status');
    },
  },
  token: {
    // Token management IPC methods
    get: (platform: Platform) => ipcRenderer.invoke('token:get', platform),
    set: (platform: Platform, token: string) => ipcRenderer.invoke('token:set', platform, token),
    oauth: (platform: 'vercel' | 'railway') => ipcRenderer.invoke('token:oauth', platform),
  },
  keychain: {
    // Keychain permission check
    check: () => ipcRenderer.invoke('keychain:check'),
  },
  repo: {
    // Repository-related IPC methods
    clone: (repoUrl: string, targetPath?: string) => ipcRenderer.invoke('repo:clone', repoUrl, targetPath),
    analyzeFramework: (repoPath: string, repoUrl?: string) => ipcRenderer.invoke('repo:analyzeFramework', repoPath, repoUrl),
  },
});
