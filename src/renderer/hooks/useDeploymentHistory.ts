import { useInfiniteQuery } from '@tanstack/react-query';
import type { ElectronAPI } from '../electron';

interface Deployment {
  id: string;
  platform: string;
  status: 'success' | 'failed' | 'pending' | 'building';
  url?: string;
  createdAt: string;
  repoUrl: string;
}

interface DeploymentHistoryResponse {
  deployments: Deployment[];
  hasMore: boolean;
  total: number;
}

// This hook assumes the Electron API has a deployments.list method
// You may need to implement this in the main process
export function useDeploymentHistory() {
  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;

  return useInfiniteQuery<DeploymentHistoryResponse>({
    queryKey: ['deployments', 'history'],
    queryFn: async ({ pageParam = 0 }) => {
      if (!electronAPI?.deployments?.list) {
        // Fallback: return empty if API not available
        return { deployments: [], hasMore: false, total: 0 };
      }

      const response = await electronAPI.deployments.list({
        offset: pageParam as number,
        limit: 50,
      });

      return response as DeploymentHistoryResponse;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * 50 : undefined;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
