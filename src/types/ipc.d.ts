/**
 * IPC Channel Types for Send-It
 */

export type Platform = 'vercel' | 'railway' | 'render';

export interface DeployConfig {
  platform: Platform;
  repoPath: string;
  envVars: Record<string, string>;
  projectName?: string;
  branch?: string;
}

export interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  platform: Platform;
}

export interface DeployStatus {
  deploymentId: string;
  status: 'pending' | 'building' | 'deploying' | 'live' | 'failed' | 'cancelled';
  url?: string;
  logs: string[];
  progress?: number;
  platform: Platform;
}

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
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
