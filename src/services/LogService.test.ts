/**
 * Unit tests for LogService
 * Tests log streaming and storage
 */

import { LogService } from './LogService';
import Database from 'better-sqlite3';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn(() => ({
      run: jest.fn(),
      all: jest.fn(() => []),
    })),
  }));
});

// Mock webContents
jest.mock('electron', () => ({
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

describe('LogService', () => {
  let logService: LogService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    // Reset singleton instance
    (LogService as any).instance = null;
    logService = LogService.getInstance();
    mockDb = new Database(':memory:') as jest.Mocked<Database>;
    logService.initialize(mockDb);
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with database', () => {
      expect(logService).toBeDefined();
      // Database is set internally, so we can't directly check it
      // But emitLog should work after initialization
    });
  });

  describe('emitLog', () => {
    it('should emit log and store in database', () => {
      const mockPrepare = jest.fn(() => ({
        run: jest.fn(),
      }));
      mockDb.prepare = mockPrepare;

      logService.emitLog('deployment-123', 'Test log message', 'info');

      expect(mockPrepare).toHaveBeenCalledWith(
        'INSERT INTO deployment_logs (deployment_id, message, level) VALUES (?, ?, ?)'
      );
    });

    it('should handle database errors gracefully', () => {
      const mockPrepare = jest.fn(() => ({
        run: jest.fn(() => {
          throw new Error('Database error');
        }),
      }));
      mockDb.prepare = mockPrepare;

      // Should not throw
      expect(() => {
        logService.emitLog('deployment-123', 'Test log', 'info');
      }).not.toThrow();
    });

    it('should handle missing database', () => {
      const service = LogService.getInstance();
      // Don't initialize database

      // Should not throw
      expect(() => {
        service.emitLog('deployment-123', 'Test log', 'info');
      }).not.toThrow();
    });
  });

  describe('getLogs', () => {
    it('should retrieve logs from database', () => {
      const mockLogs = [
        {
          deployment_id: 'deployment-123',
          message: 'Log message 1',
          level: 'info',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
        {
          deployment_id: 'deployment-123',
          message: 'Log message 2',
          level: 'error',
          timestamp: '2026-01-01T00:01:00.000Z',
        },
      ];

      const mockPrepare = jest.fn(() => ({
        all: jest.fn(() => mockLogs),
      }));
      mockDb.prepare = mockPrepare;

      const logs = logService.getLogs('deployment-123');

      expect(logs).toHaveLength(2);
      expect(logs[0].deploymentId).toBe('deployment-123');
      expect(logs[0].message).toBe('Log message 1');
      expect(logs[0].level).toBe('info');
      expect(logs[1].level).toBe('error');
    });

    it('should return empty array when no logs found', () => {
      const mockPrepare = jest.fn(() => ({
        all: jest.fn(() => []),
      }));
      mockDb.prepare = mockPrepare;

      const logs = logService.getLogs('deployment-123');
      expect(logs).toEqual([]);
    });

    it('should return empty array when database not initialized', () => {
      const service = LogService.getInstance();
      // Don't initialize database

      const logs = service.getLogs('deployment-123');
      expect(logs).toEqual([]);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should remove old logs', () => {
      const mockPrepare = jest.fn(() => ({
        run: jest.fn(),
      }));
      mockDb.prepare = mockPrepare;

      logService.cleanupOldLogs(30);

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM deployment_logs WHERE timestamp < ?');
    });

    it('should handle database errors gracefully', () => {
      const mockPrepare = jest.fn(() => ({
        run: jest.fn(() => {
          throw new Error('Database error');
        }),
      }));
      mockDb.prepare = mockPrepare;

      // Should not throw
      expect(() => {
        logService.cleanupOldLogs(30);
      }).not.toThrow();
    });
  });
});
