/**
 * Database Service
 * 
 * Handles all database operations for deployments and logs
 * Uses better-sqlite3 for synchronous, high-performance database access
 * 
 * @module services/DatabaseService
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import type { QueueItem, DeployConfig, DeployResult, DeployPlatform } from '../types/ipc';
import { encryptEnvVars, decryptEnvVars } from '../utils/encryption';
import { startTimer } from '../utils/performanceMonitor';

/**
 * Cache entry for query results
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Service for managing database operations
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private deployDb: Database | null = null;
  private dbPath: string;
  
  // Query result cache with TTL
  private queryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultCacheTTL: number = 30 * 1000; // 30 seconds default TTL

  private constructor() {
    // Private constructor for singleton pattern
    this.dbPath = path.join(app.getPath('userData'), 'deployments.db');
    
    // Cleanup expired cache entries every 60 seconds
    setInterval(() => this.cleanupExpiredCache(), 60 * 1000);
  }

  /**
   * Gets a cached result or executes the query and caches it
   */
  private async getCachedOrExecute<T>(cacheKey: string, queryFn: () => T | Promise<T>, ttl: number = this.defaultCacheTTL): Promise<T> {
    const cached = this.queryCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
    
    const data = await Promise.resolve(queryFn());
    this.queryCache.set(cacheKey, {
      data,
      expiresAt: now + ttl,
    });
    
    return data;
  }

  /**
   * Invalidates cache entries matching the pattern
   */
  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.queryCache.clear();
    } else {
      // Clear matching cache keys
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    }
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database service
   * Creates tables and indexes if they don't exist
   */
  initialize(): void {
    this.deployDb = new Database(this.dbPath);
    
    // Create deployments table with indexes for performance
    this.deployDb.exec(`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        env_vars TEXT NOT NULL,
        project_name TEXT,
        branch TEXT,
        status TEXT NOT NULL,
        deployment_id TEXT,
        url TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME
      );
      
      CREATE TABLE IF NOT EXISTS deployment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deployment_id TEXT NOT NULL,
        message TEXT NOT NULL,
        level TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
      CREATE INDEX IF NOT EXISTS idx_deployments_platform ON deployments(platform);
      CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_deployments_deployment_id ON deployments(deployment_id);
      CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
      CREATE INDEX IF NOT EXISTS idx_deployment_logs_timestamp ON deployment_logs(timestamp DESC);
    `);
  }

  /**
   * Gets the database instance
   * 
   * @returns Database instance or null if not initialized
   */
  getDb(): Database | null {
    return this.deployDb;
  }

  /**
   * Saves a deployment to the database
   * Invalidates cache on write operations
   * 
   * @param deploymentId - Deployment ID
   * @param config - Deployment configuration
   * @param status - Deployment status
   */
  async saveDeployment(
    deploymentId: string,
    config: DeployConfig,
    status: 'queued' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    if (!this.deployDb) {
      throw new Error('Database not initialized');
    }

    // Encrypt env vars before storing
    const encryptedEnvVars = await encryptEnvVars(config.envVars);

    this.deployDb
      .prepare(
        'INSERT INTO deployments (id, platform, repo_path, env_vars, project_name, branch, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        deploymentId,
        config.platform,
        config.repoPath,
        JSON.stringify(encryptedEnvVars),
        config.projectName || null,
        config.branch || null,
        status
      );

    // Invalidate cache on write
    this.invalidateCache();
  }

  /**
   * Updates deployment status
   * Invalidates cache on updates
   * 
   * @param deploymentId - Deployment ID
   * @param status - New status
   * @param startedAt - Optional start time
   */
  updateDeploymentStatus(
    deploymentId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    startedAt?: string
  ): void {
    if (!this.deployDb) {
      return;
    }

    if (startedAt) {
      this.deployDb
        .prepare('UPDATE deployments SET status = ?, started_at = ? WHERE id = ?')
        .run(status, startedAt, deploymentId);
    } else {
      this.deployDb
        .prepare('UPDATE deployments SET status = ? WHERE id = ?')
        .run(status, deploymentId);
    }

    // Invalidate cache on update
    this.invalidateCache();
  }

  /**
   * Updates deployment result
   * Invalidates cache on updates
   * 
   * @param deploymentId - Deployment ID
   * @param result - Deployment result
   * @param completedAt - Completion time
   */
  updateDeploymentResult(
    deploymentId: string,
    result: DeployResult,
    completedAt: string
  ): void {
    if (!this.deployDb) {
      return;
    }

    const status = result.success ? 'completed' : 'failed';

    this.deployDb
      .prepare(
        'UPDATE deployments SET status = ?, deployment_id = ?, url = ?, error = ?, completed_at = ? WHERE id = ?'
      )
      .run(
        status,
        result.deploymentId || null,
        result.url || null,
        result.error || null,
        completedAt,
        deploymentId
      );

    // Invalidate cache on update
    this.invalidateCache();
  }

  /**
   * Gets a deployment by ID
   * 
   * @param deploymentId - Deployment ID
   * @returns QueueItem or null if not found
   */
  async getDeployment(deploymentId: string): Promise<QueueItem | null> {
    if (!this.deployDb) {
      return null;
    }

    const row = this.deployDb
      .prepare('SELECT * FROM deployments WHERE id = ?')
      .get(deploymentId) as any;

    if (!row) {
      return null;
    }

    // Decrypt env vars
    let envVars: Record<string, string> = {};
    try {
      envVars = await decryptEnvVars(JSON.parse(row.env_vars));
    } catch (error) {
      console.error('Error decrypting env vars:', error);
    }

    return {
      id: row.id,
      config: {
        platform: row.platform as DeployPlatform,
        repoPath: row.repo_path,
        envVars,
        projectName: row.project_name || undefined,
        branch: row.branch || undefined,
      },
      status: row.status as QueueItem['status'],
      result: row.deployment_id
        ? {
            success: row.status === 'completed',
            deploymentId: row.deployment_id,
            url: row.url || undefined,
            error: row.error || undefined,
            platform: row.platform as DeployPlatform,
          }
        : undefined,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
    };
  }

  /**
   * Gets all deployments with pagination
   * 
   * @param limit - Maximum number of deployments to return (default: 100)
   * @param offset - Number of deployments to skip (default: 0)
   * @returns Array of deployment items
   */
  async getAllDeployments(limit: number = 100, offset: number = 0): Promise<QueueItem[]> {
    if (!this.deployDb) {
      return [];
    }

    const cacheKey = `getAllDeployments:${limit}:${offset}`;
    return this.getCachedOrExecute(cacheKey, async () => {
      const rows = this.deployDb!
        .prepare('SELECT * FROM deployments ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(limit, offset) as any[];

      // Decrypt all env vars in parallel
      const decryptedRows = await Promise.all(rows.map(async (row) => {
      // Decrypt env vars
      let envVars: Record<string, string> = {};
      try {
        envVars = await decryptEnvVars(JSON.parse(row.env_vars));
      } catch (error) {
        console.error('Error decrypting env vars:', error);
      }

      return {
        id: row.id,
        config: {
          platform: row.platform as DeployPlatform,
          repoPath: row.repo_path,
          envVars,
          projectName: row.project_name || undefined,
          branch: row.branch || undefined,
        },
        status: row.status as QueueItem['status'],
        result: row.deployment_id
          ? {
              success: row.status === 'completed',
              deploymentId: row.deployment_id,
              url: row.url || undefined,
              error: row.error || undefined,
              platform: row.platform as DeployPlatform,
            }
          : undefined,
        createdAt: row.created_at,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
      };
      }));
      return decryptedRows;
    });
  }

  /**
   * Gets deployments by status
   * 
   * @param status - Status to filter by
   * @returns Array of deployment items
   */
  async getDeploymentsByStatus(status: 'queued' | 'processing' | 'completed' | 'failed'): Promise<QueueItem[]> {
    if (!this.deployDb) {
      return [];
    }

    const cacheKey = `getDeploymentsByStatus:${status}`;
    return this.getCachedOrExecute(cacheKey, async () => {
      const rows = this.deployDb!
        .prepare('SELECT * FROM deployments WHERE status = ? ORDER BY created_at DESC')
        .all(status) as any[];

      // Decrypt all env vars in parallel
      const decryptedRows = await Promise.all(rows.map(async (row) => {
      // Decrypt env vars
      let envVars: Record<string, string> = {};
      try {
        envVars = await decryptEnvVars(JSON.parse(row.env_vars));
      } catch (error) {
        console.error('Error decrypting env vars:', error);
      }

      return {
        id: row.id,
        config: {
          platform: row.platform as DeployPlatform,
          repoPath: row.repo_path,
          envVars,
          projectName: row.project_name || undefined,
          branch: row.branch || undefined,
        },
        status: row.status as QueueItem['status'],
        result: row.deployment_id
          ? {
              success: row.status === 'completed',
              deploymentId: row.deployment_id,
              url: row.url || undefined,
              error: row.error || undefined,
              platform: row.platform as DeployPlatform,
            }
          : undefined,
        createdAt: row.created_at,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
      };
      }));
      return decryptedRows;
    });
  }

  /**
   * Closes the database connection
   */
  close(): void {
    if (this.deployDb) {
      this.deployDb.close();
      this.deployDb = null;
    }
    this.queryCache.clear();
  }
}
