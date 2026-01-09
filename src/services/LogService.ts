/**
 * Log Management Service
 * 
 * Handles deployment log streaming, storage, and retrieval
 * Broadcasts logs to all renderer processes and stores in database
 * 
 * @module services/LogService
 */

import { webContents } from 'electron';
import Database from 'better-sqlite3';
import type { LogMessage } from '../types/ipc';

/**
 * Service for managing deployment logs
 */
export class LogService {
  private static instance: LogService | null = null;
  private deployDb: Database | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  /**
   * Initialize the log service with database connection
   * 
   * @param db - Better-sqlite3 database instance
   */
  initialize(db: Database): void {
    this.deployDb = db;
  }

  /**
   * Emits a log message to all renderer processes and stores in database
   * 
   * @param deploymentId - Deployment ID
   * @param message - Log message
   * @param level - Log level (info, warn, error, success)
   */
  emitLog(deploymentId: string, message: string, level: LogMessage['level'] = 'info'): void {
    const logMessage: LogMessage = {
      deploymentId,
      message,
      level,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all renderer processes
    webContents.getAllWebContents().forEach((contents) => {
      if (!contents.isDestroyed()) {
        contents.send('deploy:log', logMessage);
      }
    });

    // Store in database
    if (this.deployDb) {
      try {
        this.deployDb
          .prepare('INSERT INTO deployment_logs (deployment_id, message, level) VALUES (?, ?, ?)')
          .run(deploymentId, message, level);
      } catch (error) {
        console.error('Error storing log:', error);
      }
    }
  }

  /**
   * Retrieves logs for a deployment
   * 
   * @param deploymentId - Deployment ID
   * @returns Array of log messages
   */
  getLogs(deploymentId: string): LogMessage[] {
    if (!this.deployDb) {
      return [];
    }

    try {
      const logs = this.deployDb
        .prepare('SELECT * FROM deployment_logs WHERE deployment_id = ? ORDER BY timestamp ASC')
        .all(deploymentId) as any[];

      return logs.map((log) => ({
        deploymentId: log.deployment_id,
        message: log.message,
        level: log.level,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }

  /**
   * Cleans up old logs (optional - for maintenance)
   * 
   * @param olderThanDays - Number of days to keep logs (default: 30)
   */
  cleanupOldLogs(olderThanDays: number = 30): void {
    if (!this.deployDb) {
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      this.deployDb
        .prepare('DELETE FROM deployment_logs WHERE timestamp < ?')
        .run(cutoffDate.toISOString());
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }
}
