/**
 * Unit tests for WizardContext
 * Tests wizard state management and navigation
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { WizardProvider, useWizard } from './WizardContext';
import type { CloneResult, FrameworkAnalysisResult } from '../electron';

describe('WizardContext', () => {
  describe('Initial State', () => {
    it('should provide correct initial state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.repoUrl).toBe('');
      expect(result.current.state.repoPath).toBeNull();
      expect(result.current.state.cloneResult).toBeNull();
      expect(result.current.state.analysisResult).toBeNull();
      expect(result.current.state.selectedPlatform).toBeNull();
      expect(result.current.state.envVars).toEqual({});
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('State Updates', () => {
    it('should update repoUrl', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.setRepoUrl('https://github.com/test/repo.git');
      });

      expect(result.current.state.repoUrl).toBe('https://github.com/test/repo.git');
    });

    it('should update cloneResult and repoPath', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      const cloneResult: CloneResult = {
        success: true,
        path: '/tmp/cloned-repo',
      };

      act(() => {
        result.current.setCloneResult(cloneResult);
      });

      expect(result.current.state.cloneResult).toEqual(cloneResult);
      expect(result.current.state.repoPath).toBe('/tmp/cloned-repo');
    });

    it('should update repoPath to null when clone fails', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      const cloneResult: CloneResult = {
        success: false,
        error: 'Clone failed',
      };

      act(() => {
        result.current.setCloneResult(cloneResult);
      });

      expect(result.current.state.cloneResult).toEqual(cloneResult);
      expect(result.current.state.repoPath).toBeNull();
    });

    it('should update analysisResult', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      const analysisResult: FrameworkAnalysisResult = {
        success: true,
        framework: 'next.js',
        scores: {
          vercel: 100,
          netlify: 80,
          cloudflare: 70,
          aws: 60,
          azure: 50,
          gcp: 50,
        },
      };

      act(() => {
        result.current.setAnalysisResult(analysisResult);
      });

      expect(result.current.state.analysisResult).toEqual(analysisResult);
    });

    it('should update selectedPlatform', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.setSelectedPlatform('vercel');
      });

      expect(result.current.state.selectedPlatform).toBe('vercel');
    });

    it('should update envVars', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.setEnvVar('API_KEY', 'secret-value');
      });

      expect(result.current.state.envVars).toEqual({ API_KEY: 'secret-value' });

      act(() => {
        result.current.setEnvVar('DATABASE_URL', 'postgres://localhost');
      });

      expect(result.current.state.envVars).toEqual({
        API_KEY: 'secret-value',
        DATABASE_URL: 'postgres://localhost',
      });
    });

    it('should update loading state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.state.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.state.loading).toBe(false);
    });

    it('should update error state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.state.error).toBe('Something went wrong');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to next step', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(1);
      expect(result.current.state.error).toBeNull(); // Should clear error
    });

    it('should not exceed max step (2)', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.nextStep(); // Step 1
        result.current.nextStep(); // Step 2
        result.current.nextStep(); // Should stay at 2
      });

      expect(result.current.state.currentStep).toBe(2);
    });

    it('should navigate to previous step', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.nextStep(); // Step 1
        result.current.prevStep(); // Step 0
      });

      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.error).toBeNull(); // Should clear error
    });

    it('should not go below min step (0)', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.prevStep(); // Should stay at 0
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should navigate to specific step', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.state.currentStep).toBe(2);
      expect(result.current.state.error).toBeNull(); // Should clear error
    });

    it('should clamp step to valid range', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      act(() => {
        result.current.goToStep(5); // Should clamp to 2
      });

      expect(result.current.state.currentStep).toBe(2);

      act(() => {
        result.current.goToStep(-1); // Should clamp to 0
      });

      expect(result.current.state.currentStep).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset state to initial values', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WizardProvider>{children}</WizardProvider>
      );

      const { result } = renderHook(() => useWizard(), { wrapper });

      // Set some state
      act(() => {
        result.current.setRepoUrl('https://github.com/test/repo.git');
        result.current.nextStep();
        result.current.setSelectedPlatform('vercel');
        result.current.setEnvVar('API_KEY', 'value');
        result.current.setError('Error');
        result.current.setLoading(true);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.repoUrl).toBe('');
      expect(result.current.state.repoPath).toBeNull();
      expect(result.current.state.selectedPlatform).toBeNull();
      expect(result.current.state.envVars).toEqual({});
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useWizard());
      }).toThrow('useWizard must be used within WizardProvider');

      console.error = originalError;
    });
  });
});
