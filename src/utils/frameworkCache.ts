/**
 * Framework Detection Cache
 * 
 * Caches framework detection results to avoid repeated analysis of the same repository
 * Uses repository hash for cache key to detect changes
 * 
 * @module utils/frameworkCache
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { FrameworkDetection } from '../frameworkDetector';
import type { AnalysisPlatform } from '../types/ipc';

/**
 * Cache entry structure
 */
interface CacheEntry {
  framework: string;
  scores: Record<AnalysisPlatform, number>;
  repoHash: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Framework detection cache with TTL
 */
class FrameworkCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours default

  /**
   * Calculates hash of repository contents for cache key
   * 
   * @param repoPath - Repository path
   * @returns Repository hash
   */
  private calculateRepoHash(repoPath: string): string {
    try {
      // Hash key files to detect changes
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageLockPath = path.join(repoPath, 'package-lock.json');
      const yarnLockPath = path.join(repoPath, 'yarn.lock');
      const pnpmLockPath = path.join(repoPath, 'pnpm-lock.yaml');

      const filesToHash: string[] = [];
      
      if (fs.existsSync(packageJsonPath)) {
        filesToHash.push(fs.readFileSync(packageJsonPath, 'utf-8'));
      }
      if (fs.existsSync(packageLockPath)) {
        filesToHash.push(fs.readFileSync(packageLockPath, 'utf-8'));
      }
      if (fs.existsSync(yarnLockPath)) {
        filesToHash.push(fs.readFileSync(yarnLockPath, 'utf-8'));
      }
      if (fs.existsSync(pnpmLockPath)) {
        filesToHash.push(fs.readFileSync(pnpmLockPath, 'utf-8'));
      }

      // Hash the combined content
      const content = filesToHash.join('\n');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      // If we can't hash, return a timestamp-based key
      console.error('Error calculating repo hash:', error);
      return crypto.createHash('sha256').update(`${repoPath}:${Date.now()}`).digest('hex');
    }
  }

  /**
   * Gets cached framework detection result
   * 
   * @param repoPath - Repository path
   * @returns Cached result or null if not found/expired
   */
  get(repoPath: string): FrameworkDetection | null {
    const repoHash = this.calculateRepoHash(repoPath);
    const entry = this.cache.get(repoPath);

    if (!entry) {
      return null;
    }

    // Check if cache entry matches current repo hash
    if (entry.repoHash !== repoHash) {
      // Repo has changed, invalidate cache
      this.cache.delete(repoPath);
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove entry
      this.cache.delete(repoPath);
      return null;
    }

    // Return cached result
    return {
      framework: entry.framework,
      scores: entry.scores,
    };
  }

  /**
   * Sets cached framework detection result
   * 
   * @param repoPath - Repository path
   * @param result - Framework detection result
   * @param ttl - Time to live in milliseconds (optional, defaults to 24 hours)
   */
  set(repoPath: string, result: FrameworkDetection, ttl?: number): void {
    const repoHash = this.calculateRepoHash(repoPath);
    const entry: CacheEntry = {
      framework: result.framework,
      scores: result.scores,
      repoHash,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(repoPath, entry);
  }

  /**
   * Invalidates cache for a repository
   * 
   * @param repoPath - Repository path
   */
  invalidate(repoPath: string): void {
    this.cache.delete(repoPath);
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cleans up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [repoPath, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(repoPath);
      }
    }
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }

  /**
   * Sets default TTL for new cache entries
   * 
   * @param ttl - Time to live in milliseconds
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// Singleton instance
let cacheInstance: FrameworkCache | null = null;

/**
 * Gets the framework cache singleton instance
 * 
 * @returns Framework cache instance
 */
export function getFrameworkCache(): FrameworkCache {
  if (!cacheInstance) {
    cacheInstance = new FrameworkCache();
  }
  return cacheInstance;
}
