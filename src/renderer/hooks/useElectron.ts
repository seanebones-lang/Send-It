import { useCallback } from 'react';
import type { ElectronAPI, CloneResult, FrameworkAnalysisResult } from '../electron';
import { electronAPI as browserElectronAPI } from '../electron.browser';

export function useElectron() {
  // Use browser-compatible API if Electron API is not available
  const electronAPI = (typeof window !== 'undefined' && (window as any).electronAPI) 
    ? ((window as any).electronAPI as ElectronAPI)
    : browserElectronAPI;

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
