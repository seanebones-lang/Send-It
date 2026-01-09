import { useState, useEffect, useCallback } from 'react';
import type { FrameworkAnalysisResult } from '../electron';

export interface AnalysisHistoryItem {
  id: string;
  repoUrl: string;
  framework: string;
  timestamp: number;
  scores?: Record<string, number>;
}

const STORAGE_KEY = 'send-it-analysis-history';
const MAX_HISTORY_ITEMS = 10;

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  // Load history from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load analysis history:', error);
      setHistory([]);
    }
  }, []);

  // Save history to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save analysis history:', error);
    }
  }, [history]);

  const addToHistory = useCallback((repoUrl: string, analysisResult: FrameworkAnalysisResult) => {
    if (!analysisResult.success || !analysisResult.framework) return;

    const newItem: AnalysisHistoryItem = {
      id: Math.random().toString(36).substring(7),
      repoUrl,
      framework: analysisResult.framework,
      timestamp: Date.now(),
      scores: analysisResult.scores,
    };

    setHistory((prev) => {
      // Remove duplicate URLs
      const filtered = prev.filter((item) => item.repoUrl !== repoUrl);
      // Add new item at the beginning
      const updated = [newItem, ...filtered];
      // Keep only the most recent MAX_HISTORY_ITEMS
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const getRecentAnalysis = useCallback((repoUrl: string): AnalysisHistoryItem | undefined => {
    return history.find((item) => item.repoUrl === repoUrl);
  }, [history]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentAnalysis,
  };
}
