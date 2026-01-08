import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CloneResult, FrameworkAnalysisResult } from '../electron';

export type Platform = 'vercel' | 'netlify' | 'cloudflare' | 'aws' | 'azure' | 'gcp';

export interface WizardState {
  currentStep: number;
  repoUrl: string;
  repoPath: string | null;
  cloneResult: CloneResult | null;
  analysisResult: FrameworkAnalysisResult | null;
  selectedPlatform: Platform | null;
  envVars: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export interface WizardContextType {
  state: WizardState;
  setRepoUrl: (url: string) => void;
  setCloneResult: (result: CloneResult) => void;
  setAnalysisResult: (result: FrameworkAnalysisResult) => void;
  setSelectedPlatform: (platform: Platform) => void;
  setEnvVar: (key: string, value: string) => void;
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
  envVars: {},
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

  const setEnvVar = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      envVars: { ...prev.envVars, [key]: value },
    }));
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
      currentStep: Math.min(prev.currentStep + 1, 2),
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
      currentStep: Math.max(0, Math.min(step, 2)),
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
        setEnvVar,
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
