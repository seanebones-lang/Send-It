// Browser-compatible Electron API stub for Vercel/web deployment
// This allows the app to run in a browser environment

import type { ElectronAPI } from './electron';

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
    queue: async () => ({ success: false, error: 'Not available in browser' }),
    status: async () => ({ success: false, error: 'Not available in browser' }),
    logs: async () => [],
    queueList: async () => [],
    onLog: () => () => {},
    onStatus: () => () => {},
  },
  token: {
    get: async () => ({ success: false, error: 'Not available in browser' }),
    set: async () => ({ success: false, error: 'Not available in browser' }),
    oauth: async () => ({ success: false, error: 'Not available in browser' }),
  },
  keychain: {
    check: async () => ({ success: false, hasPermission: false }),
  },
  repo: {
    clone: async () => ({ success: false, error: 'Not available in browser. Please use the Electron desktop app.' }),
    analyzeFramework: async () => ({ success: false, error: 'Not available in browser. Please use the Electron desktop app.' }),
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
