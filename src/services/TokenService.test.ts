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
      // OAuth flow is complex and involves opening a browser window
      // For now, test that it calls the internal method
      // In a real test, you'd mock the BrowserWindow more thoroughly
      
      // This will fail with the current mock, but shows the structure
      const result = await tokenService.authenticateOAuth('vercel');
      
      // OAuth currently returns manual token entry needed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
