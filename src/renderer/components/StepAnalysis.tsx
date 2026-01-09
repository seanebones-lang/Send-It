import React from 'react';
import { useWizard } from '../contexts/WizardContext';
import { CheckCircle, XCircle, TrendingUp, ArrowRight } from 'lucide-react';
import type { Platform } from '../contexts/WizardContext';

const platformNames: Record<Platform, string> = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare Pages',
  aws: 'AWS Amplify',
  azure: 'Azure Static Web Apps',
  gcp: 'Google Cloud Run',
};

const platformColors: Record<Platform, string> = {
  vercel: 'bg-black dark:bg-white text-white dark:text-black',
  netlify: 'bg-green-600 text-white',
  cloudflare: 'bg-orange-500 text-white',
  aws: 'bg-yellow-500 text-black',
  azure: 'bg-blue-600 text-white',
  gcp: 'bg-blue-500 text-white',
};

export function StepAnalysis() {
  const { state, setSelectedPlatform, nextStep, prevStep } = useWizard();

  if (!state.analysisResult?.success || !state.analysisResult.scores) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            No analysis results available. Please go back and analyze a repository first.
          </p>
        </div>
        <button
          onClick={prevStep}
          className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const scores = state.analysisResult.scores;
  const sortedPlatforms = (Object.entries(scores) as [Platform, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const recommendedPlatform = sortedPlatforms[0][0];
  const excellentPlatforms = sortedPlatforms.filter(([, score]) => score >= 90);
  const goodPlatforms = sortedPlatforms.filter(([, score]) => score >= 70 && score < 90);
  const fairPlatforms = sortedPlatforms.filter(([, score]) => score < 70);

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Platform Recommendations</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Based on your <span className="font-semibold">{state.analysisResult.framework}</span> framework, here are
          the recommended deployment platforms:
        </p>
      </div>

      {/* Recommended Platform */}
      {excellentPlatforms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            Recommended
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {excellentPlatforms.map(([platform, score]) => (
              <button
                key={platform}
                onClick={() => handlePlatformSelect(platform)}
                className={`p-6 rounded-lg border-2 ${
                  state.selectedPlatform === platform
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-white dark:bg-gray-800 transition-all text-left`}
                aria-pressed={state.selectedPlatform === platform}
                aria-label={`Select ${platformNames[platform]} platform (score: ${score})`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${platformColors[platform]}`}>
                    {platformNames[platform]}
                  </span>
                  {getScoreIcon(score)}
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Good Platforms */}
      {goodPlatforms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Good Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goodPlatforms.map(([platform, score]) => (
              <button
                key={platform}
                onClick={() => handlePlatformSelect(platform)}
                className={`p-4 rounded-lg border ${
                  state.selectedPlatform === platform
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-white dark:bg-gray-800 transition-all text-left`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {platformNames[platform]}
                  </span>
                  {getScoreIcon(score)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fair Platforms */}
      {fairPlatforms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Other Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fairPlatforms.map(([platform, score]) => (
              <button
                key={platform}
                onClick={() => handlePlatformSelect(platform)}
                className={`p-4 rounded-lg border ${
                  state.selectedPlatform === platform
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-white dark:bg-gray-800 transition-all text-left`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {platformNames[platform]}
                  </span>
                  {getScoreIcon(score)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!state.selectedPlatform}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          aria-disabled={!state.selectedPlatform}
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
