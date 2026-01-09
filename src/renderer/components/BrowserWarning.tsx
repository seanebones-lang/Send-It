import React from 'react';
import { Sparkles, Zap, Globe } from 'lucide-react';

export function BrowserWarning() {
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && 
    (window as any).process?.type === 'renderer';
  
  if (isElectron) {
    return null; // Don't show in Electron
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3 text-white">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <p className="text-sm font-medium">
            ✨ <strong>Web-First Platform</strong> - Instant analysis, zero installation, powered by modern web APIs
          </p>
          <Zap className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
