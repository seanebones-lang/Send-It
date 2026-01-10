import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cloneRepoBrowser, analyzeFrameworkBrowser } from '../../renderer/api/browserAPI';
import type { CloneResult, FrameworkAnalysisResult } from '../electron';

export interface RepositoryAnalysisResult {
  cloneResult: CloneResult;
  analysisResult: FrameworkAnalysisResult;
}

export function useRepositoryAnalysis(repoUrl: string | null) {
  const queryClient = useQueryClient();

  // Prefetch when URL changes (debounced)
  useEffect(() => {
    if (repoUrl && repoUrl.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['repository', 'analysis', repoUrl],
          queryFn: async () => {
            // Use browser API (web-only, no Electron needed)
            const cloneResult = await cloneRepoBrowser(repoUrl);
            if (!cloneResult.success) {
              throw new Error(cloneResult.error || 'Failed to clone repository');
            }
            if (!cloneResult.path) {
              throw new Error('Clone succeeded but no path returned');
            }
            const analysisResult = await analyzeFrameworkBrowser(cloneResult.path, repoUrl);
            if (!analysisResult.success) {
              throw new Error(analysisResult.error || 'Failed to analyze framework');
            }
            return { cloneResult, analysisResult };
          },
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [repoUrl, queryClient]);

  return useQuery<RepositoryAnalysisResult>({
    queryKey: ['repository', 'analysis', repoUrl],
    queryFn: async () => {
      if (!repoUrl) return null as any;
      
      // Use browser API (web-only, no Electron needed)
      const cloneResult = await cloneRepoBrowser(repoUrl);
      if (!cloneResult.success) {
        throw new Error(cloneResult.error || 'Failed to clone repository');
      }
      if (!cloneResult.path) {
        throw new Error('Clone succeeded but no path returned');
      }
      
      const analysisResult = await analyzeFrameworkBrowser(cloneResult.path, repoUrl);
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
