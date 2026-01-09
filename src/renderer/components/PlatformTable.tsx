import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { Platform } from '../contexts/WizardContext';
import { CheckCircle, TrendingUp, XCircle, Search, DollarSign } from 'lucide-react';
import { platformCosts, getCostRatingLabel, getCostRatingColor } from '../data/platformCosts';

const platformNames: Record<Platform, string> = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare Pages',
  aws: 'AWS Amplify',
  azure: 'Azure Static Web Apps',
  gcp: 'Google Cloud Run',
};

const platformColors: Record<Platform, string> = {
  vercel: 'bg-black dark:bg-white text-white dark:text-black',
  netlify: 'bg-green-600 text-white',
  cloudflare: 'bg-orange-500 text-white',
  aws: 'bg-yellow-500 text-black',
  azure: 'bg-blue-600 text-white',
  gcp: 'bg-blue-500 text-white',
};

export interface PlatformRow {
  platform: Platform;
  score: number;
  features: string[];
  recommended: boolean;
  costRating?: number;
}

interface PlatformTableProps {
  data: PlatformRow[];
  selectedPlatform: Platform | null;
  onSelect: (platform: Platform) => void;
}

export function PlatformTable({ data, selectedPlatform, onSelect }: PlatformTableProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'score', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  const columns = useMemo<ColumnDef<PlatformRow>[]>(
    () => [
      {
        accessorKey: 'platform',
        header: 'Platform',
        cell: ({ row }) => (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${platformColors[row.original.platform]}`}>
            {platformNames[row.original.platform]}
          </span>
        ),
      },
      {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ row }) => {
          const score = row.original.score;
          return (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getScoreIcon(score)}
                <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
              </div>
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'features',
        header: 'Features',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.original.features.join(', ')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => onSelect(row.original.platform)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPlatform === row.original.platform
                ? 'bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-800'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={selectedPlatform === row.original.platform}
          >
            {selectedPlatform === row.original.platform ? 'Selected' : 'Select'}
          </button>
        ),
      },
    ],
    [selectedPlatform, onSelect]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Mobile card layout
  if (isMobile) {
    const filteredRows = table.getFilteredRowModel().rows;
    const sortedRows = table.getSortedRowModel().rows;

    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search platforms..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search platforms"
          />
        </div>
        <div className="space-y-3" role="list">
          {sortedRows.map((row) => {
            const platform = row.original;
            const isSelected = selectedPlatform === platform.platform;
            return (
              <div
                key={row.id}
                role="listitem"
                className={`p-4 border-2 rounded-lg transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${platformColors[platform.platform]}`}>
                    {platformNames[platform.platform]}
                  </span>
                  {getScoreIcon(platform.score)}
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-2xl font-bold ${getScoreColor(platform.score)}`}>
                      {platform.score}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        platform.score >= 90 ? 'bg-green-500' : platform.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${platform.score}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <strong>Features:</strong> {platform.features.join(', ')}
                </div>
                <button
                  onClick={() => onSelect(platform.platform)}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? 'Selected' : 'Select Platform'}
                </button>
              </div>
            );
          })}
        </div>
        {sortedRows.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No platforms found matching "{globalFilter}"
          </div>
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search platforms..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search platforms"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" role="table" aria-label="Platform comparison table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                  >
                    {header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label={`Sort by ${header.column.id} ${header.column.getIsSorted() === 'asc' ? 'descending' : 'ascending'}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && '↑'}
                        {header.column.getIsSorted() === 'desc' && '↓'}
                        {!header.column.getIsSorted() && '⇅'}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedPlatform === row.original.platform ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.getRowModel().rows.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No platforms found matching "{globalFilter}"
        </div>
      )}
      <div className="text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
        Showing {table.getRowModel().rows.length} of {data.length} platforms
      </div>
    </div>
  );
}
