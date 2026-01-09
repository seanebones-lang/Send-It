/**
 * Rate Limiter Utility
 * 
 * Implements rate limiting for IPC handlers to prevent abuse
 * Uses sliding window algorithm
 * 
 * @module utils/rateLimiter
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter class using sliding window algorithm
 */
export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Checks if a request should be allowed
   * 
   * @param key - Unique identifier for the rate limit (e.g., IPC channel name)
   * @returns True if request is allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || entry.resetTime < now) {
      // No entry or expired, create new entry
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    // Entry exists and is valid
    if (entry.count >= this.config.maxRequests) {
      return false; // Rate limited
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Gets remaining requests for a key
   * 
   * @param key - Unique identifier
   * @returns Number of remaining requests
   */
  getRemaining(key: string): number {
    const entry = this.requests.get(key);
    if (!entry || entry.resetTime < Date.now()) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Gets reset time for a key
   * 
   * @param key - Unique identifier
   * @returns Reset time in milliseconds since epoch
   */
  getResetTime(key: string): number {
    const entry = this.requests.get(key);
    if (!entry || entry.resetTime < Date.now()) {
      return Date.now() + this.config.windowMs;
    }
    return entry.resetTime;
  }

  /**
   * Cleans up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Resets rate limit for a key
   * 
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Resets all rate limits
   */
  resetAll(): void {
    this.requests.clear();
  }
}

/**
 * Default rate limiters for different IPC channels
 */
export const rateLimiters = {
  // Deployment operations: 10 requests per minute
  deploy: new RateLimiter({ maxRequests: 10, windowMs: 60000 }),
  
  // Token operations: 5 requests per minute (more sensitive)
  token: new RateLimiter({ maxRequests: 5, windowMs: 60000 }),
  
  // Repository operations: 20 requests per minute
  repo: new RateLimiter({ maxRequests: 20, windowMs: 60000 }),
  
  // General operations: 30 requests per minute
  default: new RateLimiter({ maxRequests: 30, windowMs: 60000 }),
};

/**
 * Rate limit middleware for IPC handlers
 * 
 * @param channel - IPC channel name
 * @param handler - IPC handler function
 * @returns Wrapped handler with rate limiting
 */
export function rateLimitIpcHandler<T extends (...args: any[]) => Promise<any>>(
  channel: string,
  handler: T
): T {
  const limiter = rateLimiters[channel as keyof typeof rateLimiters] || rateLimiters.default;

  return (async (...args: Parameters<T>) => {
    const key = `${channel}:${args[0]?.toString() || 'default'}`;
    
    if (!limiter.isAllowed(key)) {
      const resetTime = limiter.getResetTime(key);
      throw new Error(
        `Rate limit exceeded. Try again after ${new Date(resetTime).toISOString()}`
      );
    }

    return handler(...args);
  }) as T;
}
