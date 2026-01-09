/**
 * Token Management Service
 * 
 * Handles secure storage and retrieval of API tokens using OS keychain
 * Supports OAuth authentication flows for Vercel and Railway
 * 
 * @module services/TokenService
 */

import * as keytar from 'keytar';
import { BrowserWindow } from 'electron';
import type { DeployPlatform, TokenResult } from '../types/ipc';

const SERVICE_NAME = 'send-it';

/**
 * Service for managing API tokens securely
 */
export class TokenService {
  private static instance: TokenService | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Checks if keychain permissions are available
   * 
   * @returns True if keychain access is granted, false otherwise
   */
  async checkKeychainPermission(): Promise<boolean> {
    try {
      // Test write access to keychain
      await keytar.setPassword(SERVICE_NAME, '__test__', '__test__');
      await keytar.deletePassword(SERVICE_NAME, '__test__');
      return true;
    } catch (error) {
      console.error('Keychain permission check failed:', error);
      return false;
    }
  }

  /**
   * Retrieves a stored token for a platform
   * 
   * @param platform - Deployment platform
   * @returns Token result with success status and token (if available)
   */
  async getToken(platform: DeployPlatform): Promise<TokenResult> {
    try {
      // Check keychain permissions first
      const hasPermission = await this.checkKeychainPermission();
      if (!hasPermission) {
        return { 
          success: false, 
          error: 'Keychain permission denied. Please grant access in system preferences.' 
        };
      }

      const token = await keytar.getPassword(SERVICE_NAME, `${platform}-token`);
      if (!token) {
        return { success: false, error: 'No token found for platform' };
      }
      return { success: true, token };
    } catch (error) {
      console.error(`Error getting token for ${platform}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        return { 
          success: false, 
          error: 'Keychain access denied. Please grant access in system preferences.' 
        };
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Stores a token securely in the keychain
   * 
   * @param platform - Deployment platform
   * @param token - Token to store
   * @returns Token result with success status
   */
  async setToken(platform: DeployPlatform, token: string): Promise<TokenResult> {
    try {
      // Check keychain permissions first
      const hasPermission = await this.checkKeychainPermission();
      if (!hasPermission) {
        return { 
          success: false, 
          error: 'Keychain permission denied. Please grant access in system preferences.' 
        };
      }

      await keytar.setPassword(SERVICE_NAME, `${platform}-token`, token);
      return { success: true, token: '***' }; // Don't return actual token
    } catch (error) {
      console.error(`Error setting token for ${platform}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        return { 
          success: false, 
          error: 'Keychain access denied. Please grant access in system preferences.' 
        };
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Initiates OAuth authentication flow for a platform
   * Currently supports manual token entry for Vercel and Railway
   * 
   * @param platform - Platform to authenticate ('vercel' | 'railway')
   * @returns Token result with success status
   */
  async authenticateOAuth(platform: 'vercel' | 'railway'): Promise<TokenResult> {
    try {
      const result = await this.authenticateWithOAuth(platform);
      if (result.success && result.token) {
        return await this.setToken(platform, result.token);
      }
      return result;
    } catch (error) {
      console.error(`OAuth error for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth authentication failed' 
      };
    }
  }

  /**
   * Opens OAuth browser window for platform
   * 
   * @private
   */
  private async authenticateWithOAuth(platform: 'vercel' | 'railway'): Promise<TokenResult> {
    return new Promise((resolve) => {
      let authWindow: BrowserWindow | null = null;

      const cleanup = () => {
        if (authWindow) {
          authWindow.close();
          authWindow = null;
        }
      };

      authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let authUrl = '';

      if (platform === 'vercel') {
        // Vercel OAuth flow - redirect to create token page
        authUrl = 'https://vercel.com/account/tokens';
        // Note: Vercel requires manual token creation
      } else if (platform === 'railway') {
        // Railway uses API tokens - redirect to token creation page
        authUrl = 'https://railway.app/account/tokens';
      }

      authWindow.loadURL(authUrl);
      authWindow.show();

      // For Vercel and Railway, users need to manually copy tokens
      // Monitor for token creation completion
      let tokenSubmitted = false;

      // Inject script to detect token input
      authWindow.webContents.executeJavaScript(`
        (function() {
          const observer = new MutationObserver(() => {
            // Check if token is visible on page (simplified - would need platform-specific detection)
            const tokenElements = document.querySelectorAll('[data-token], .token, input[type="text"][value*=""]');
            if (tokenElements.length > 0) {
              window.postMessage({ type: 'token-ready' }, '*');
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        })();
      `);

      // Listen for messages from injected script
      authWindow.webContents.on('did-finish-load', () => {
        authWindow?.webContents.send('show-token-input');
      });

      // For manual token entry, we'll prompt user after window closes
      authWindow.on('closed', () => {
        cleanup();
        // Return a special flag indicating manual token entry needed
        resolve({ 
          success: false, 
          error: 'Please copy your token from the opened page and enter it manually' 
        });
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!tokenSubmitted) {
          cleanup();
          resolve({ success: false, error: 'Authentication timeout' });
        }
      }, 300000);
    });
  }
}
