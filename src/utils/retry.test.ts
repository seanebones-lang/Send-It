/**
 * Unit tests for retry utilities
 * Tests retry mechanism with exponential backoff
 */

import { retryWithBackoff, retryWithFixedDelay, isRetryableError } from './retry';

describe('Retry Utilities', () => {
  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkErrors = [
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('ECONNREFUSED'),
        new Error('EAI_AGAIN'),
      ];

      networkErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify HTTP 5xx errors as retryable', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ statusCode: 502 })).toBe(true);
    });

    it('should identify HTTP 429 and 408 as retryable', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 408 })).toBe(true);
    });

    it('should identify fetch errors as retryable', () => {
      const fetchError = new TypeError('fetch failed');
      expect(isRetryableError(fetchError)).toBe(true);
    });

    it('should not identify client errors as retryable', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
    });

    it('should not identify non-retryable errors as retryable', () => {
      expect(isRetryableError(new Error('Validation error'))).toBe(false);
      expect(isRetryableError({ message: 'Invalid input' })).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: isRetryableError,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, delay);
      }) as any;

      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelay: 100,
        multiplier: 2,
        jitter: 0, // Disable jitter for predictable delays
      });

      expect(delays.length).toBeGreaterThan(0);
      // First retry should be ~100ms, second ~200ms
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[0]).toBeLessThan(150);
      
      global.setTimeout = originalSetTimeout;
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          isRetryable: () => false, // Non-retryable
        })
      ).rejects.toThrow('Validation error');
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
      
      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          isRetryable: isRetryableError,
        })
      ).rejects.toThrow('ECONNRESET');
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, delay);
      }) as any;

      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      await retryWithBackoff(fn, {
        maxAttempts: 4,
        initialDelay: 1000,
        maxDelay: 2000,
        multiplier: 2,
        jitter: 0,
      });

      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(2000);
      });
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('retryWithFixedDelay', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithFixedDelay(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry with fixed delay', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, delay);
      }) as any;

      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');

      await retryWithFixedDelay(fn, 3, 100);

      expect(delays).toEqual([100, 100]);
      expect(fn).toHaveBeenCalledTimes(3);
      
      global.setTimeout = originalSetTimeout;
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(retryWithFixedDelay(fn, 2, 10)).rejects.toThrow('Persistent error');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
