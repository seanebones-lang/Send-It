/**
 * URL-based sharing utilities
 * Encode/decode analysis results in URL for sharing
 */

import type { FrameworkAnalysisResult } from '../electron';
import type { Platform } from '../contexts/WizardContext';

export interface ShareableAnalysis {
  repoUrl: string;
  framework?: string;
  scores?: Record<string, number>;
  selectedPlatform?: Platform;
}

/**
 * Encode analysis to URL-safe base64
 */
export function encodeAnalysisToURL(analysis: ShareableAnalysis): string {
  try {
    const json = JSON.stringify(analysis);
    const base64 = btoa(json);
    // Make URL-safe
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return urlSafe;
  } catch (error) {
    console.error('[URL Sharing] Encode error:', error);
    return '';
  }
}

/**
 * Decode analysis from URL-safe base64
 */
export function decodeAnalysisFromURL(encoded: string): ShareableAnalysis | null {
  try {
    // Restore base64 format
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    return JSON.parse(json);
  } catch (error) {
    console.error('[URL Sharing] Decode error:', error);
    return null;
  }
}

/**
 * Create shareable URL with analysis
 */
export function createShareURL(analysis: ShareableAnalysis): string {
  const encoded = encodeAnalysisToURL(analysis);
  if (!encoded) return window.location.origin;
  
  const url = new URL(window.location.origin);
  url.searchParams.set('share', encoded);
  return url.toString();
}

/**
 * Get analysis from current URL
 */
export function getAnalysisFromURL(): ShareableAnalysis | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('share');
  
  if (!encoded) return null;
  
  return decodeAnalysisFromURL(encoded);
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareURLToClipboard(analysis: ShareableAnalysis): Promise<boolean> {
  try {
    const url = createShareURL(analysis);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('[URL Sharing] Clipboard error:', error);
    return false;
  }
}

/**
 * Check if current URL has shared analysis
 */
export function hasSharedAnalysis(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('share');
}

/**
 * Clear shared analysis from URL
 */
export function clearSharedAnalysisFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.toString());
}
