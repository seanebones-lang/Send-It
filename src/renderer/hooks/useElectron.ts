import { useCallback } from 'react';
import type { ElectronAPI, CloneResult, FrameworkAnalysisResult } from '../electron';

export function useElectron() {
  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;

  const cloneRepo = useCallback(
    async (repoUrl: string, targetPath?: string): Promise<CloneResult> => {
      if (!electronAPI?.repo?.clone) {
        // Return error result instead of throwing - graceful degradation
        return {
          success: false,
          error: 'Repository cloning is not available. The browser API should provide this functionality.',
        };
      }
      try {
        return await electronAPI.repo.clone(repoUrl, targetPath);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clone repository',
        };
      }
    },
    [electronAPI]
  );

  const analyzeFramework = useCallback(
    async (repoPath: string, repoUrl?: string): Promise<FrameworkAnalysisResult> => {
      if (!electronAPI?.repo?.analyzeFramework) {
        // Return error result instead of throwing - graceful degradation
        return {
          success: false,
          error: 'Framework analysis is not available. The browser API should provide this functionality.',
        };
      }
      try {
        return await electronAPI.repo.analyzeFramework(repoPath, repoUrl);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to analyze framework',
        };
      }
    },
    [electronAPI]
  );

  const isAvailable = electronAPI !== undefined;
  const isBrowser = typeof window !== 'undefined' && !(window as any).process?.type;

  return {
    cloneRepo,
    analyzeFramework,
    isAvailable,
    isBrowser,
    electronAPI,
  };
}
