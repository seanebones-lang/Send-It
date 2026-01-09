import React, { useState } from 'react';
import { AlertCircle, Download, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export function BrowserWarning() {
  const [expanded, setExpanded] = useState(false);
  
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && 
    (window as any).process?.type === 'renderer';
  
  if (isElectron) {
    return null; // Don't show warning in Electron
  }

  // Feature availability in browser mode
  const features = [
    { name: 'Repository Analysis (GitHub)', available: true, description: 'Analyze public GitHub repositories' },
    { name: 'Framework Detection', available: true, description: 'Detect web frameworks from package.json' },
    { name: 'Platform Recommendations', available: true, description: 'Get deployment platform suggestions' },
    { name: 'Actual Deployment', available: false, description: 'Deploy to Vercel, Netlify, etc.' },
    { name: 'Token Management', available: false, description: 'Secure API token storage' },
    { name: 'Git Operations', available: false, description: 'Commit, push, pull operations' },
    { name: 'Local Repository Cloning', available: false, description: 'Clone repos to local filesystem' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b border-yellow-200 dark:border-yellow-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  🌐 Browser Preview Mode - Limited Functionality
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  You can analyze GitHub repositories and get platform recommendations. 
                  For deployments and full features, download the desktop app.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  aria-expanded={expanded}
                  aria-label={expanded ? 'Hide feature details' : 'Show feature details'}
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Features
                </button>
                <a
                  href="https://github.com/seanebones-lang/Send-It/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Download className="w-3 h-3" />
                  Desktop App
                </a>
              </div>
            </div>
            
            {expanded && (
              <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                  Feature Availability:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {features.map((feature) => (
                    <div
                      key={feature.name}
                      className="flex items-start gap-2 text-xs"
                    >
                      {feature.available ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className={`font-medium ${feature.available ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {feature.name}
                        </span>
                        <p className="text-yellow-600 dark:text-yellow-400 text-[10px] mt-0.5">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
