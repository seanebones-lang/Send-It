/**
 * Retry Utilities with Exponential Backoff
 * 
 * Implements retry mechanism with exponential backoff for transient failures
 * Supports configurable retry counts, backoff strategies, and error categorization
 * 
 * @module utils/retry
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  multiplier?: number;
  /** Jitter range (0-1, adds randomness to prevent thundering herd) (default: 0.1) */
  jitter?: number;
  /** Function to determine if an error is retryable (default: all errors are retryable) */
  isRetryable?: (error: unknown) => boolean;
  /** Function to determine delay before retry (overrides default exponential backoff) */
  getDelay?: (attempt: number, config: RetryConfig) => number;
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: 0.1,
  isRetryable: () => true,
  getDelay: (attempt: number, config: Required<RetryConfig>) => {
    const exponentialDelay = config.initialDelay * Math.pow(config.multiplier, attempt - 1);
    const withJitter = exponentialDelay * (1 + (Math.random() - 0.5) * config.jitter);
    return Math.min(withJitter, config.maxDelay);
  },
};

/**
 * Determines if an error is a retryable transient failure
 * 
 * Common retryable errors:
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
 * - HTTP 5xx errors (server errors)
 * - HTTP 429 (rate limiting)
 * - HTTP 408 (timeout)
 * 
 * @param error - Error to check
 * @returns True if error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'];
    if (networkErrors.some(code => error.message.includes(code))) {
      return true;
    }

    // HTTP errors (from fetch)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network failure
    }
  }

  // Check for HTTP response with retryable status codes
  if (typeof error === 'object' && error !== null) {
    const httpError = error as { status?: number; statusCode?: number };
    const status = httpError.status || httpError.statusCode;
    
    if (status) {
      // Retryable HTTP status codes
      return status === 429 || status === 408 || (status >= 500 && status < 600);
    }
  }

  return false;
}

/**
 * Calculates delay for exponential backoff with jitter
 * 
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  if (config.getDelay) {
    return config.getDelay(attempt, config);
  }

  const exponentialDelay = config.initialDelay * Math.pow(config.multiplier, attempt - 1);
  const withJitter = exponentialDelay * (1 + (Math.random() - 0.5) * config.jitter);
  return Math.min(withJitter, config.maxDelay);
}

/**
 * Retries an async function with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 5, initialDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig: Required<RetryConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    isRetryable: config.isRetryable || DEFAULT_CONFIG.isRetryable,
    getDelay: config.getDelay || DEFAULT_CONFIG.getDelay,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!finalConfig.isRetryable(error)) {
        throw error; // Non-retryable error, throw immediately
      }

      // If this is the last attempt, throw the error
      if (attempt === finalConfig.maxAttempts) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      
      // Log retry attempt (optional - can be removed or made configurable)
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms:`,
          error instanceof Error ? error.message : error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retries an async function with a fixed delay
 * 
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param delay - Fixed delay between retries in milliseconds (default: 1000)
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithFixedDelay<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
