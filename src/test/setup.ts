/**
 * Jest test setup file
 * Runs before each test file
 */

import '@testing-library/jest-dom';

// Mock Electron APIs
global.require = jest.fn();
global.process = {
  ...process,
  platform: 'darwin', // Mock macOS
  versions: {
    node: '20.0.0',
    electron: '28.0.0',
  },
} as any;

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getName: jest.fn(() => 'Send-It'),
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return '/tmp/send-it-test';
      return '/tmp';
    }),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      executeJavaScript: jest.fn(),
    },
    loadURL: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn(),
  },
  Notification: {
    isSupported: jest.fn(() => true),
  },
  dock: {
    setBadge: jest.fn(),
    bounce: jest.fn(),
  },
  nativeImage: {
    createFromPath: jest.fn(),
  },
}));

// Mock crypto for tests
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn((size: number) => Buffer.alloc(size, 0)),
  };
});

// Mock better-sqlite3 globally to prevent worker process issues
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
    close: jest.fn(),
  }));
});

// Suppress console errors in tests (optional - remove if you want to see them)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
