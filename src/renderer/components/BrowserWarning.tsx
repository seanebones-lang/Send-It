import React from 'react';
import { AlertCircle, Download } from 'lucide-react';

export function BrowserWarning() {
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
  
  if (isElectron) {
    return null; // Don't show warning in Electron
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Browser Mode - Limited Functionality
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              This is a preview of the Send-It UI. For full functionality including repository cloning, 
              framework analysis, and deployments, please download the Electron desktop app.
            </p>
          </div>
          <a
            href="https://github.com/seanebones-lang/Send-It/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Desktop App
          </a>
        </div>
      </div>
    </div>
  );
}
