import React, { useMemo } from 'react';
import { useWizard } from '../contexts/WizardContext';
import { CheckCircle, XCircle, TrendingUp, ArrowRight } from 'lucide-react';
import type { Platform } from '../contexts/WizardContext';
import { PlatformTable, type PlatformRow } from './PlatformTable';
import { SkeletonLoader, PlatformCardSkeleton } from './SkeletonLoader';

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
  
  // Transform to PlatformRow format for table
  const platformRows: PlatformRow[] = useMemo(() => {
    return sortedPlatforms.map(([platform, score]) => ({
      platform,
      score,
      features: getPlatformFeatures(platform, score),
      recommended: score >= 90,
    }));
  }, [sortedPlatforms]);

  const excellentPlatforms = sortedPlatforms.filter(([, score]) => score >= 90);
  const goodPlatforms = sortedPlatforms.filter(([, score]) => score >= 70 && score < 90);
  const fairPlatforms = sortedPlatforms.filter(([, score]) => score < 70);

  // Helper function to get platform features
  function getPlatformFeatures(platform: Platform, score: number): string[] {
    const features: string[] = [];
    if (platform === 'vercel') {
      features.push('SSR', 'CDN', 'Edge Functions');
    } else if (platform === 'netlify') {
      features.push('JAMstack', 'Functions', 'Forms');
    } else if (platform === 'cloudflare') {
      features.push('CDN', 'Workers', 'Pages');
    } else if (platform === 'aws') {
      features.push('S3', 'CloudFront', 'Lambda');
    } else if (platform === 'azure') {
      features.push('Static Web Apps', 'Functions');
    } else if (platform === 'gcp') {
      features.push('Cloud Run', 'Cloud Storage');
    }
    return features;
  }

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

      {/* Platform Comparison Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          Platform Recommendations
        </h3>
        <PlatformTable
          data={platformRows}
          selectedPlatform={state.selectedPlatform}
          onSelect={handlePlatformSelect}
        />
      </div>

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
