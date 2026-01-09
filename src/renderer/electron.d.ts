import type { AnalysisPlatform, DeployPlatform } from '../types/ipc';

export interface FrameworkAnalysisResult {
  success: boolean;
  framework?: string;
  scores?: Record<AnalysisPlatform, number>;
  error?: string;
}

export interface CloneResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface DeployConfig {
  platform: DeployPlatform;
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
  platform: DeployPlatform;
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

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface ElectronAPI {
  git: {
    status: () => Promise<unknown>;
    commit: (message: string) => Promise<unknown>;
    push: () => Promise<unknown>;
    pull: () => Promise<unknown>;
    branch: () => Promise<unknown>;
    log: (options?: { limit?: number }) => Promise<unknown>;
  };
  deploy: {
    queue: (config: DeployConfig) => Promise<{ success: boolean; deploymentId?: string; error?: string }>;
    status: (deploymentId: string) => Promise<QueueItem | { success: boolean; error?: string }>;
    logs: (deploymentId: string) => Promise<LogMessage[]>;
    queueList: () => Promise<QueueItem[]>;
    onLog: (callback: (log: LogMessage) => void) => () => void;
    onStatus: (callback: (data: { id: string; status: string; result?: DeployResult }) => void) => () => void;
  };
  token: {
    get: (platform: DeployPlatform) => Promise<TokenResult>;
    set: (platform: DeployPlatform, token: string) => Promise<TokenResult>;
    oauth: (platform: 'vercel' | 'railway') => Promise<TokenResult>;
  };
  keychain: {
    check: () => Promise<{ success: boolean; hasPermission?: boolean }>;
  };
  repo: {
    clone: (repoUrl: string, targetPath?: string) => Promise<CloneResult>;
    analyzeFramework: (repoPath: string, repoUrl?: string) => Promise<FrameworkAnalysisResult>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
