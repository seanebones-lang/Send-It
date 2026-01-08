import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../contexts/WizardContext';
import { useElectron } from '../hooks/useElectron';
import { GitBranch, Loader2, AlertCircle } from 'lucide-react';

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
  const { state, setRepoUrl, setCloneResult, setAnalysisResult, setLoading, setError, nextStep } = useWizard();
  const { cloneRepo, analyzeFramework, isAvailable } = useElectron();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RepoUrlForm>({
    resolver: zodResolver(repoUrlSchema),
    defaultValues: {
      repoUrl: state.repoUrl || '',
    },
  });

  const onSubmit = async (data: RepoUrlForm) => {
    if (!isAvailable) {
      setError('Electron API not available');
      return;
    }

    setError(null);
    setLoading(true);
    setRepoUrl(data.repoUrl);

    try {
      // Clone repository
      const cloneResult = await cloneRepo(data.repoUrl);
      setCloneResult(cloneResult);

      if (!cloneResult.success) {
        setError(cloneResult.error || 'Failed to clone repository');
        setLoading(false);
        return;
      }

      if (!cloneResult.path) {
        setError('Clone succeeded but no path returned');
        setLoading(false);
        return;
      }

      // Analyze framework
      const analysisResult = await analyzeFramework(cloneResult.path, data.repoUrl);
      setAnalysisResult(analysisResult);

      if (!analysisResult.success) {
        setError(analysisResult.error || 'Failed to analyze framework');
        setLoading(false);
        return;
      }

      // Move to next step
      nextStep();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
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
          />
          {errors.repoUrl && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.repoUrl.message}
            </p>
          )}
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {state.error}
            </p>
          </div>
        )}

        {state.cloneResult?.success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Repository cloned successfully to: {state.cloneResult.path}
            </p>
          </div>
        )}

        {state.analysisResult?.success && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ✓ Framework detected: <span className="font-semibold">{state.analysisResult.framework}</span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || state.loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting || state.loading ? (
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
      </form>
    </div>
  );
}
