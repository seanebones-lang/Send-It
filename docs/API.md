# Send-It API Documentation

## Version: 1.0.0
## Date: January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Services](#services)
   - [TokenService](#tokenservice)
   - [LogService](#logservice)
   - [NotificationService](#notificationservice)
   - [DatabaseService](#databaseservice)
   - [DeploymentService](#deploymentservice)
   - [QueueService](#queueservice)
3. [Utilities](#utilities)
   - [Encryption](#encryption-utilities)
   - [Validation](#validation-utilities)
   - [Retry](#retry-utilities)
   - [Circuit Breaker](#circuit-breaker)
4. [Framework Detection](#framework-detection)
5. [Error Handling](#error-handling)

---

## Overview

Send-It is an Electron-based desktop application for automated deployment to cloud platforms (Vercel, Railway, Render). The application uses a service-based architecture with the following core services:

- **TokenService**: Secure token management
- **LogService**: Deployment log streaming and storage
- **NotificationService**: System notifications and UI feedback
- **DatabaseService**: Persistent data storage
- **DeploymentService**: Platform-specific deployment logic
- **QueueService**: Deployment queue management with parallel processing

---

## Services

### TokenService

Manages secure storage and retrieval of API tokens using OS keychain.

#### Methods

##### `getInstance(): TokenService`
Get singleton instance of TokenService.

**Returns**: `TokenService` instance

##### `checkKeychainPermission(): Promise<boolean>`
Checks if keychain permissions are available.

**Returns**: `Promise<boolean>` - True if keychain access is granted

**Example**:
```typescript
const tokenService = TokenService.getInstance();
const hasPermission = await tokenService.checkKeychainPermission();
```

##### `getToken(platform: DeployPlatform): Promise<TokenResult>`
Retrieves a stored token for a platform.

**Parameters**:
- `platform: DeployPlatform` - Deployment platform ('vercel' | 'railway' | 'render')

**Returns**: `Promise<TokenResult>`
```typescript
interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
}
```

**Example**:
```typescript
const result = await tokenService.getToken('vercel');
if (result.success) {
  console.log('Token retrieved');
} else {
  console.error(result.error);
}
```

##### `setToken(platform: DeployPlatform, token: string): Promise<TokenResult>`
Stores a token securely in the keychain.

**Parameters**:
- `platform: DeployPlatform` - Deployment platform
- `token: string` - Token to store

**Returns**: `Promise<TokenResult>`

**Example**:
```typescript
const result = await tokenService.setToken('vercel', 'my-token');
if (result.success) {
  console.log('Token stored successfully');
}
```

##### `authenticateOAuth(platform: 'vercel' | 'railway'): Promise<TokenResult>`
Initiates OAuth authentication flow for a platform.

**Parameters**:
- `platform: 'vercel' | 'railway'` - Platform to authenticate

**Returns**: `Promise<TokenResult>`

**Note**: Currently requires manual token entry for Vercel and Railway.

---

### LogService

Manages deployment log streaming and storage.

#### Methods

##### `getInstance(): LogService`
Get singleton instance of LogService.

##### `initialize(db: Database): void`
Initialize the log service with database connection.

**Parameters**:
- `db: Database` - Better-sqlite3 database instance

##### `emitLog(deploymentId: string, message: string, level?: LogLevel): void`
Emits a log message to all renderer processes and stores in database.

**Parameters**:
- `deploymentId: string` - Deployment ID
- `message: string` - Log message
- `level: LogLevel` - Log level ('info' | 'warn' | 'error' | 'success'), default: 'info'

**Example**:
```typescript
const logService = LogService.getInstance();
logService.emitLog('deploy-123', 'Deployment started', 'info');
logService.emitLog('deploy-123', 'Deployment failed', 'error');
```

##### `getLogs(deploymentId: string): LogMessage[]`
Retrieves logs for a deployment.

**Parameters**:
- `deploymentId: string` - Deployment ID

**Returns**: `LogMessage[]`
```typescript
interface LogMessage {
  deploymentId: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  timestamp: string;
}
```

##### `cleanupOldLogs(olderThanDays?: number): void`
Cleans up old logs (optional - for maintenance).

**Parameters**:
- `olderThanDays: number` - Number of days to keep logs (default: 30)

---

### NotificationService

Manages system notifications and UI feedback.

#### Methods

##### `getInstance(): NotificationService`
Get singleton instance of NotificationService.

##### `initialize(window: BrowserWindow): void`
Initialize the notification service with main window reference.

**Parameters**:
- `window: BrowserWindow` - Main browser window

##### `updateDockBadge(): void`
Updates the dock badge with active deployment count (macOS only).

##### `setActiveDeployCount(count: number): void`
Sets the active deployment count.

**Parameters**:
- `count: number` - Number of active deployments

##### `incrementActiveDeployCount(): void`
Increments the active deployment count.

##### `decrementActiveDeployCount(): void`
Decrements the active deployment count.

##### `sendNotification(title: string, message: string, status?: NotificationStatus): void`
Sends a system notification.

**Parameters**:
- `title: string` - Notification title
- `message: string` - Notification message
- `status: NotificationStatus` - Notification status ('success' | 'error' | 'info'), default: 'info'

**Example**:
```typescript
const notificationService = NotificationService.getInstance();
notificationService.sendNotification(
  'Deployment Successful',
  'Your deployment completed successfully',
  'success'
);
```

##### `getActiveDeployCount(): number`
Gets the current active deployment count.

**Returns**: `number`

---

### DatabaseService

Manages all database operations for deployments and logs.

#### Methods

##### `getInstance(): DatabaseService`
Get singleton instance of DatabaseService.

##### `initialize(): void`
Initialize the database service. Creates tables and indexes if they don't exist.

##### `getDb(): Database | null`
Gets the database instance.

**Returns**: Database instance or null if not initialized

##### `saveDeployment(deploymentId: string, config: DeployConfig, status: QueueStatus): void`
Saves a deployment to the database.

**Parameters**:
- `deploymentId: string` - Deployment ID
- `config: DeployConfig` - Deployment configuration
- `status: QueueStatus` - Deployment status ('queued' | 'processing' | 'completed' | 'failed')

##### `updateDeploymentStatus(deploymentId: string, status: QueueStatus, startedAt?: string): void`
Updates deployment status.

**Parameters**:
- `deploymentId: string` - Deployment ID
- `status: QueueStatus` - New status
- `startedAt: string` - Optional start time

##### `updateDeploymentResult(deploymentId: string, result: DeployResult, completedAt: string): void`
Updates deployment result.

**Parameters**:
- `deploymentId: string` - Deployment ID
- `result: DeployResult` - Deployment result
- `completedAt: string` - Completion time

##### `getDeployment(deploymentId: string): QueueItem | null`
Gets a deployment by ID.

**Parameters**:
- `deploymentId: string` - Deployment ID

**Returns**: `QueueItem | null`

##### `getAllDeployments(limit?: number, offset?: number): QueueItem[]`
Gets all deployments with pagination.

**Parameters**:
- `limit: number` - Maximum number of deployments (default: 100)
- `offset: number` - Number of deployments to skip (default: 0)

**Returns**: `QueueItem[]`

##### `getDeploymentsByStatus(status: QueueStatus): QueueItem[]`
Gets deployments by status.

**Parameters**:
- `status: QueueStatus` - Status to filter by

**Returns**: `QueueItem[]`

##### `close(): void`
Closes the database connection.

---

### DeploymentService

Handles deployments to Vercel, Railway, and Render platforms with retry and circuit breaker integration.

#### Methods

##### `getInstance(): DeploymentService`
Get singleton instance of DeploymentService.

##### `setLogService(logService: LogService): void`
Sets log service instance.

**Parameters**:
- `logService: LogService` - Log service instance

##### `deploy(config: DeployConfig, deploymentId: string): Promise<DeployResult>`
Deploys to a platform.

**Parameters**:
- `config: DeployConfig` - Deployment configuration
- `deploymentId: string` - Deployment ID

**Returns**: `Promise<DeployResult>`
```typescript
interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  platform: DeployPlatform;
}
```

**Example**:
```typescript
const deploymentService = DeploymentService.getInstance();
const config: DeployConfig = {
  platform: 'vercel',
  repoPath: '/path/to/repo',
  envVars: { API_KEY: 'value' },
  projectName: 'my-project',
};
const result = await deploymentService.deploy(config, 'deploy-123');
```

**Features**:
- Automatic retry with exponential backoff
- Circuit breaker protection
- Status polling with exponential backoff
- Comprehensive error handling

##### `getCircuitBreakerStats(platform: DeployPlatform): CircuitBreakerStats`
Gets circuit breaker statistics for a platform.

**Parameters**:
- `platform: DeployPlatform` - Platform to get stats for

**Returns**: `CircuitBreakerStats`

---

### QueueService

Manages deployment queue with parallel processing support.

#### Methods

##### `getInstance(): QueueService`
Get singleton instance of QueueService.

##### `initialize(config?: QueueConfig): void`
Initialize queue service.

**Parameters**:
- `config: QueueConfig` - Queue configuration (optional)
```typescript
interface QueueConfig {
  maxConcurrent?: number; // Default: 3
  parallel?: boolean;     // Default: true
}
```

**Example**:
```typescript
const queueService = QueueService.getInstance();
queueService.initialize({
  maxConcurrent: 5,
  parallel: true,
});
```

##### `queueDeployment(config: DeployConfig, deploymentId?: string): Promise<string>`
Adds a deployment to the queue.

**Parameters**:
- `config: DeployConfig` - Deployment configuration
- `deploymentId: string` - Optional deployment ID (will generate if not provided)

**Returns**: `Promise<string>` - Deployment ID

**Example**:
```typescript
const deploymentId = await queueService.queueDeployment(config);
console.log(`Deployment queued: ${deploymentId}`);
```

##### `getDeployment(deploymentId: string): QueueItem | null`
Gets a deployment from queue by ID.

**Parameters**:
- `deploymentId: string` - Deployment ID

**Returns**: `QueueItem | null`

##### `getAllDeployments(): QueueItem[]`
Gets all deployments in queue.

**Returns**: `QueueItem[]`

##### `getQueueStats()`
Gets queue statistics.

**Returns**:
```typescript
{
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  activeWorkers: number;
  maxConcurrent: number;
}
```

**Features**:
- Parallel processing (configurable concurrent deployments)
- Queue persistence (survives app restart)
- Automatic queue recovery on startup
- Queue statistics and monitoring

---

## Utilities

### Encryption Utilities

Secure encryption/decryption with PBKDF2 key derivation.

**Location**: `src/utils/encryption.ts`

#### Functions

##### `encryptEnvVar(value: string): string`
Encrypts a value using AES-256-GCM with PBKDF2 key derivation.

**Parameters**:
- `value: string` - Plaintext value to encrypt

**Returns**: Encrypted string in format "salt:iv:authTag:encrypted"

**Security**:
- PBKDF2 with 100,000 iterations
- Random salt per encryption (256 bits)
- Random IV per encryption (128 bits)
- Authentication tag (GCM mode)

##### `decryptEnvVar(encrypted: string): string`
Decrypts a value encrypted with `encryptEnvVar`.

**Parameters**:
- `encrypted: string` - Encrypted string

**Returns**: Decrypted plaintext value

**Throws**: Error if decryption fails or data is tampered

##### `encryptEnvVars(envVars: Record<string, string>): Record<string, string>`
Encrypts multiple environment variables.

**Parameters**:
- `envVars: Record<string, string>` - Object with key-value pairs

**Returns**: Object with encrypted values

##### `decryptEnvVars(encrypted: Record<string, string>): Record<string, string>`
Decrypts multiple environment variables.

**Parameters**:
- `encrypted: Record<string, string>` - Object with encrypted values

**Returns**: Object with decrypted values

---

### Validation Utilities

Input validation and sanitization to prevent security vulnerabilities.

**Location**: `src/utils/validation.ts`

#### Functions

##### `validateAndSanitizePath(filePath: string, allowedBaseDir: string): string`
Validates and sanitizes file paths to prevent path traversal attacks.

**Parameters**:
- `filePath: string` - File path to validate
- `allowedBaseDir: string` - Base directory that path must be within

**Returns**: Sanitized absolute path

**Throws**: Error if path is invalid or outside allowed directory

##### `validateRepoUrl(repoUrl: string): string`
Validates repository URL.

**Parameters**:
- `repoUrl: string` - Repository URL

**Returns**: Validated URL

**Throws**: Error if URL is invalid

##### `validateDeployPlatform(platform: string): DeployPlatform`
Validates deployment platform.

**Parameters**:
- `platform: string` - Platform to validate

**Returns**: Validated platform ('vercel' | 'railway' | 'render')

**Throws**: Error if platform is invalid

##### `validateEnvVarKey(key: string): string`
Validates environment variable key.

**Parameters**:
- `key: string` - Environment variable key

**Returns**: Validated key (uppercase)

**Throws**: Error if key is invalid

##### `validateProjectName(projectName: string): string`
Validates project name.

**Parameters**:
- `projectName: string` - Project name

**Returns**: Validated name

**Throws**: Error if name is invalid

##### `validateBranchName(branch: string): string`
Validates Git branch name.

**Parameters**:
- `branch: string` - Branch name

**Returns**: Validated branch name

**Throws**: Error if branch name is invalid

##### `validateDeploymentId(deploymentId: string): string`
Validates deployment ID format.

**Parameters**:
- `deploymentId: string` - Deployment ID

**Returns**: Validated ID

**Throws**: Error if ID is invalid

##### `validateEnvVars(envVars: Record<string, string>): Record<string, string>`
Validates environment variables object.

**Parameters**:
- `envVars: Record<string, string>` - Environment variables object

**Returns**: Validated and sanitized environment variables

**Throws**: Error if validation fails

##### `validateDeployConfig(config: unknown): DeployConfig`
Validates deployment configuration.

**Parameters**:
- `config: unknown` - Deployment configuration

**Returns**: Validated configuration

**Throws**: Error if validation fails

---

### Retry Utilities

Retry mechanism with exponential backoff for transient failures.

**Location**: `src/utils/retry.ts`

#### Functions

##### `retryWithBackoff<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>`
Retries an async function with exponential backoff.

**Parameters**:
- `fn: () => Promise<T>` - Async function to retry
- `config: RetryConfig` - Retry configuration (optional)

**Returns**: Result of the function

**Throws**: Last error if all retries fail

**Configuration**:
```typescript
interface RetryConfig {
  maxAttempts?: number;      // Default: 3
  initialDelay?: number;     // Default: 1000ms
  maxDelay?: number;         // Default: 30000ms
  multiplier?: number;       // Default: 2
  jitter?: number;           // Default: 0.1 (10% jitter)
  isRetryable?: (error: unknown) => boolean;
  getDelay?: (attempt: number, config: RetryConfig) => number;
}
```

**Example**:
```typescript
const result = await retryWithBackoff(
  async () => fetch('https://api.example.com/data'),
  {
    maxAttempts: 5,
    initialDelay: 1000,
    multiplier: 2,
  }
);
```

##### `retryWithFixedDelay<T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number): Promise<T>`
Retries an async function with fixed delay.

**Parameters**:
- `fn: () => Promise<T>` - Async function to retry
- `maxAttempts: number` - Maximum attempts (default: 3)
- `delay: number` - Fixed delay in milliseconds (default: 1000)

**Returns**: Result of the function

**Throws**: Last error if all retries fail

##### `isRetryableError(error: unknown): boolean`
Determines if an error is retryable.

**Parameters**:
- `error: unknown` - Error to check

**Returns**: True if error is retryable

**Retryable Errors**:
- Network errors (ECONNRESET, ETIMEDOUT, etc.)
- HTTP 5xx errors
- HTTP 429 (rate limiting)
- HTTP 408 (timeout)

---

### Circuit Breaker

Circuit breaker pattern for protecting external API calls.

**Location**: `src/utils/circuitBreaker.ts`

#### Class: `CircuitBreaker`

##### Constructor
```typescript
constructor(config?: CircuitBreakerConfig)
```

**Configuration**:
```typescript
interface CircuitBreakerConfig {
  failureThreshold?: number;    // Default: 5
  resetTimeout?: number;        // Default: 60000ms
  halfOpenTimeout?: number;     // Default: 10000ms
  isFailure?: (error: unknown) => boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}
```

##### Methods

###### `execute<T>(fn: () => Promise<T>): Promise<T>`
Executes a function with circuit breaker protection.

**Parameters**:
- `fn: () => Promise<T>` - Function to execute

**Returns**: Result of the function

**Throws**: `CircuitOpenError` if circuit is open

**States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service failing, requests rejected immediately
- **HALF_OPEN**: Testing recovery, limited requests allowed

**Example**:
```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  onOpen: () => console.log('Circuit opened'),
});

try {
  const result = await circuitBreaker.execute(
    () => fetch('https://api.example.com/data')
  );
} catch (error) {
  if (error instanceof CircuitOpenError) {
    console.log('Service unavailable');
  }
}
```

###### `getStats(): CircuitBreakerStats`
Gets circuit breaker statistics.

**Returns**: Statistics object

###### `reset(): void`
Resets the circuit breaker to CLOSED state.

###### `open(): void`
Manually opens the circuit breaker.

---

## Framework Detection

Framework detection with caching support.

**Location**: `src/frameworkDetector.ts`

### Class: `FrameworkDetector`

#### Methods

##### `detect(repoPath: string, useCache?: boolean): FrameworkDetection`
Detects framework in a repository.

**Parameters**:
- `repoPath: string` - Repository path
- `useCache: boolean` - Use cache (default: true)

**Returns**: `FrameworkDetection`
```typescript
interface FrameworkDetection {
  framework: string;
  scores: Record<AnalysisPlatform, number>;
}
```

**Supported Frameworks**:
- Next.js
- Vite
- Create React App
- Vue
- Angular
- Svelte
- Remix
- Astro
- Gatsby

**Caching**:
- Results are cached by repository hash
- Cache invalidated when repository changes
- Default TTL: 24 hours
- Error results cached for 5 minutes

**Example**:
```typescript
const detection = FrameworkDetector.detect('/path/to/repo');
console.log(`Framework: ${detection.framework}`);
console.log(`Scores:`, detection.scores);
```

##### `invalidateCache(repoPath: string): void`
Invalidates cache for a repository.

**Parameters**:
- `repoPath: string` - Repository path

##### `clearCache(): void`
Clears all cached framework detections.

---

## Error Handling

### Error Types

#### `CircuitOpenError`
Thrown when circuit breaker is open.

**Properties**:
- `message: string` - Error message

#### Standard Errors
All validation functions throw standard `Error` objects with descriptive messages.

### Error Handling Best Practices

1. **Always validate input** before processing
2. **Use retry mechanism** for transient failures
3. **Use circuit breaker** for external API calls
4. **Log all errors** with context
5. **Handle errors gracefully** with user-friendly messages

---

## Examples

### Complete Deployment Flow

```typescript
import {
  DatabaseService,
  DeploymentService,
  QueueService,
  LogService,
  TokenService,
  NotificationService,
} from './services';

// Initialize services
const databaseService = DatabaseService.getInstance();
databaseService.initialize();

const logService = LogService.getInstance();
logService.initialize(databaseService.getDb()!);

const tokenService = TokenService.getInstance();
const notificationService = NotificationService.getInstance();

const deploymentService = DeploymentService.getInstance();
deploymentService.setLogService(logService);

const queueService = QueueService.getInstance();
queueService.initialize({ maxConcurrent: 3, parallel: true });

// Queue deployment
const config: DeployConfig = {
  platform: 'vercel',
  repoPath: '/path/to/repo',
  envVars: { API_KEY: 'value' },
  projectName: 'my-project',
  branch: 'main',
};

const deploymentId = await queueService.queueDeployment(config);
console.log(`Deployment queued: ${deploymentId}`);

// Check status
const deployment = queueService.getDeployment(deploymentId);
console.log(`Status: ${deployment?.status}`);

// Get logs
const logs = logService.getLogs(deploymentId);
logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
});
```

### Using Retry and Circuit Breaker

```typescript
import { retryWithBackoff, isRetryableError } from './utils/retry';
import { CircuitBreaker } from './utils/circuitBreaker';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

const makeRequest = async () => {
  return await retryWithBackoff(
    async () => {
      return await circuitBreaker.execute(
        async () => {
          const response = await fetch('https://api.example.com/data');
          if (!response.ok) {
            throw { status: response.status };
          }
          return response.json();
        }
      );
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      isRetryable: isRetryableError,
    }
  );
};
```

---

## Security Considerations

1. **Encryption**: All environment variables are encrypted using PBKDF2 and AES-256-GCM
2. **Token Storage**: Tokens are stored in OS keychain, not in plaintext
3. **Input Validation**: All inputs are validated to prevent injection attacks
4. **Path Sanitization**: File paths are validated to prevent path traversal
5. **CSP**: Content Security Policy enforced in renderer process

---

*Last Updated: January 2026*
