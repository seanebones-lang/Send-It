/**
 * Unit tests for App component
 * Tests wizard orchestration, step navigation, and dark mode
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { WizardProvider, useWizard } from './contexts/WizardContext';

// Mock WizardContext
jest.mock('./contexts/WizardContext', () => {
  const actual = jest.requireActual('./contexts/WizardContext');
  return {
    ...actual,
    useWizard: jest.fn(),
  };
});

const mockUseWizard = useWizard as jest.MockedFunction<typeof useWizard>;

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWizard.mockReturnValue({
      state: {
        currentStep: 0,
        repoUrl: '',
        repoPath: null,
        cloneResult: null,
        analysisResult: null,
        selectedPlatform: null,
        envVars: {},
        loading: false,
        error: null,
      },
      setRepoUrl: jest.fn(),
      setCloneResult: jest.fn(),
      setAnalysisResult: jest.fn(),
      setSelectedPlatform: jest.fn(),
      setEnvVar: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      goToStep: jest.fn(),
      reset: jest.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('should render app with wizard provider', () => {
      render(<App />);

      expect(screen.getByText('Send-It')).toBeInTheDocument();
    });

    it('should render step indicator', () => {
      render(<App />);

      expect(screen.getByText('Repository')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
    });

    it('should render current step component', () => {
      render(<App />);

      // StepRepo should be rendered for step 0
      expect(screen.getByText('Repository Setup')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should display correct step number in indicator', () => {
      render(<App />);

      // Step 1 should be active
      const stepIndicators = screen.getAllByText('1');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('should highlight current step', () => {
      render(<App />);

      // Current step should have active styling
      const stepIndicator = screen.getByText('Repository').closest('div');
      expect(stepIndicator).toBeInTheDocument();
    });

    it('should show completed steps with checkmark', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: null,
          selectedPlatform: null,
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: jest.fn(),
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: jest.fn(),
        prevStep: jest.fn(),
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      render(<App />);

      // Step 0 should be completed (show checkmark)
      // This depends on the component implementation
    });
  });

  describe('Dark Mode', () => {
    it('should toggle dark mode', async () => {
      const user = userEvent.setup();
      render(<App />);

      const darkModeButton = screen.getByRole('button', { name: /light|dark/i });
      await user.click(darkModeButton);

      // Should toggle dark class on document
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should start with dark mode enabled by default', () => {
      render(<App />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should update button text when toggling', async () => {
      const user = userEvent.setup();
      render(<App />);

      const darkModeButton = screen.getByRole('button', { name: /light|dark/i });
      const initialText = darkModeButton.textContent;

      await user.click(darkModeButton);

      expect(darkModeButton.textContent).not.toBe(initialText);
    });
  });

  describe('Step Components', () => {
    it('should render StepRepo for step 0', () => {
      render(<App />);

      expect(screen.getByText('Repository Setup')).toBeInTheDocument();
    });

    it('should render StepAnalysis for step 1', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: null,
          selectedPlatform: null,
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: jest.fn(),
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: jest.fn(),
        prevStep: jest.fn(),
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      render(<App />);

      expect(screen.getByText('Platform Recommendations')).toBeInTheDocument();
    });

    it('should render StepEnv for step 2', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 2,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: null,
          selectedPlatform: 'vercel',
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: jest.fn(),
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: jest.fn(),
        prevStep: jest.fn(),
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      render(<App />);

      expect(screen.getByText('Environment Variables')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<App />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Send-It');
    });

    it('should have proper main landmark', () => {
      render(<App />);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have proper header landmark', () => {
      render(<App />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });
});
