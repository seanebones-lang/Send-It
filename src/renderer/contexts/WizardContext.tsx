import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CloneResult, FrameworkAnalysisResult } from '../electron';
import type { AnalysisPlatform, DeployPlatform } from '../../types/ipc';

// For framework analysis recommendations
export type Platform = AnalysisPlatform;

export interface WizardState {
  currentStep: number;
  repoUrl: string;
  repoPath: string | null;
  cloneResult: CloneResult | null;
  analysisResult: FrameworkAnalysisResult | null;
  selectedPlatform: Platform | null;
  selectedDeployPlatform: string | null; // DeployPlatform ID (vercel, netlify, etc.)
  envVars: Record<string, string>;
  projectName?: string;
  branch?: string;
  framework?: string;
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
  loading: boolean;
  error: string | null;
}

export interface WizardContextType {
  state: WizardState;
  setRepoUrl: (url: string) => void;
  setCloneResult: (result: CloneResult) => void;
  setAnalysisResult: (result: FrameworkAnalysisResult) => void;
  setSelectedPlatform: (platform: Platform) => void;
  setSelectedDeployPlatform: (platform: string) => void;
  setEnvVar: (key: string, value: string) => void;
  setProjectName: (name: string) => void;
  setBranch: (branch: string) => void;
  setFramework: (framework: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

const initialState: WizardState = {
  currentStep: 0,
  repoUrl: '',
  repoPath: null,
  cloneResult: null,
  analysisResult: null,
  selectedPlatform: null,
  selectedDeployPlatform: null,
  envVars: {},
  projectName: undefined,
  branch: undefined,
  framework: undefined,
  buildCommand: undefined,
  startCommand: undefined,
  rootDirectory: undefined,
  loading: false,
  error: null,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const setRepoUrl = (url: string) => {
    setState((prev) => ({ ...prev, repoUrl: url }));
  };

  const setCloneResult = (result: CloneResult) => {
    setState((prev) => ({
      ...prev,
      cloneResult: result,
      repoPath: result.success ? result.path || null : null,
    }));
  };

  const setAnalysisResult = (result: FrameworkAnalysisResult) => {
    setState((prev) => ({ ...prev, analysisResult: result }));
  };

  const setSelectedPlatform = (platform: Platform) => {
    setState((prev) => ({ ...prev, selectedPlatform: platform }));
  };

  const setSelectedDeployPlatform = (platform: string) => {
    setState((prev) => ({ ...prev, selectedDeployPlatform: platform }));
  };

  const setEnvVar = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      envVars: { ...prev.envVars, [key]: value },
    }));
  };

  const setProjectName = (name: string) => {
    setState((prev) => ({ ...prev, projectName: name }));
  };

  const setBranch = (branch: string) => {
    setState((prev) => ({ ...prev, branch }));
  };

  const setFramework = (framework: string) => {
    setState((prev) => ({ ...prev, framework }));
  };

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const nextStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4), // 5 steps: 0-4
      error: null,
    }));
  };

  const prevStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
      error: null,
    }));
  };

  const goToStep = (step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, 4)), // 5 steps: 0-4
      error: null,
    }));
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <WizardContext.Provider
      value={{
        state,
        setRepoUrl,
        setCloneResult,
        setAnalysisResult,
        setSelectedPlatform,
        setSelectedDeployPlatform,
        setEnvVar,
        setProjectName,
        setBranch,
        setFramework,
        setLoading,
        setError,
        nextStep,
        prevStep,
        goToStep,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
