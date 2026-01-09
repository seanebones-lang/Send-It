import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

export function SkeletonLoader({ className = '', count = 1 }: SkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
          aria-label="Loading"
          role="status"
        />
      ))}
    </>
  );
}

export function PlatformCardSkeleton() {
  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader className="h-6 w-24" />
        <SkeletonLoader className="h-5 w-5 rounded-full" />
      </div>
      <div className="mb-4">
        <SkeletonLoader className="h-8 w-16 mb-2" />
        <SkeletonLoader className="h-2 w-full rounded-full" />
      </div>
      <SkeletonLoader className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="px-4 py-3">
        <SkeletonLoader className="h-6 w-24" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <SkeletonLoader className="h-6 w-12" />
          <SkeletonLoader className="h-2 w-24 rounded-full" />
        </div>
      </td>
      <td className="px-4 py-3">
        <SkeletonLoader className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <SkeletonLoader className="h-10 w-20 rounded-lg" />
      </td>
    </tr>
  );
}
