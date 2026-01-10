/**
 * Platform Card Component
 * Displays platform information in a sleek, professional card format
 */

import React from 'react';
import { Platform } from '../data/platforms';
import { Check, X, Clock, Globe, Zap, Shield, TrendingUp } from 'lucide-react';

interface PlatformCardProps {
  platform: Platform;
  selected?: boolean;
  onSelect?: (platformId: string) => void;
  showComparison?: boolean;
}

export function PlatformCard({ platform, selected, onSelect, showComparison }: PlatformCardProps) {
  const isSupported = platform.status === 'supported';
  const badgeColor = isSupported 
    ? 'bg-green-500' 
    : platform.status === 'planned' 
    ? 'bg-yellow-500' 
    : 'bg-gray-500';

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${selected 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50 dark:bg-blue-950/20' 
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
        }
        ${showComparison ? 'h-full' : ''}
      `}
      onClick={() => onSelect?.(platform.id)}
    >
      {/* Status Badge */}
      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold text-white ${badgeColor}`}>
        {platform.status === 'supported' ? 'Available' : platform.status === 'planned' ? 'Coming Soon' : 'Planned'}
      </div>

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="text-4xl font-bold">{platform.logo}</div>
          
          {/* Title & Category */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {platform.name}
            </h3>
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {platform.category}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {platform.description}
        </p>
      </div>

      {/* Pricing */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {platform.pricing.free ? 'Free tier available' : 'Paid only'}
          </span>
          {platform.pricing.freeTier && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {platform.pricing.freeTier}
            </span>
          )}
        </div>
        {platform.pricing.paid && (
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Starting at {platform.pricing.paid}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">{platform.deploymentTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {platform.regions ? `${platform.regions.length} regions` : 'Global'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{platform.popularity}</span>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {platform.features.slice(0, 6).map((feature, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <Check className="w-3 h-3" />
              {feature}
            </span>
          ))}
          {platform.features.length > 6 && (
            <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{platform.features.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Best For */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Best For:</h4>
        <div className="flex flex-wrap gap-1">
          {platform.bestFor.map((useCase, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
              {useCase}
            </span>
          ))}
        </div>
      </div>

      {/* Pros & Cons (Collapsible in comparison view) */}
      {showComparison && (
        <>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Pros
                </h4>
                <ul className="space-y-1">
                  {platform.pros.map((pro, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Cons
                </h4>
                <ul className="space-y-1">
                  {platform.cons.map((con, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">•</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Supported Frameworks */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Frameworks:</h4>
            <div className="flex flex-wrap gap-1">
              {platform.frameworks.map((framework, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  {framework}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <a
            href={platform.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View Docs →
          </a>
          {isSupported && (
            <button
              className={`
                px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${selected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                }
              `}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(platform.id);
              }}
            >
              {selected ? 'Selected' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-4 left-4">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
