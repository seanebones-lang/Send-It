/**
 * Step 2: Platform Discovery & Selection
 * Comprehensive platform browser with filtering, search, and recommendations
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, Grid, List, TrendingUp, Star, Zap } from 'lucide-react';
import { PlatformCard } from '../PlatformCard';
import { ALL_PLATFORMS, getRecommendedPlatforms, type Platform } from '../../data/platforms';

interface Step2PlatformDiscoveryProps {
  detectedFramework?: string;
  selectedPlatform?: string;
  onSelect: (platformId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type ViewMode = 'grid' | 'list';
type FilterCategory = 'all' | 'static' | 'fullstack' | 'serverless' | 'container' | 'database';
type SortOption = 'popularity' | 'tier' | 'name' | 'deployment-time';

export function Step2PlatformDiscovery({
  detectedFramework,
  selectedPlatform,
  onSelect,
  onNext,
  onBack,
}: Step2PlatformDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');

  // Get recommended platforms based on detected framework
  const recommendedPlatforms = useMemo(() => {
    if (detectedFramework) {
      return getRecommendedPlatforms(detectedFramework);
    }
    return ALL_PLATFORMS.filter(p => p.tier === 1).slice(0, 3);
  }, [detectedFramework]);

  // Filter and sort platforms
  const filteredPlatforms = useMemo(() => {
    let filtered = ALL_PLATFORMS;

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.frameworks.some(f => f.toLowerCase().includes(query)) ||
        p.features.some(f => f.toLowerCase().includes(query)) ||
        p.bestFor.some(b => b.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          const popularityOrder = { high: 3, medium: 2, low: 1 };
          return popularityOrder[b.popularity] - popularityOrder[a.popularity];
        case 'tier':
          return a.tier - b.tier;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'deployment-time':
          // Extract numbers from deployment time strings
          const getTime = (time: string) => {
            const match = time.match(/(\d+)/);
            return match ? parseInt(match[1]) : 999;
          };
          return getTime(a.deploymentTime) - getTime(b.deploymentTime);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, filterCategory, sortBy]);

  const supportedPlatforms = filteredPlatforms.filter(p => p.status === 'supported');
  const canContinue = selectedPlatform && supportedPlatforms.some(p => p.id === selectedPlatform);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Choose Your Deployment Platform
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Select from {ALL_PLATFORMS.length} platforms to deploy your application
        </p>
        {detectedFramework && recommendedPlatforms.length > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
            <Zap className="w-4 h-4" />
            <span>
              Detected framework: <strong>{detectedFramework}</strong> - Recommended platforms shown below
            </span>
          </div>
        )}
      </div>

      {/* Recommended Platforms (if framework detected) */}
      {detectedFramework && recommendedPlatforms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommended for {detectedFramework}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedPlatforms.slice(0, 6).map(platform => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                selected={selectedPlatform === platform.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search platforms by name, framework, or feature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          </div>
          {(['all', 'static', 'fullstack', 'serverless', 'container', 'database'] as FilterCategory[]).map(category => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${filterCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort & View */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="popularity">Popularity</option>
              <option value="tier">Priority Tier</option>
              <option value="name">Name (A-Z)</option>
              <option value="deployment-time">Deployment Time</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`
                p-2 rounded-lg transition-colors
                ${viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                p-2 rounded-lg transition-colors
                ${viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredPlatforms.length} platform{filteredPlatforms.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
          {filterCategory !== 'all' && ` in ${filterCategory} category`}
        </p>
        {selectedPlatform && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
            <span>Platform selected: <strong>{ALL_PLATFORMS.find(p => p.id === selectedPlatform)?.name}</strong></span>
          </div>
        )}
      </div>

      {/* Platform Grid/List */}
      {filteredPlatforms.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredPlatforms.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              selected={selectedPlatform === platform.id}
              onSelect={onSelect}
              showComparison={viewMode === 'list'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">No platforms found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('all');
            }}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!canContinue}
          className={`
            px-8 py-3 rounded-lg font-semibold transition-colors
            ${canContinue
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Configuration
        </button>
      </div>
    </div>
  );
}
