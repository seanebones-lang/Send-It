import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
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
    <motion.div 
      className="w-full max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="glass-dark rounded-2xl p-8 shadow-2xl mb-6"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <motion.div 
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <GitBranch className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Repository Analysis</h2>
            <p className="text-gray-300">
              Intelligent framework detection with AI-powered recommendations
            </p>
          </div>
        </div>
      </motion.div>

      {/* Example Repositories - Premium Design */}
      {showExamples && !data && (
        <motion.div 
          className="glass-dark rounded-2xl p-8 shadow-2xl mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              <h3 className="text-2xl font-bold text-white">
                Quick Start Examples
              </h3>
            </div>
            <button
              onClick={() => setShowExamples(false)}
              className="text-sm text-gray-300 hover:text-white transition-colors glass px-4 py-2 rounded-lg"
            >
              Hide
            </button>
          </div>
          <p className="text-gray-300 mb-6">
            Instant analysis of popular frameworks - click to see real results
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exampleRepositories.map((example, index) => (
              <motion.button
                key={example.id}
                type="button"
                onClick={() => handleExampleClick(example)}
                className={`relative p-6 rounded-xl bg-gradient-to-br ${example.color} text-white text-left group overflow-hidden`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{example.icon}</span>
                    <div className="flex items-center gap-1 text-xs bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      {example.stars}
                    </div>
                  </div>
                  <h4 className="font-bold text-xl mb-2">{example.name}</h4>
                  <p className="text-sm opacity-90 mb-3 line-clamp-2">{example.description}</p>
                  <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                    <GitBranch className="w-4 h-4" />
                    <span>{example.framework}</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </motion.button>
            ))}
          </div>
          <div className="mt-6 glass rounded-xl p-4 border border-blue-400/30">
            <p className="text-sm text-blue-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <strong>Pro tip:</strong> Real repository analysis with live framework detection and platform scoring
            </p>
          </div>
        </motion.div>
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
        <div className="glass-dark rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="repoUrl" className="block text-lg font-semibold text-white">
              🔗 Repository URL
            </label>
            {!showExamples && !data && (
              <button
                type="button"
                onClick={() => setShowExamples(true)}
                className="text-sm text-blue-300 hover:text-white transition-colors glass px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Examples
              </button>
            )}
          </div>
          <input
            id="repoUrl"
            type="text"
            {...register('repoUrl')}
            placeholder="https://github.com/vercel/next.js.git"
            className={`w-full px-6 py-4 rounded-xl border-2 ${
              errors.repoUrl
                ? 'border-red-500 focus:ring-red-500'
                : 'border-white/20 focus:ring-blue-500 focus:border-blue-500'
            } bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all-smooth text-lg`}
            disabled={isSubmitting || state.loading}
            aria-invalid={errors.repoUrl ? 'true' : 'false'}
            aria-describedby={errors.repoUrl ? 'repoUrl-error' : undefined}
          />
          {errors.repoUrl && (
            <p id="repoUrl-error" className="mt-3 text-sm text-red-400 flex items-center gap-2 glass px-4 py-2 rounded-lg" role="alert">
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
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="glass-dark rounded-xl p-6 border-2 border-green-400/50"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Repository Analyzed</p>
                  <p className="text-sm text-gray-300">
                    {data.cloneResult.path}
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="glass-dark rounded-xl p-6 border-2 border-blue-400/50"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Framework Detected</p>
                  <p className="text-lg text-blue-400 font-bold">
                    {data.analysisResult.framework}
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.button
              type="button"
              onClick={handleContinue}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Continue to Analysis →
            </motion.button>
          </motion.div>
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
    </motion.div>
  );
}
