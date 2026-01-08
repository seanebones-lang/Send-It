import { contextBridge, ipcRenderer } from 'electron';

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
    start: (config?: unknown) => ipcRenderer.invoke('deploy:start', config),
    stop: () => ipcRenderer.invoke('deploy:stop'),
    status: () => ipcRenderer.invoke('deploy:status'),
    logs: () => ipcRenderer.invoke('deploy:logs'),
  },
});
