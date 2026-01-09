/**
 * Unit tests for StepRepo component
 * Tests repository URL input, validation, and submission flow
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepRepo } from './StepRepo';
import { WizardProvider } from '../contexts/WizardContext';
import { useElectron } from '../hooks/useElectron';

// Mock useElectron hook
jest.mock('../hooks/useElectron');
const mockUseElectron = useElectron as jest.MockedFunction<typeof useElectron>;

// Mock Electron API
const mockElectronAPI = {
  repo: {
    clone: jest.fn(),
    analyzeFramework: jest.fn(),
  },
};

// Setup window.electronAPI
beforeEach(() => {
  (window as any).electronAPI = mockElectronAPI;
  mockUseElectron.mockReturnValue({
    cloneRepo: jest.fn(),
    analyzeFramework: jest.fn(),
    isAvailable: true,
    electronAPI: mockElectronAPI as any,
  });
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(<WizardProvider>{component}</WizardProvider>);
};

describe('StepRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render repository setup form', () => {
      renderWithProvider(<StepRepo />);

      expect(screen.getByText('Repository Setup')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://github.com/vercel/next.js.git')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clone & analyze/i })).toBeInTheDocument();
    });

    it('should render with existing repo URL if provided', () => {
      const { container } = renderWithProvider(<StepRepo />);
      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git') as HTMLInputElement;
      
      // Input should be empty initially (no default value in state)
      expect(input.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty URL', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepRepo />);

      const button = screen.getByRole('button', { name: /clone & analyze/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Repository URL is required')).toBeInTheDocument();
      });
    });

    it('should show error for invalid URL format', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'not-a-url');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
      });
    });

    it('should show error for unsupported Git provider', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://unsupported.com/repo.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Please provide a valid GitHub, GitLab, or Bitbucket URL/i)).toBeInTheDocument();
      });
    });

    it('should accept valid GitHub URL', async () => {
      const user = userEvent.setup();
      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      // Should not show validation errors
      await waitFor(() => {
        const error = screen.queryByText(/Repository URL is required|Invalid URL format/i);
        expect(error).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call cloneRepo and analyzeFramework on successful submission', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: true,
        path: '/tmp/cloned-repo',
      });
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
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
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/vercel/next.js.git');
      });

      await waitFor(() => {
        expect(mockAnalyzeFramework).toHaveBeenCalledWith('/tmp/cloned-repo', 'https://github.com/vercel/next.js.git');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, path: '/tmp/repo' }), 100))
      );
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
        success: true,
        framework: 'next.js',
        scores: {},
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      // Should show loading state
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(mockCloneRepo).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should display clone result on success', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: true,
        path: '/tmp/cloned-repo',
      });
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
        success: true,
        framework: 'next.js',
        scores: {},
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Repository cloned successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/\/tmp\/cloned-repo/i)).toBeInTheDocument();
      });
    });

    it('should display framework detection result on success', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: true,
        path: '/tmp/cloned-repo',
      });
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
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
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Framework detected:/i)).toBeInTheDocument();
        expect(screen.getByText('next.js')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when Electron API is not available', async () => {
      const user = userEvent.setup();
      mockUseElectron.mockReturnValue({
        cloneRepo: jest.fn(),
        analyzeFramework: jest.fn(),
        isAvailable: false,
        electronAPI: undefined,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Electron API not available')).toBeInTheDocument();
      });
    });

    it('should display error when clone fails', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: false,
        error: 'Clone failed: Repository not found',
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: jest.fn(),
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Clone failed: Repository not found/i)).toBeInTheDocument();
      });
    });

    it('should display error when clone succeeds but no path returned', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: true,
        path: undefined,
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: jest.fn(),
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Clone succeeded but no path returned/i)).toBeInTheDocument();
      });
    });

    it('should display error when framework analysis fails', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockResolvedValue({
        success: true,
        path: '/tmp/cloned-repo',
      });
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to analyze framework',
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Failed to analyze framework/i)).toBeInTheDocument();
      });
    });

    it('should handle exceptions during submission', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockRejectedValue(new Error('Network error'));

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: jest.fn(),
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git');
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable form inputs during submission', async () => {
      const user = userEvent.setup();
      const mockCloneRepo = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, path: '/tmp/repo' }), 100))
      );
      const mockAnalyzeFramework = jest.fn().mockResolvedValue({
        success: true,
        framework: 'next.js',
        scores: {},
      });

      mockUseElectron.mockReturnValue({
        cloneRepo: mockCloneRepo,
        analyzeFramework: mockAnalyzeFramework,
        isAvailable: true,
        electronAPI: mockElectronAPI as any,
      });

      renderWithProvider(<StepRepo />);

      const input = screen.getByPlaceholderText('https://github.com/vercel/next.js.git') as HTMLInputElement;
      const button = screen.getByRole('button', { name: /clone & analyze/i });

      await user.type(input, 'https://github.com/vercel/next.js.git');
      await user.click(button);

      // Input should be disabled during loading
      await waitFor(() => {
        expect(input.disabled).toBe(true);
        expect(button).toBeDisabled();
      });
    });
  });
});
