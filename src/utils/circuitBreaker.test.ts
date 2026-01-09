/**
 * Unit tests for circuit breaker pattern
 * Tests circuit breaker state transitions and failure handling
 */

import { CircuitBreaker, CircuitState, CircuitOpenError } from './circuitBreaker';

describe('Circuit Breaker', () => {
  describe('Initialization', () => {
    it('should start in CLOSED state', () => {
      const circuitBreaker = new CircuitBreaker();
      const stats = circuitBreaker.getStats();
      
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });

    it('should accept custom configuration', () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();
      const onHalfOpen = jest.fn();

      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
        halfOpenTimeout: 2000,
        onOpen,
        onClose,
        onHalfOpen,
      });

      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED State', () => {
    it('should allow requests when closed', async () => {
      const circuitBreaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should increment failure count on failure', async () => {
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Test error');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after threshold failures', async () => {
      const onOpen = jest.fn();
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        onOpen,
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // First failure
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      // Second failure - should open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failures).toBe(2);
      expect(onOpen).toHaveBeenCalled();
    });

    it('should reset failures on success', async () => {
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn1 = jest.fn().mockRejectedValue(new Error('Error'));
      const fn2 = jest.fn().mockResolvedValue('success');
      
      // First failure
      await expect(circuitBreaker.execute(fn1)).rejects.toThrow();
      expect(circuitBreaker.getStats().failures).toBe(1);
      
      // Success should reset failures
      await circuitBreaker.execute(fn2);
      expect(circuitBreaker.getStats().failures).toBe(0);
    });
  });

  describe('OPEN State', () => {
    it('should reject requests immediately when open', async () => {
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      // Next request should be rejected immediately
      await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitOpenError);
      expect(fn).toHaveBeenCalledTimes(1); // Only called once, rejected on second
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const onHalfOpen = jest.fn();
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 100, // 100ms timeout
        onHalfOpen,
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
      
      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Next request should transition to HALF_OPEN
      const fn2 = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn2);
      
      expect(onHalfOpen).toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN State', () => {
    it('should allow requests in half-open state', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenTimeout: 1000,
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Success in half-open should close circuit
      const fn2 = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn2);
      
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should re-open circuit on failure in half-open state', async () => {
      const onOpen = jest.fn();
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenTimeout: 1000,
        onOpen,
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Failure in half-open should re-open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
      expect(onOpen).toHaveBeenCalledTimes(2); // Once on initial open, once on re-open
    });

    it('should timeout and re-open if half-open timeout expires', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenTimeout: 100, // Short timeout
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      
      // Wait for reset timeout to enter half-open
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Wait for half-open timeout to expire
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Should be back in OPEN state
      await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    });
  });

  describe('isFailure callback', () => {
    it('should only count failures when isFailure returns true', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        isFailure: (error) => error instanceof Error && error.message.includes('Retryable'),
      });
      
      const retryableError = new Error('Retryable error');
      const nonRetryableError = new Error('Non-retryable error');
      
      const fn1 = jest.fn().mockRejectedValue(retryableError);
      const fn2 = jest.fn().mockRejectedValue(nonRetryableError);
      
      // This should count as failure
      await expect(circuitBreaker.execute(fn1)).rejects.toThrow();
      expect(circuitBreaker.getStats().failures).toBe(1);
      
      // This should not count as failure
      await expect(circuitBreaker.execute(fn2)).rejects.toThrow();
      expect(circuitBreaker.getStats().failures).toBe(1); // Still 1
    });
  });

  describe('Manual control', () => {
    it('should allow manual reset', () => {
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open circuit
      circuitBreaker.execute(fn).catch(() => {});
      
      // Reset manually
      circuitBreaker.reset();
      
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().failures).toBe(0);
    });

    it('should allow manual open', () => {
      const circuitBreaker = new CircuitBreaker();
      
      circuitBreaker.open();
      
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
    });
  });

  describe('Statistics', () => {
    it('should track statistics correctly', async () => {
      const circuitBreaker = new CircuitBreaker();
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('Error'));
      
      // Success
      await circuitBreaker.execute(successFn);
      
      // Failure
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
      
      // Another success
      await circuitBreaker.execute(successFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.totalRequests).toBe(3);
    });
  });
});
