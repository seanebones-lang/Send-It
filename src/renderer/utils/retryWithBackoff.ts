/**
 * Retry utility with exponential backoff
 * Implements resilient request patterns
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors and 5xx server errors
    return error.message.includes('fetch') || error.message.includes('network');
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if we've exhausted attempts
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (!opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      
      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);
      
      // Throw on HTTP errors to trigger retry
      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    },
    {
      ...options,
      shouldRetry: (error, attempt) => {
        // Retry on network errors and 5xx errors
        const isRetryable = 
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('HTTP 5');
        
        if (isRetryable) {
          console.log(`[Retry] Retryable error: ${error.message}`);
        }
        
        return isRetryable;
      },
    }
  );
}
