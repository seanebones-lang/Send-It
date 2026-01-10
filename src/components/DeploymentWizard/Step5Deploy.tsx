/**
 * Step 5: Review & Deploy
 * CRITICAL: This is where actual deployment happens
 * 
 * Shows:
 * - Deployment preview/summary
 * - Configuration review
 * - CRITICAL: Deploy button that triggers real deployment
 * - Real-time deployment logs
 * - Deployment status
 * - Success screen with actual deployment URL
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Rocket,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { webDeploymentService } from '../../services/WebDeploymentService';
import { getPlatform } from '../../data/platforms';
import type { DeployConfig, DeployResult } from '../../types/ipc';

interface DeploymentSummary {
  platform: string;
  repository: string;
  branch?: string;
  projectName?: string;
  environmentVariables: number;
  buildCommand?: string;
}

interface Step5DeployProps {
  deploymentConfig: DeployConfig & { repoUrl?: string; framework?: string };
  onDeploymentComplete?: (result: DeployResult) => void;
  onBack?: () => void;
}

type DeploymentPhase = 'idle' | 'queued' | 'building' | 'deploying' | 'live' | 'failed';

export function Step5Deploy({ deploymentConfig, onDeploymentComplete, onBack }: Step5DeployProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeployResult | null>(null);
  const [deploymentPhase, setDeploymentPhase] = useState<DeploymentPhase>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const platform = getPlatform(deploymentConfig.platform);

  // Subscribe to logs from deployment service
  useEffect(() => {
    if (!deploymentId || !isDeploying) return;

    const unsubscribe = webDeploymentService.getLogService().onLog(deploymentId, (message: string) => {
      setLogs(prev => [...prev, message]);
    });

    return unsubscribe;
  }, [deploymentId, isDeploying]);

  const handleDeploy = async () => {
    if (!platform) {
      setError(`Platform ${deploymentConfig.platform} not found`);
      return;
    }

    if (platform.status !== 'supported') {
      setError(`Platform ${deploymentConfig.platform} is not yet supported`);
      return;
    }

    setIsDeploying(true);
    setError(null);
    setLogs([]);
    setDeploymentPhase('queued');

    try {
      // Generate deployment ID
      const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setDeploymentId(deploymentId);

      // CRITICAL: This is where actual deployment happens - directly from browser!
      // No backend needed - calls platform APIs directly
      const result = await webDeploymentService.deploy(deploymentConfig, deploymentId);

      if (result.success) {
        setDeploymentPhase('live');
        setDeploymentResult(result);
        setIsDeploying(false);
        onDeploymentComplete?.(result);
      } else {
        setError(result.error || 'Deployment failed');
        setDeploymentPhase('failed');
        setDeploymentResult(result);
        setIsDeploying(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setDeploymentPhase('failed');
      setIsDeploying(false);
    }
  };

  const handleCopyUrl = () => {
    if (deploymentResult?.url) {
      navigator.clipboard.writeText(deploymentResult.url);
    }
  };

  const summary: DeploymentSummary = {
    platform: platform?.name || deploymentConfig.platform,
    repository: deploymentConfig.repoUrl || deploymentConfig.repoPath,
    branch: deploymentConfig.branch,
    projectName: deploymentConfig.projectName,
    environmentVariables: Object.keys(deploymentConfig.envVars || {}).length,
    buildCommand: undefined, // Can be added if needed
  };

  // Success State
  if (deploymentResult?.success && deploymentResult.url) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Deployment Successful! 🚀
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your application has been deployed to {platform?.name}
          </p>
        </div>

        {/* Deployment URL */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deployment URL
              </label>
              <div className="flex items-center gap-2">
                <a
                  href={deploymentResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm truncate flex-1"
                >
                  {deploymentResult.url}
                </a>
                <button
                  onClick={handleCopyUrl}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <a
                  href={deploymentResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Next Steps
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Visit your deployment</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your app is live and ready to use
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Set up custom domain</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add your own domain in the {platform?.name} dashboard
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Monitor your deployment</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check logs and metrics in the platform dashboard
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Deploy Another
            </button>
          )}
          <a
            href={deploymentResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-center flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Visit Deployment
          </a>
        </div>
      </div>
    );
  }

  // Failed State
  if (deploymentPhase === 'failed' || error) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Deployment Failed
          </h2>
          <p className="text-lg text-red-600 dark:text-red-400">
            {error || deploymentResult?.error || 'Something went wrong'}
          </p>
        </div>

        {/* Error Details */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Go Back
            </button>
          )}
          <button
            onClick={handleDeploy}
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Deployment In Progress
  if (isDeploying || deploymentPhase !== 'idle') {
    const phaseLabels = {
      queued: 'Queued',
      building: 'Building',
      deploying: 'Deploying',
      live: 'Live',
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Deploying to {platform?.name}...
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {phaseLabels[deploymentPhase] || 'Processing'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {(['queued', 'building', 'deploying', 'live'] as DeploymentPhase[]).map((phase, index) => {
            const isActive = deploymentPhase === phase;
            const isComplete = 
              (phase === 'queued' && ['building', 'deploying', 'live'].includes(deploymentPhase)) ||
              (phase === 'building' && ['deploying', 'live'].includes(deploymentPhase)) ||
              (phase === 'deploying' && deploymentPhase === 'live') ||
              (phase === 'live' && deploymentPhase === 'live');

            return (
              <div key={phase} className="flex-1 flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                    ${isComplete 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900' 
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-medium ${isActive || isComplete ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {phaseLabels[phase]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
            {isDeploying && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deploying...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Review & Deploy State
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ready to Deploy
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Review your configuration and deploy to {platform?.name}
        </p>
      </div>

      {/* Deployment Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Deployment Summary
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Platform
            </label>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {summary.platform}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Repository
            </label>
            <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
              {summary.repository.split('/').pop()}
            </p>
          </div>

          {summary.branch && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Branch
              </label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {summary.branch}
              </p>
            </div>
          )}

          {summary.projectName && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Project Name
              </label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {summary.projectName}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Environment Variables
            </label>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {summary.environmentVariables} variable{summary.environmentVariables !== 1 ? 's' : ''}
            </p>
          </div>

          {summary.buildCommand && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Build Command
              </label>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {summary.buildCommand}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      {platform && platform.status !== 'supported' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Platform Status: {platform.status}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              This platform is not yet fully supported. Deployment may not work as expected.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Back
          </button>
        )}
        
        {/* CRITICAL: This is the actual deploy button */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying || !platform || platform.status !== 'supported'}
          className={`
            flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-all
            flex items-center justify-center gap-3
            ${isDeploying || !platform || platform.status !== 'supported'
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
            }
          `}
        >
          <Rocket className="w-6 h-6" />
          {isDeploying ? 'Deploying...' : 'Deploy Now'}
        </button>
      </div>
    </div>
  );
}
