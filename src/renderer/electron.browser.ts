// Browser-compatible Electron API stub for Vercel/web deployment
// This allows the app to run in a browser environment

import type { ElectronAPI } from './electron';
import { cloneRepoBrowser, analyzeFrameworkBrowser } from './api/browserAPI';

const mockElectronAPI: ElectronAPI = {
  git: {
    status: async () => ({ error: 'Not available in browser' }),
    commit: async () => ({ error: 'Not available in browser' }),
    push: async () => ({ error: 'Not available in browser' }),
    pull: async () => ({ error: 'Not available in browser' }),
    branch: async () => ({ error: 'Not available in browser' }),
    log: async () => ({ error: 'Not available in browser' }),
  },
  deploy: {
    queue: async () => ({ success: false, error: 'Deployment not available in browser. Please use the Electron desktop app for full functionality.' }),
    status: async () => ({ success: false, error: 'Not available in browser' }),
    logs: async () => [],
    queueList: async () => [],
    onLog: () => () => {},
    onStatus: () => () => {},
  },
  token: {
    get: async () => ({ success: false, error: 'Token management not available in browser. Please use the Electron desktop app.' }),
    set: async () => ({ success: false, error: 'Token management not available in browser. Please use the Electron desktop app.' }),
    oauth: async () => ({ success: false, error: 'OAuth not available in browser. Please use the Electron desktop app.' }),
  },
  keychain: {
    check: async () => ({ success: false, hasPermission: false }),
  },
  repo: {
    clone: cloneRepoBrowser,
    analyzeFramework: analyzeFrameworkBrowser,
  },
};

// Check if we're in Electron or browser
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// Export the appropriate API
export const electronAPI: ElectronAPI = isElectron ? window.electronAPI : mockElectronAPI;

// Make it available globally for components that access it directly
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = mockElectronAPI;
}
