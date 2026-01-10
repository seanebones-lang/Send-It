/**
 * IPC Channel Types for Send-It
 * 
 * Unified platform types for deployment platforms
 */

/**
 * Supported deployment platforms (web-only)
 * All platforms call APIs directly from browser - no backend needed!
 */
export type DeployPlatform = 'vercel' | 'railway' | 'render' | 'netlify' | 'fly-io' | 'cloudflare-pages';

/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use DeployPlatform instead
 */
export type Platform = DeployPlatform;

/**
 * Framework analysis platforms (for scoring/recommendations)
 * These are the platforms that can be recommended, not all are supported for deployment
 */
export type AnalysisPlatform = 'vercel' | 'netlify' | 'cloudflare' | 'aws' | 'azure' | 'gcp';

export interface DeployConfig {
  platform: DeployPlatform;
  repoPath: string; // GitHub URL or github://owner/repo format
  repoUrl?: string; // Full GitHub URL (for clarity)
  envVars: Record<string, string>;
  projectName?: string;
  branch?: string;
  framework?: string; // Detected framework
  buildCommand?: string; // Optional build command
  startCommand?: string; // Optional start command (for Render)
  rootDirectory?: string; // Optional root directory
}

export interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  platform: DeployPlatform;
}

export interface DeployStatus {
  deploymentId: string;
  status: 'pending' | 'building' | 'deploying' | 'live' | 'failed' | 'cancelled';
  url?: string;
  logs: string[];
  progress?: number;
  platform: DeployPlatform;
}

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
  framework: string;
  scores: Record<AnalysisPlatform, number>;
}

export interface QueueItem {
  id: string;
  config: DeployConfig;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: DeployResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface LogMessage {
  deploymentId: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  timestamp: string;
}
