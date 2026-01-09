/**
 * Unit tests for NotificationService
 * Tests notifications and UI feedback
 */

import { NotificationService } from './NotificationService';

// Mock Electron APIs
jest.mock('electron', () => ({
  app: {
    getName: jest.fn(() => 'Send-It'),
  },
  Notification: {
    isSupported: jest.fn(() => true),
  },
  dock: {
    setBadge: jest.fn(),
    bounce: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    focus: jest.fn(),
  })),
}));

import { Notification, dock } from 'electron';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockWindow: any;

  beforeEach(() => {
    // Reset singleton instance
    (NotificationService as any).instance = null;
    notificationService = NotificationService.getInstance();
    mockWindow = {
      show: jest.fn(),
      focus: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with main window', () => {
      notificationService.initialize(mockWindow);
      // Window is stored internally, test by checking behavior
      notificationService.sendNotification('Test', 'Message', 'info');
      // Should not throw
    });
  });

  describe('dock badge', () => {
    it('should update dock badge with count', () => {
      const originalPlatform = process.platform;
      (process as any).platform = 'darwin';

      notificationService.setActiveDeployCount(5);
      notificationService.updateDockBadge();

      expect(dock.setBadge).toHaveBeenCalledWith('5');

      (process as any).platform = originalPlatform;
    });

    it('should clear dock badge when count is zero', () => {
      const originalPlatform = process.platform;
      (process as any).platform = 'darwin';

      notificationService.setActiveDeployCount(0);
      notificationService.updateDockBadge();

      expect(dock.setBadge).toHaveBeenCalledWith('');

      (process as any).platform = originalPlatform;
    });

    it('should increment active deploy count', () => {
      notificationService.setActiveDeployCount(0);
      notificationService.incrementActiveDeployCount();
      expect(notificationService.getActiveDeployCount()).toBe(1);
    });

    it('should decrement active deploy count', () => {
      notificationService.setActiveDeployCount(5);
      notificationService.decrementActiveDeployCount();
      expect(notificationService.getActiveDeployCount()).toBe(4);
    });

    it('should not decrement below zero', () => {
      notificationService.setActiveDeployCount(0);
      notificationService.decrementActiveDeployCount();
      expect(notificationService.getActiveDeployCount()).toBe(0);
    });
  });

  describe('sendNotification', () => {
    it('should send notification when supported', () => {
      const mockNotification = {
        on: jest.fn(),
        show: jest.fn(),
      };
      (Notification as any).mockImplementation(() => mockNotification);

      notificationService.initialize(mockWindow);
      notificationService.sendNotification('Test Title', 'Test Message', 'info');

      expect(Notification).toHaveBeenCalled();
      expect(mockNotification.show).toHaveBeenCalled();
      expect(mockNotification.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should log notification when not supported', () => {
      const originalConsoleLog = console.log;
      const mockConsoleLog = jest.fn();
      console.log = mockConsoleLog;

      (Notification.isSupported as jest.Mock).mockReturnValue(false);

      notificationService.sendNotification('Test', 'Message', 'info');

      expect(mockConsoleLog).toHaveBeenCalledWith('Notification: Test - Message');

      console.log = originalConsoleLog;
    });

    it('should bounce dock on error on macOS', () => {
      const originalPlatform = process.platform;
      (process as any).platform = 'darwin';

      const mockNotification = {
        on: jest.fn(),
        show: jest.fn(),
      };
      (Notification as any).mockImplementation(() => mockNotification);

      notificationService.sendNotification('Error', 'Message', 'error');

      expect(dock.bounce).toHaveBeenCalledWith('critical');

      (process as any).platform = originalPlatform;
    });

    it('should focus window on notification click', () => {
      const mockNotification = {
        on: jest.fn((event, callback) => {
          if (event === 'click') {
            callback();
          }
        }),
        show: jest.fn(),
      };
      (Notification as any).mockImplementation(() => mockNotification);

      notificationService.initialize(mockWindow);
      notificationService.sendNotification('Test', 'Message', 'info');

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });
});
