import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { getRateLimitInfo, getTimeUntilReset } from '../api/browserAPI';

export function RateLimitIndicator() {
  const [rateLimitInfo, setRateLimitInfo] = useState(getRateLimitInfo());
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimitInfo(getRateLimitInfo());
      setTimeUntilReset(getTimeUntilReset());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't show if we haven't made any API calls yet
  if (!rateLimitInfo) {
    return null;
  }

  const percentRemaining = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
  const isLow = percentRemaining < 20;
  const isExhausted = rateLimitInfo.remaining === 0;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 px-4 py-3 rounded-lg shadow-lg border ${
        isExhausted
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : isLow
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }`}
    >
      <div className="flex items-center gap-3">
        {isExhausted ? (
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        ) : (
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p
              className={`text-xs font-medium ${
                isExhausted
                  ? 'text-red-800 dark:text-red-300'
                  : isLow
                  ? 'text-yellow-800 dark:text-yellow-300'
                  : 'text-blue-800 dark:text-blue-300'
              }`}
            >
              GitHub API Rate Limit
            </p>
            <span
              className={`text-xs font-semibold ${
                isExhausted
                  ? 'text-red-600 dark:text-red-400'
                  : isLow
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {rateLimitInfo.remaining}/{rateLimitInfo.limit}
            </span>
          </div>
          <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isExhausted
                  ? 'bg-red-600'
                  : isLow
                  ? 'bg-yellow-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
          {(isLow || isExhausted) && timeUntilReset > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <p className="text-[10px] text-gray-600 dark:text-gray-400">
                Resets in {formatTime(timeUntilReset)}
              </p>
            </div>
          )}
        </div>
      </div>
      {isExhausted && (
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
          Download the desktop app for unlimited API access
        </p>
      )}
    </div>
  );
}
