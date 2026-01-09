import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../contexts/WizardContext';
import { useRepositoryAnalysis } from '../hooks/useRepositoryAnalysis';
import { GitBranch, Loader2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';

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
  const [inputRepoUrl, setInputRepoUrl] = React.useState(state.repoUrl || '');

  const {
    register,
    handleSubmit,
    watch,
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
    }
  }, [data, watchedUrl, setRepoUrl, setCloneResult, setAnalysisResult, setError]);

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="repoUrl" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Repository URL
          </label>
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
