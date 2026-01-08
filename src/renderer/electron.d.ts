type Platform = 'vercel' | 'netlify' | 'cloudflare' | 'aws' | 'azure' | 'gcp';

export interface FrameworkAnalysisResult {
  success: boolean;
  framework?: string;
  scores?: Record<Platform, number>;
  error?: string;
}

export interface CloneResult {
  success: boolean;
  path?: string;
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
    start: (config?: unknown) => Promise<unknown>;
    stop: () => Promise<unknown>;
    status: () => Promise<unknown>;
    logs: () => Promise<unknown>;
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
