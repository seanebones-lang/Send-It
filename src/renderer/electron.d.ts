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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
