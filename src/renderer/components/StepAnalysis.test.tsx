/**
 * Unit tests for StepAnalysis component
 * Tests platform selection, scoring display, and navigation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepAnalysis } from './StepAnalysis';
import { WizardProvider, useWizard } from '../contexts/WizardContext';

// Mock useWizard to control state
jest.mock('../contexts/WizardContext', () => {
  const actual = jest.requireActual('../contexts/WizardContext');
  return {
    ...actual,
    useWizard: jest.fn(),
  };
});

const mockUseWizard = useWizard as jest.MockedFunction<typeof useWizard>;

const renderWithProvider = (component: React.ReactElement) => {
  return render(<WizardProvider>{component}</WizardProvider>);
};

describe('StepAnalysis', () => {
  const mockSetSelectedPlatform = jest.fn();
  const mockNextStep = jest.fn();
  const mockPrevStep = jest.fn();

  const mockAnalysisResult = {
    success: true,
    framework: 'next.js',
    scores: {
      vercel: 100,
      netlify: 95,
      cloudflare: 85,
      aws: 70,
      azure: 60,
      gcp: 50,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWizard.mockReturnValue({
      state: {
        currentStep: 1,
        repoUrl: 'https://github.com/test/repo.git',
        repoPath: '/tmp/repo',
        cloneResult: { success: true, path: '/tmp/repo' },
        analysisResult: mockAnalysisResult,
        selectedPlatform: null,
        envVars: {},
        loading: false,
        error: null,
      },
      setRepoUrl: jest.fn(),
      setCloneResult: jest.fn(),
      setAnalysisResult: jest.fn(),
      setSelectedPlatform: mockSetSelectedPlatform,
      setEnvVar: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      goToStep: jest.fn(),
      reset: jest.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('should render platform recommendations when analysis result is available', () => {
      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText('Platform Recommendations')).toBeInTheDocument();
      expect(screen.getByText(/Based on your/i)).toBeInTheDocument();
      expect(screen.getByText('next.js')).toBeInTheDocument();
    });

    it('should display warning when no analysis result is available', () => {
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
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText(/No analysis results available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });
  });

  describe('Platform Selection', () => {
    it('should allow selecting a platform', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepAnalysis />);

      const vercelButton = screen.getByText('Vercel');
      await user.click(vercelButton);

      expect(mockSetSelectedPlatform).toHaveBeenCalledWith('vercel');
    });

    it('should highlight selected platform', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: mockAnalysisResult,
          selectedPlatform: 'vercel',
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      // Selected platform should have different styling
      const vercelButton = screen.getByText('Vercel').closest('button');
      expect(vercelButton).toHaveClass('border-blue-500');
    });

    it('should disable continue button when no platform is selected', () => {
      renderWithProvider(<StepAnalysis />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('should enable continue button when platform is selected', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: mockAnalysisResult,
          selectedPlatform: 'vercel',
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Platform Scoring', () => {
    it('should display platform scores correctly', () => {
      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText('100')).toBeInTheDocument(); // Vercel score
      expect(screen.getByText('95')).toBeInTheDocument(); // Netlify score
      expect(screen.getByText('85')).toBeInTheDocument(); // Cloudflare score
    });

    it('should categorize platforms by score (excellent, good, fair)', () => {
      renderWithProvider(<StepAnalysis />);

      // Excellent platforms (>= 90)
      expect(screen.getByText('Recommended')).toBeInTheDocument();
      
      // Should show Vercel and Netlify in recommended section
      expect(screen.getByText('Vercel')).toBeInTheDocument();
      expect(screen.getByText('Netlify')).toBeInTheDocument();
    });

    it('should show recommended platform prominently', () => {
      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText('Recommended')).toBeInTheDocument();
      // Vercel should be in recommended section (score 100)
    });

    it('should display score colors correctly', () => {
      renderWithProvider(<StepAnalysis />);

      // Scores >= 90 should be green
      const vercelScore = screen.getByText('100');
      expect(vercelScore).toHaveClass('text-green-600');
    });
  });

  describe('Navigation', () => {
    it('should navigate to previous step when back button is clicked', () => {
      renderWithProvider(<StepAnalysis />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockPrevStep).toHaveBeenCalled();
    });

    it('should navigate to next step when continue button is clicked', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: mockAnalysisResult,
          selectedPlatform: 'vercel',
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(mockNextStep).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing analysis result gracefully', () => {
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
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText(/No analysis results available/i)).toBeInTheDocument();
    });

    it('should handle missing scores gracefully', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 1,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: {
            success: true,
            framework: 'next.js',
            scores: undefined as any,
          },
          selectedPlatform: null,
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: mockSetSelectedPlatform,
        setEnvVar: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: jest.fn(),
      } as any);

      renderWithProvider(<StepAnalysis />);

      expect(screen.getByText(/No analysis results available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProvider(<StepAnalysis />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have h2 for main title
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Platform Recommendations');
    });

    it('should be keyboard navigable', () => {
      renderWithProvider(<StepAnalysis />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
