# TanStack Integration Quick Reference

## Overview

This guide provides quick reference for using the TanStack integrations in Send-It.

## React Query Usage

### Repository Analysis Hook

```tsx
import { useRepositoryAnalysis } from '../hooks/useRepositoryAnalysis';

function MyComponent() {
  const { data, isLoading, isError, error, refetch } = useRepositoryAnalysis(repoUrl);
  
  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  
  // data contains { cloneResult, analysisResult }
  return <div>Framework: {data?.analysisResult.framework}</div>;
}
```

**Key Features**:
- Automatic prefetching when URL changes
- 5-minute cache (instant results for cached repos)
- Automatic retry on failure

### Deployment History Hook

```tsx
import { useDeploymentHistory } from '../hooks/useDeploymentHistory';

function DeploymentList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useDeploymentHistory();
  
  return (
    <div>
      {data?.pages.map((page) =>
        page.deployments.map((deployment) => (
          <DeploymentCard key={deployment.id} deployment={deployment} />
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load More
        </button>
      )}
    </div>
  );
}
```

## React Table Usage

### Platform Table Component

```tsx
import { PlatformTable, type PlatformRow } from '../components/PlatformTable';

const platforms: PlatformRow[] = [
  { platform: 'vercel', score: 95, features: ['SSR', 'CDN'], recommended: true },
  { platform: 'netlify', score: 88, features: ['JAMstack'], recommended: false },
];

<PlatformTable
  data={platforms}
  selectedPlatform={selectedPlatform}
  onSelect={(platform) => setSelectedPlatform(platform)}
/>
```

**Features**:
- Automatic mobile/desktop switching
- Sortable columns (click headers)
- Searchable (type in search box)
- Accessible (keyboard navigation, ARIA labels)

## React Virtual Usage

### Virtualized Environment Variables

```tsx
import { VirtualizedEnvList, type EnvField } from '../components/VirtualizedEnvList';

const fields: EnvField[] = [
  { id: '1', key: 'API_KEY', value: '***', description: 'API key', isPassword: true },
  // ... more fields
];

<VirtualizedEnvList
  fields={fields}
  onRemove={(id) => removeField(id)}
  onUpdate={(id, updates) => updateField(id, updates)}
  register={register}
  errors={errors}
/>
```

**Performance**: Only renders visible rows (5-10 at a time), handles 1000+ vars smoothly.

## Query Client Configuration

The QueryClient is configured in `src/renderer/providers/QueryProvider.tsx`:

- **staleTime**: 5 minutes (data considered fresh)
- **gcTime**: 30 minutes (cache retention)
- **retry**: 2 attempts on failure
- **refetchOnWindowFocus**: false (Electron-specific)

## Development Tools

React Query DevTools are automatically enabled in development mode. Press the floating button in the bottom-left corner to inspect:
- Active queries
- Cache contents
- Query states
- Network requests

## Common Patterns

### Prefetching Data

```tsx
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Prefetch before user needs it
queryClient.prefetchQuery({
  queryKey: ['repository', 'analysis', repoUrl],
  queryFn: () => analyzeRepository(repoUrl),
});
```

### Optimistic Updates

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updatePlatform,
  onMutate: async (newPlatform) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['platforms'] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['platforms']);
    
    // Optimistically update
    queryClient.setQueryData(['platforms'], (old) => [...old, newPlatform]);
    
    return { previous };
  },
  onError: (err, newPlatform, context) => {
    // Rollback on error
    queryClient.setQueryData(['platforms'], context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['platforms'] });
  },
});
```

### Manual Cache Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['repository', 'analysis'] });

// Invalidate all repository queries
queryClient.invalidateQueries({ queryKey: ['repository'] });
```

## Performance Tips

1. **Use prefetching** for data users will likely need next
2. **Set appropriate staleTime** based on data freshness requirements
3. **Use virtualization** for lists with 50+ items
4. **Leverage caching** - React Query handles this automatically
5. **Monitor with DevTools** to see cache hit rates

## Troubleshooting

### Query not updating
- Check `staleTime` - data might be cached
- Use `refetch()` or `invalidateQueries()` to force update

### Performance issues
- Check if virtualization is needed for long lists
- Verify `gcTime` isn't too long (causing memory issues)
- Use DevTools to see query execution times

### Type errors
- Ensure query keys are typed consistently
- Use TypeScript generics: `useQuery<DataType>({...})`

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Table Docs](https://tanstack.com/table/v8)
- [TanStack Virtual Docs](https://tanstack.com/virtual/v3)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Full Redesign Document](./UI_UX_REDESIGN.md)
