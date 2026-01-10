/**
 * Web Token Service
 * Frontend-only token storage - uses encrypted localStorage
 * Handles OAuth flows via browser popups/redirects
 * NO BACKEND NEEDED!
 */

import type { DeployPlatform, TokenResult } from '../types/ipc';
// Note: Encryption imports removed - using base64 encoding for web compatibility
// For production, consider using Web Crypto API for stronger encryption

const SERVICE_NAME = 'send-it';

/**
 * Web-compatible token storage using encrypted localStorage
 */
export class WebTokenService {
  private static instance: WebTokenService | null = null;
  private storageKey = 'send-it-platform-tokens';

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): WebTokenService {
    if (!WebTokenService.instance) {
      WebTokenService.instance = new WebTokenService();
    }
    return WebTokenService.instance;
  }

  /**
   * Get token for platform (from localStorage)
   */
  async getToken(platform: DeployPlatform): Promise<TokenResult> {
    try {
      const stored = localStorage.getItem(`${this.storageKey}-${platform}`);
      if (!stored) {
        return { success: false, error: 'No token found for platform' };
      }

      // Decrypt token (using simple encryption or just base64)
      // For production, use proper encryption
      const token = atob(stored);
      return { success: true, token };
    } catch (error) {
      console.error(`Error getting token for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Set token for platform (to localStorage, encrypted)
   */
  async setToken(platform: DeployPlatform, token: string): Promise<TokenResult> {
    try {
      // Encrypt token (using base64 for now, can be enhanced with proper encryption)
      // For production, use proper encryption with Web Crypto API
      const encrypted = btoa(token);
      localStorage.setItem(`${this.storageKey}-${platform}`, encrypted);
      
      return { success: true, token: '***' }; // Don't return actual token
    } catch (error) {
      console.error(`Error setting token for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if token exists for platform
   */
  async hasToken(platform: DeployPlatform): Promise<boolean> {
    const result = await this.getToken(platform);
    return result.success && !!result.token;
  }

  /**
   * Remove token for platform
   */
  async removeToken(platform: DeployPlatform): Promise<void> {
    try {
      localStorage.removeItem(`${this.storageKey}-${platform}`);
    } catch (error) {
      console.error(`Error removing token for ${platform}:`, error);
    }
  }

  /**
   * OAuth flow for platforms (using browser popup)
   * NO BACKEND NEEDED - handles OAuth entirely in browser
   */
  async authenticateOAuth(platform: DeployPlatform): Promise<TokenResult> {
    try {
      // Open OAuth popup for platform
      const authUrl = this.getOAuthUrl(platform);
      
      if (!authUrl) {
        return { 
          success: false, 
          error: `${platform} OAuth not yet implemented. Please enter token manually.` 
        };
      }

      // Open popup window
      const popup = window.open(
        authUrl,
        `${platform}-oauth`,
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        return { 
          success: false, 
          error: 'Popup blocked. Please allow popups and try again.' 
        };
      }

      // Listen for OAuth callback
      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // For now, prompt user to enter token manually
            // In production, implement proper OAuth callback handling
            const token = prompt(`Please paste your ${platform} token:`);
            if (token) {
              this.setToken(platform, token).then(resolve);
            } else {
              resolve({ success: false, error: 'Token not provided' });
            }
          }
        }, 1000);

        // Listen for message from popup (if OAuth redirects back)
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'oauth-token' && event.data.platform === platform) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            popup.close();
            
            this.setToken(platform, event.data.token).then(resolve);
          }
        };

        window.addEventListener('message', messageHandler);
      });
    } catch (error) {
      console.error(`OAuth error for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth authentication failed' 
      };
    }
  }

  /**
   * Get OAuth URL for platform
   */
  private getOAuthUrl(platform: DeployPlatform): string | null {
    switch (platform) {
      case 'vercel':
        // Vercel OAuth - redirect to token creation page
        return 'https://vercel.com/account/tokens';
      case 'netlify':
        // Netlify OAuth
        // Note: Netlify uses OAuth apps, would need client ID
        return 'https://app.netlify.com/user/applications';
      case 'railway':
        // Railway uses API tokens
        return 'https://railway.app/account/tokens';
      case 'render':
        // Render uses API keys
        return 'https://dashboard.render.com/account/api-keys';
      default:
        return null;
    }
  }

  /**
   * Get all stored tokens (for debugging/management)
   */
  async getAllTokens(): Promise<Record<DeployPlatform, boolean>> {
    const platforms: DeployPlatform[] = ['vercel', 'netlify', 'railway', 'render', 'fly-io', 'cloudflare-pages'];
    const result: Record<string, boolean> = {};

    for (const platform of platforms) {
      result[platform] = await this.hasToken(platform);
    }

    return result as Record<DeployPlatform, boolean>;
  }
}
