/**
 * Unit tests for TokenService
 * Tests secure token storage and retrieval
 */

import { TokenService } from './TokenService';

// Mock keytar
jest.mock('keytar', () => ({
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
}));

// Mock BrowserWindow
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    webContents: {
      executeJavaScript: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
    },
  })),
  app: {
    getName: jest.fn(() => 'Send-It'),
  },
}));

import * as keytar from 'keytar';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    // Reset singleton instance
    (TokenService as any).instance = null;
    tokenService = TokenService.getInstance();
    jest.clearAllMocks();
  });

  describe('checkKeychainPermission', () => {
    it('should return true when keychain access is granted', async () => {
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);

      const result = await tokenService.checkKeychainPermission();
      expect(result).toBe(true);
    });

    it('should return false when keychain access is denied', async () => {
      (keytar.setPassword as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await tokenService.checkKeychainPermission();
      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should retrieve token successfully', async () => {
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (keytar.getPassword as jest.Mock).mockResolvedValue('test-token');

      const result = await tokenService.getToken('vercel');

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
      expect(keytar.getPassword).toHaveBeenCalledWith('send-it', 'vercel-token');
    });

    it('should return error when token not found', async () => {
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (keytar.getPassword as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.getToken('vercel');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No token found');
    });

    it('should return error when keychain permission denied', async () => {
      (keytar.setPassword as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await tokenService.getToken('vercel');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Keychain permission denied');
    });
  });

  describe('setToken', () => {
    it('should store token successfully', async () => {
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);

      const result = await tokenService.setToken('vercel', 'test-token');

      expect(result.success).toBe(true);
      expect(result.token).toBe('***'); // Should not return actual token
      expect(keytar.setPassword).toHaveBeenCalledWith('send-it', 'vercel-token', 'test-token');
    });

    it('should return error when keychain permission denied', async () => {
      (keytar.setPassword as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await tokenService.setToken('vercel', 'test-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Keychain permission denied');
    });
  });

  describe('authenticateOAuth', () => {
    it('should handle OAuth authentication', async () => {
      // Mock BrowserWindow to trigger 'closed' event after a short delay
      const { BrowserWindow } = require('electron');
      const mockWindow = {
        loadURL: jest.fn(),
        show: jest.fn(),
        close: jest.fn(),
        on: jest.fn((event: string, callback: () => void) => {
          // Simulate window closing immediately for test
          if (event === 'closed') {
            setTimeout(() => callback(), 10);
          }
        }),
        webContents: {
          executeJavaScript: jest.fn().mockResolvedValue(undefined),
          send: jest.fn(),
          on: jest.fn((event: string, callback: () => void) => {
            if (event === 'did-finish-load') {
              setTimeout(() => callback(), 10);
            }
          }),
        },
      };
      (BrowserWindow as jest.Mock).mockImplementation(() => mockWindow);
      
      const resultPromise = tokenService.authenticateOAuth('vercel');
      
      // Wait for the promise to resolve (should be quick due to mocked close event)
      const result = await Promise.race([
        resultPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), 5000)
        ),
      ]) as any;
      
      // OAuth currently returns manual token entry needed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000); // Increase timeout to 10 seconds
  });
});
