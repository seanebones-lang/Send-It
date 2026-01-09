/**
 * Notification Service
 * 
 * Handles system notifications and UI updates (dock badges, etc.)
 * 
 * @module services/NotificationService
 */

import { app, BrowserWindow, Notification, dock } from 'electron';
import * as path from 'path';

/**
 * Service for managing notifications and UI feedback
 */
export class NotificationService {
  private static instance: NotificationService | null = null;
  private mainWindow: BrowserWindow | null = null;
  private activeDeployCount: number = 0;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service with main window reference
   * 
   * @param window - Main browser window
   */
  initialize(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Updates the dock badge with active deployment count
   */
  updateDockBadge(): void {
    if (process.platform === 'darwin' && dock) {
      if (this.activeDeployCount > 0) {
        dock.setBadge(this.activeDeployCount.toString());
      } else {
        dock.setBadge('');
      }
    }
  }

  /**
   * Sets the active deployment count
   * 
   * @param count - Number of active deployments
   */
  setActiveDeployCount(count: number): void {
    this.activeDeployCount = count;
    this.updateDockBadge();
  }

  /**
   * Increments the active deployment count
   */
  incrementActiveDeployCount(): void {
    this.activeDeployCount++;
    this.updateDockBadge();
  }

  /**
   * Decrements the active deployment count
   */
  decrementActiveDeployCount(): void {
    if (this.activeDeployCount > 0) {
      this.activeDeployCount--;
      this.updateDockBadge();
    }
  }

  /**
   * Sends a system notification
   * 
   * @param title - Notification title
   * @param message - Notification message
   * @param status - Notification status (success, error, info)
   */
  sendNotification(title: string, message: string, status: 'success' | 'error' | 'info' = 'info'): void {
    if (!Notification.isSupported()) {
      console.log(`Notification: ${title} - ${message}`);
      return;
    }

    const notification = new Notification({
      title,
      body: message,
      icon: process.platform === 'darwin'
        ? path.join(__dirname, '../assets/icon.icns')
        : path.join(__dirname, '../assets/icon.png'),
      sound: status !== 'error',
      urgency: status === 'error' ? 'critical' : status === 'success' ? 'normal' : 'low',
    });

    notification.on('click', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    notification.show();

    // Bounce dock on macOS for errors
    if (process.platform === 'darwin' && dock && status === 'error') {
      dock.bounce('critical');
    }
  }

  /**
   * Gets the current active deployment count
   * 
   * @returns Current active deployment count
   */
  getActiveDeployCount(): number {
    return this.activeDeployCount;
  }
}
