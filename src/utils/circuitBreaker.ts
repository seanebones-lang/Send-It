/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by stopping requests when a service is down
 * Implements three states: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
 * 
 * @module utils/circuitBreaker
 */

/**
 * Circuit breaker state
 */
export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'CLOSED',
  /** Service is failing - requests are rejected immediately */
  OPEN = 'OPEN',
  /** Testing if service has recovered - allows limited requests */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Threshold of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in milliseconds before attempting to close circuit (default: 60000) */
  resetTimeout?: number;
  /** Time in milliseconds to keep circuit in half-open state (default: 10000) */
  halfOpenTimeout?: number;
  /** Function to determine if an error should count as a failure (default: all errors) */
  isFailure?: (error: unknown) => boolean;
  /** Function called when circuit opens */
  onOpen?: () => void;
  /** Function called when circuit closes */
  onClose?: () => void;
  /** Function called when circuit enters half-open state */
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  /** Current state */
  state: CircuitState;
  /** Number of failures */
  failures: number;
  /** Number of successes */
  successes: number;
  /** Time when circuit was opened */
  openedAt: number | null;
  /** Time when circuit entered half-open state */
  halfOpenedAt: number | null;
  /** Total requests */
  totalRequests: number;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: Required<Omit<CircuitBreakerConfig, 'onOpen' | 'onClose' | 'onHalfOpen'>> & {
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
} = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenTimeout: 10000, // 10 seconds
  isFailure: () => true,
};

/**
 * Circuit Breaker for protecting external API calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private openedAt: number | null = null;
  private halfOpenedAt: number | null = null;
  private totalRequests: number = 0;
  private config: Required<Omit<CircuitBreakerConfig, 'onOpen' | 'onClose' | 'onHalfOpen'>> & {
    onOpen?: () => void;
    onClose?: () => void;
    onHalfOpen?: () => void;
  };

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      isFailure: config.isFailure || DEFAULT_CONFIG.isFailure,
    };
  }

  /**
   * Executes a function with circuit breaker protection
   * 
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws CircuitOpenError if circuit is open
   * @throws Original error if function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open and timeout has elapsed
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - (this.openedAt || 0);
      if (timeSinceOpen >= this.config.resetTimeout) {
        // Transition to half-open
        this.transitionToHalfOpen();
      } else {
        // Circuit is still open - reject immediately
        throw new CircuitOpenError(
          `Circuit breaker is OPEN. Service unavailable. Try again in ${Math.ceil((this.config.resetTimeout - timeSinceOpen) / 1000)} seconds.`
        );
      }
    }

    // Check if circuit is in half-open state and timeout has elapsed
    if (this.state === CircuitState.HALF_OPEN) {
      const timeSinceHalfOpen = Date.now() - (this.halfOpenedAt || 0);
      if (timeSinceHalfOpen >= this.config.halfOpenTimeout) {
        // Timeout elapsed - transition back to open
        this.transitionToOpen();
        throw new CircuitOpenError('Circuit breaker test timeout. Service still unavailable.');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset failures and close circuit if half-open
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handles successful execution
   * 
   * @private
   */
  private onSuccess(): void {
    this.failures = 0;
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Success in half-open state - close circuit
      this.transitionToClosed();
    }
  }

  /**
   * Handles failed execution
   * 
   * @private
   */
  private onFailure(error: unknown): void {
    if (this.config.isFailure!(error)) {
      this.failures++;
      this.successes = 0; // Reset successes on failure

      if (this.state === CircuitState.HALF_OPEN) {
        // Failure in half-open state - open circuit again
        this.transitionToOpen();
      } else if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
        // Too many failures - open circuit
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transitions circuit to OPEN state
   * 
   * @private
   */
  private transitionToOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.config.onOpen?.();
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Circuit breaker opened due to failures:', this.failures);
      }
    }
  }

  /**
   * Transitions circuit to CLOSED state
   * 
   * @private
   */
  private transitionToClosed(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      this.openedAt = null;
      this.halfOpenedAt = null;
      this.config.onClose?.();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Circuit breaker closed - service recovered');
      }
    }
  }

  /**
   * Transitions circuit to HALF_OPEN state
   * 
   * @private
   */
  private transitionToHalfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenedAt = Date.now();
      this.failures = 0; // Reset failures for half-open test
      this.config.onHalfOpen?.();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Circuit breaker entering half-open state - testing recovery');
      }
    }
  }

  /**
   * Gets current circuit breaker statistics
   * 
   * @returns Circuit breaker stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      openedAt: this.openedAt,
      halfOpenedAt: this.halfOpenedAt,
      totalRequests: this.totalRequests,
    };
  }

  /**
   * Resets the circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionToClosed();
  }

  /**
   * Manually opens the circuit breaker
   */
  open(): void {
    this.transitionToOpen();
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
