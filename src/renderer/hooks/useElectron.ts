import { useCallback } from 'react';
import type { ElectronAPI, CloneResult, FrameworkAnalysisResult } from '../electron';

export function useElectron() {
  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;

  const cloneRepo = useCallback(
    async (repoUrl: string, targetPath?: string): Promise<CloneResult> => {
      if (!electronAPI?.repo?.clone) {
        throw new Error('electronAPI.repo.clone not available');
      }
      return electronAPI.repo.clone(repoUrl, targetPath);
    },
    [electronAPI]
  );

  const analyzeFramework = useCallback(
    async (repoPath: string, repoUrl?: string): Promise<FrameworkAnalysisResult> => {
      if (!electronAPI?.repo?.analyzeFramework) {
        throw new Error('electronAPI.repo.analyzeFramework not available');
      }
      return electronAPI.repo.analyzeFramework(repoPath, repoUrl);
    },
    [electronAPI]
  );

  const isAvailable = electronAPI !== undefined;

  return {
    cloneRepo,
    analyzeFramework,
    isAvailable,
    electronAPI,
  };
}
