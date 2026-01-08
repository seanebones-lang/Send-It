import React, { useState, useEffect } from 'react';
import type { FrameworkAnalysisResult, CloneResult } from './electron';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [repoUrl, setRepoUrl] = useState('https://github.com/vercel/next.js.git');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FrameworkAnalysisResult | null>(null);
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleTestClone = async () => {
    if (!window.electronAPI?.repo?.clone) {
      console.error('electronAPI.repo.clone not available');
      return;
    }

    setLoading(true);
    setCloneResult(null);
    try {
      const result = await window.electronAPI.repo.clone(repoUrl);
      setCloneResult(result);
      if (result.success && result.path) {
        // Automatically analyze after cloning
        handleAnalyze(result.path);
      }
    } catch (error) {
      console.error('Clone error:', error);
      setCloneResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (repoPath: string) => {
    if (!window.electronAPI?.repo?.analyzeFramework) {
      console.error('electronAPI.repo.analyzeFramework not available');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const analysis = await window.electronAPI.repo.analyzeFramework(repoPath, repoUrl);
      setResult(analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <header className="p-6 shadow-md dark:shadow-gray-800 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Send-It</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Send-It</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Auto Prototype Deployment
            </p>
          </div>

          {/* Test Repo Clone & Analysis */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900 mb-6">
            <h3 className="text-xl font-semibold mb-4">Test Repo Analysis</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://github.com/user/repo.git"
                />
              </div>
              <button
                onClick={handleTestClone}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Clone & Analyze Repository'}
              </button>

              {cloneResult && (
                <div className={`p-4 rounded-lg ${cloneResult.success ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                  <p className="font-semibold">{cloneResult.success ? '✓ Clone Successful' : '✗ Clone Failed'}</p>
                  {cloneResult.path && <p className="text-sm mt-1">Path: {cloneResult.path}</p>}
                  {cloneResult.error && <p className="text-sm mt-1">Error: {cloneResult.error}</p>}
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                  <p className="font-semibold">{result.success ? '✓ Analysis Complete' : '✗ Analysis Failed'}</p>
                  {result.framework && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Framework: <span className="font-bold">{result.framework}</span></p>
                      {result.scores && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">Platform Scores:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(result.scores).map(([platform, score]) => (
                              <div key={platform} className="flex justify-between">
                                <span className="capitalize">{platform}:</span>
                                <span className="font-semibold">{score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {result.error && <p className="text-sm mt-1">Error: {result.error}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900">
              <h3 className="text-xl font-semibold mb-2">Git Operations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your git repository operations
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900">
              <h3 className="text-xl font-semibold mb-2">Deploy</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Deploy your prototypes automatically
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
