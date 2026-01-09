import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useElectron } from './useElectron';
import type { CloneResult, FrameworkAnalysisResult } from '../electron';

export interface RepositoryAnalysisResult {
  cloneResult: CloneResult;
  analysisResult: FrameworkAnalysisResult;
}

export function useRepositoryAnalysis(repoUrl: string | null) {
  const { cloneRepo, analyzeFramework } = useElectron();
  const queryClient = useQueryClient();

  // Prefetch when URL changes (debounced)
  useEffect(() => {
    if (repoUrl && repoUrl.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['repository', 'analysis', repoUrl],
          queryFn: async () => {
            const cloneResult = await cloneRepo(repoUrl);
            if (!cloneResult.success) {
              throw new Error(cloneResult.error || 'Failed to clone repository');
            }
            if (!cloneResult.path) {
              throw new Error('Clone succeeded but no path returned');
            }
            const analysisResult = await analyzeFramework(cloneResult.path, repoUrl);
            if (!analysisResult.success) {
              throw new Error(analysisResult.error || 'Failed to analyze framework');
            }
            return { cloneResult, analysisResult };
          },
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [repoUrl, queryClient, cloneRepo, analyzeFramework]);

  return useQuery<RepositoryAnalysisResult>({
    queryKey: ['repository', 'analysis', repoUrl],
    queryFn: async () => {
      if (!repoUrl) return null as any;
      
      const cloneResult = await cloneRepo(repoUrl);
      if (!cloneResult.success) {
        throw new Error(cloneResult.error || 'Failed to clone repository');
      }
      if (!cloneResult.path) {
        throw new Error('Clone succeeded but no path returned');
      }
      
      const analysisResult = await analyzeFramework(cloneResult.path, repoUrl);
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Failed to analyze framework');
      }
      
      return { cloneResult, analysisResult };
    },
    enabled: !!repoUrl && repoUrl.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
  });
}
