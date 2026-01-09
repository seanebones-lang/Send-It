/**
 * Unit tests for StepEnv component
 * Tests environment variable form, OAuth, and custom variables
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepEnv } from './StepEnv';
import { WizardProvider, useWizard } from '../contexts/WizardContext';
import { useElectron } from '../hooks/useElectron';

// Mock hooks
jest.mock('../contexts/WizardContext');
jest.mock('../hooks/useElectron');

const mockUseWizard = useWizard as jest.MockedFunction<typeof useWizard>;
const mockUseElectron = useElectron as jest.MockedFunction<typeof useElectron>;

const renderWithProvider = (component: React.ReactElement) => {
  return render(<WizardProvider>{component}</WizardProvider>);
};

describe('StepEnv', () => {
  const mockSetEnvVar = jest.fn();
  const mockPrevStep = jest.fn();
  const mockReset = jest.fn();

  const mockElectronAPI = {
    keychain: {
      check: jest.fn().mockResolvedValue({ hasPermission: true }),
    },
    token: {
      get: jest.fn().mockResolvedValue({ success: false }),
      oauth: jest.fn().mockResolvedValue({ success: true }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();

    mockUseWizard.mockReturnValue({
      state: {
        currentStep: 2,
        repoUrl: 'https://github.com/test/repo.git',
        repoPath: '/tmp/repo',
        cloneResult: { success: true, path: '/tmp/repo' },
        analysisResult: { success: true, framework: 'next.js', scores: {} },
        selectedPlatform: 'vercel',
        envVars: {},
        loading: false,
        error: null,
      },
      setRepoUrl: jest.fn(),
      setCloneResult: jest.fn(),
      setAnalysisResult: jest.fn(),
      setSelectedPlatform: jest.fn(),
      setEnvVar: mockSetEnvVar,
      setLoading: jest.fn(),
      setError: jest.fn(),
      nextStep: jest.fn(),
      prevStep: mockPrevStep,
      goToStep: jest.fn(),
      reset: mockReset,
    } as any);

    mockUseElectron.mockReturnValue({
      electronAPI: mockElectronAPI as any,
      isAvailable: true,
      cloneRepo: jest.fn(),
      analyzeFramework: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render environment variables form when platform is selected', () => {
      renderWithProvider(<StepEnv />);

      expect(screen.getByText('Environment Variables')).toBeInTheDocument();
      expect(screen.getByText(/Configure environment variables for/i)).toBeInTheDocument();
      expect(screen.getByText('vercel')).toBeInTheDocument();
    });

    it('should display warning when no platform is selected', () => {
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 2,
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
        setEnvVar: mockSetEnvVar,
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: jest.fn(),
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: mockReset,
      } as any);

      renderWithProvider(<StepEnv />);

      expect(screen.getByText(/Please select a platform first/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('should display platform-specific fields for Vercel', () => {
      renderWithProvider(<StepEnv />);

      expect(screen.getByLabelText(/VERCEL_TOKEN/i)).toBeInTheDocument();
    });

    it('should display keychain permission warning when permission is denied', async () => {
      mockElectronAPI.keychain.check.mockResolvedValue({ hasPermission: false });

      renderWithProvider(<StepEnv />);

      await waitFor(() => {
        expect(screen.queryByText(/Keychain Access Required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      const submitButton = screen.getByRole('button', { name: /save & complete/i });
      await user.click(submitButton);

      // Should show validation errors for required fields
      await waitFor(() => {
        const error = screen.queryByText(/Vercel token is required/i);
        expect(error).toBeInTheDocument();
      });
    });

    it('should validate environment variable name format', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      // Add custom variable
      const addButton = screen.getByRole('button', { name: /add variable/i });
      await user.click(addButton);

      // Enter invalid variable name
      const keyInput = screen.getByPlaceholderText('VARIABLE_NAME');
      await user.type(keyInput, 'invalid-name');

      // Should show validation error
      await waitFor(() => {
        const error = screen.queryByText(/Invalid environment variable name/i);
        expect(error).toBeInTheDocument();
      });
    });
  });

  describe('OAuth Integration', () => {
    it('should show OAuth button for Vercel token', () => {
      renderWithProvider(<StepEnv />);

      const oauthButton = screen.queryByRole('button', { name: /authenticate with vercel/i });
      expect(oauthButton).toBeInTheDocument();
    });

    it('should handle OAuth authentication', async () => {
      const user = userEvent.setup();
      mockElectronAPI.token.oauth.mockResolvedValue({ success: true });

      renderWithProvider(<StepEnv />);

      const oauthButton = screen.getByRole('button', { name: /authenticate with vercel/i });
      await user.click(oauthButton);

      await waitFor(() => {
        expect(mockElectronAPI.token.oauth).toHaveBeenCalledWith('vercel');
      });
    });

    it('should show loading state during OAuth', async () => {
      const user = userEvent.setup();
      mockElectronAPI.token.oauth.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProvider(<StepEnv />);

      const oauthButton = screen.getByRole('button', { name: /authenticate with vercel/i });
      await user.click(oauthButton);

      expect(screen.getByText(/Authenticating.../i)).toBeInTheDocument();
      expect(oauthButton).toBeDisabled();
    });

    it('should show authenticated status after OAuth', async () => {
      const user = userEvent.setup();
      mockElectronAPI.token.get.mockResolvedValue({ success: true });
      mockElectronAPI.token.oauth.mockResolvedValue({ success: true });

      renderWithProvider(<StepEnv />);

      const oauthButton = screen.getByRole('button', { name: /authenticate with vercel/i });
      await user.click(oauthButton);

      await waitFor(() => {
        expect(screen.queryByText(/Authenticated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Variables', () => {
    it('should allow adding custom environment variables', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      const addButton = screen.getByRole('button', { name: /add variable/i });
      await user.click(addButton);

      expect(screen.getByPlaceholderText('VARIABLE_NAME')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/value \(will be encrypted\)/i)).toBeInTheDocument();
    });

    it('should allow removing custom environment variables', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      // Add variable
      const addButton = screen.getByRole('button', { name: /add variable/i });
      await user.click(addButton);

      // Remove variable
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(screen.queryByPlaceholderText('VARIABLE_NAME')).not.toBeInTheDocument();
    });

    it('should validate custom variable key format', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      const addButton = screen.getByRole('button', { name: /add variable/i });
      await user.click(addButton);

      const keyInput = screen.getByPlaceholderText('VARIABLE_NAME');
      await user.type(keyInput, 'invalid-name');

      const submitButton = screen.getByRole('button', { name: /save & complete/i });
      await user.click(submitButton);

      await waitFor(() => {
        const error = screen.queryByText(/Invalid environment variable name/i);
        expect(error).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should save environment variables on submit', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      // Fill required field
      const tokenInput = screen.getByLabelText(/VERCEL_TOKEN/i);
      await user.type(tokenInput, 'test-token');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save & complete/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetEnvVar).toHaveBeenCalledWith('VERCEL_TOKEN', 'test-token');
      });
    });

    it('should reset wizard after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepEnv />);

      const tokenInput = screen.getByLabelText(/VERCEL_TOKEN/i);
      await user.type(tokenInput, 'test-token');

      const submitButton = screen.getByRole('button', { name: /save & complete/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Environment variables saved! Wizard complete.');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to previous step when back button is clicked', () => {
      renderWithProvider(<StepEnv />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockPrevStep).toHaveBeenCalled();
    });
  });

  describe('Platform-Specific Fields', () => {
    it('should show different fields for different platforms', () => {
      // Test Vercel
      renderWithProvider(<StepEnv />);
      expect(screen.getByLabelText(/VERCEL_TOKEN/i)).toBeInTheDocument();

      // Test Railway
      mockUseWizard.mockReturnValue({
        state: {
          currentStep: 2,
          repoUrl: '',
          repoPath: null,
          cloneResult: null,
          analysisResult: null,
          selectedPlatform: 'railway',
          envVars: {},
          loading: false,
          error: null,
        },
        setRepoUrl: jest.fn(),
        setCloneResult: jest.fn(),
        setAnalysisResult: jest.fn(),
        setSelectedPlatform: jest.fn(),
        setEnvVar: mockSetEnvVar,
        setLoading: jest.fn(),
        setError: jest.fn(),
        nextStep: jest.fn(),
        prevStep: mockPrevStep,
        goToStep: jest.fn(),
        reset: mockReset,
      } as any);

      const { rerender } = renderWithProvider(<StepEnv />);
      rerender(<StepEnv />);
      // Railway would have different fields
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      renderWithProvider(<StepEnv />);

      const tokenInput = screen.getByLabelText(/VERCEL_TOKEN/i);
      expect(tokenInput).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      renderWithProvider(<StepEnv />);

      const requiredIndicator = screen.getByText('*');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });
});
