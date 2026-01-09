import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../contexts/WizardContext';
import { useRepositoryAnalysis } from '../hooks/useRepositoryAnalysis';
import { useAnalysisHistory } from '../hooks/useAnalysisHistory';
import { GitBranch, Loader2, AlertCircle, RefreshCw, Clock, Sparkles, Star, History, Trash2 } from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';
import { exampleRepositories, type ExampleRepository } from '../data/exampleRepositories';

const repoUrlSchema = z.object({
  repoUrl: z
    .string()
    .min(1, 'Repository URL is required')
    .url('Invalid URL format')
    .refine(
      (url) => url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org'),
      'Please provide a valid GitHub, GitLab, or Bitbucket URL'
    ),
});

type RepoUrlForm = z.infer<typeof repoUrlSchema>;

export function StepRepo() {
  const { state, setRepoUrl, setCloneResult, setAnalysisResult, setError, nextStep } = useWizard();
  const [inputRepoUrl, setInputRepoUrl] = useState(state.repoUrl || '');
  const [showExamples, setShowExamples] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { history, addToHistory, removeFromHistory, clearHistory } = useAnalysisHistory();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RepoUrlForm>({
    resolver: zodResolver(repoUrlSchema),
    defaultValues: {
      repoUrl: state.repoUrl || '',
    },
  });

  const watchedUrl = watch('repoUrl');
  const { data, isLoading, isError, error, refetch, isFetching } = useRepositoryAnalysis(
    watchedUrl || null
  );

  // Update wizard state when query succeeds
  useEffect(() => {
    if (data && data.analysisResult) {
      setRepoUrl(watchedUrl || '');
      setCloneResult(data.cloneResult);
      setAnalysisResult(data.analysisResult);
      setError(null);
      // Add to history
      if (watchedUrl) {
        addToHistory(watchedUrl, data.analysisResult);
      }
    }
  }, [data, watchedUrl, setRepoUrl, setCloneResult, setAnalysisResult, setError, addToHistory]);

  // Update error state when query fails
  useEffect(() => {
    if (isError && error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze repository');
    }
  }, [isError, error, setError]);

  const onSubmit = async (formData: RepoUrlForm) => {
    setInputRepoUrl(formData.repoUrl);
    // Trigger the query if not already running
    if (!isLoading && !isFetching) {
      await refetch();
    }
    // If we have cached query data, move to next step immediately
    if (data?.analysisResult?.success) {
      nextStep();
    }
  };

  const handleContinue = () => {
    if (data?.analysisResult?.success) {
      nextStep();
    }
  };

  const handleExampleClick = (example: ExampleRepository) => {
    setInputRepoUrl(example.url);
    setValue('repoUrl', example.url);
    setShowExamples(false);
    // Trigger analysis
    setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 100);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GitBranch className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repository Setup</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Enter the Git repository URL to clone and analyze the project framework.
        </p>
      </div>

      {/* Example Repositories */}
      {showExamples && !data && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Try an Example
              </h3>
            </div>
            <button
              onClick={() => setShowExamples(false)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Hide Examples
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Click any example below to instantly analyze a popular repository
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exampleRepositories.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => handleExampleClick(example)}
                className={`relative p-4 rounded-lg border-2 border-transparent bg-gradient-to-br ${example.color} text-white hover:scale-105 transition-transform duration-200 text-left group overflow-hidden`}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{example.icon}</span>
                    <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3" />
                      {example.stars}
                    </div>
                  </div>
                  <h4 className="font-semibold text-lg mb-1">{example.name}</h4>
                  <p className="text-sm opacity-90 mb-2">{example.description}</p>
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <GitBranch className="w-3 h-3" />
                    <span className="truncate">{example.framework}</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 <strong>Pro tip:</strong> These examples are real repositories. Analysis results show actual framework detection and platform recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Recent Analysis History */}
      {history.length > 0 && !data && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Analyses
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({history.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {showHistory ? 'Hide' : 'Show'}
              </button>
              {showHistory && (
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              )}
            </div>
          </div>
          {showHistory && (
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setValue('repoUrl', item.repoUrl);
                    setInputRepoUrl(item.repoUrl);
                    handleSubmit(onSubmit)();
                  }}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.framework}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {item.repoUrl}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(item.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Repository URL
            </label>
            {!showExamples && !data && (
              <button
                type="button"
                onClick={() => setShowExamples(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Show Examples
              </button>
            )}
          </div>
          <input
            id="repoUrl"
            type="text"
            {...register('repoUrl')}
            placeholder="https://github.com/vercel/next.js.git"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.repoUrl
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
            disabled={isSubmitting || state.loading}
            aria-invalid={errors.repoUrl ? 'true' : 'false'}
            aria-describedby={errors.repoUrl ? 'repoUrl-error' : undefined}
          />
          {errors.repoUrl && (
            <p id="repoUrl-error" className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              {errors.repoUrl.message}
            </p>
          )}
        </div>

        {/* Loading State */}
        {(isLoading || isFetching) && (
          <div className="space-y-4">
            <SkeletonLoader className="h-12 w-full" />
            <SkeletonLoader className="h-24 w-full" />
          </div>
        )}

        {/* Error State */}
        {(isError || state.error) && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Analysis Failed</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error instanceof Error ? error.message : state.error || 'Failed to analyze repository'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {data && data.cloneResult?.success && data.analysisResult?.success && (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Repository cloned successfully to: {data.cloneResult.path}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                ✓ Framework detected: <span className="font-semibold">{data.analysisResult.framework}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Continue to Analysis
            </button>
          </div>
        )}

        {/* Submit Button - Only show if no data yet */}
        {!data && (
          <button
            type="submit"
            disabled={isSubmitting || isLoading || isFetching}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            aria-busy={isSubmitting || isLoading || isFetching}
          >
            {isSubmitting || isLoading || isFetching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <GitBranch className="w-5 h-5" />
                Clone & Analyze
              </>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
