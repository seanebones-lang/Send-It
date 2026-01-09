import React, { useState, useEffect, Suspense, lazy } from 'react';
import { WizardProvider, useWizard } from './contexts/WizardContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserWarning } from './components/BrowserWarning';
import { RateLimitIndicator } from './components/RateLimitIndicator';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Circle, CheckCircle2 } from 'lucide-react';

// Lazy load step components for better performance
const StepRepo = lazy(() => import('./components/StepRepo').then(m => ({ default: m.StepRepo })));
const StepAnalysis = lazy(() => import('./components/StepAnalysis').then(m => ({ default: m.StepAnalysis })));
const StepEnv = lazy(() => import('./components/StepEnv').then(m => ({ default: m.StepEnv })));

const steps = [
  { id: 0, name: 'Repository', component: StepRepo },
  { id: 1, name: 'Analysis', component: StepAnalysis },
  { id: 2, name: 'Environment', component: StepEnv },
];

function WizardContent() {
  const { state } = useWizard();
  const [darkMode, setDarkMode] = useState(true);
  const CurrentStep = steps[state.currentStep].component;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500">
      <BrowserWarning />
      <RateLimitIndicator />
      
      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-dark backdrop-blur-xl border-b border-white/10" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base sm:text-xl">S</span>
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold gradient-text-blue">Send-It</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">Deployment Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg glass hover:bg-white/20 transition-all-smooth text-xs sm:text-sm font-medium text-white"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show on step 0 */}
      {state.currentStep === 0 && !state.repoUrl && (
        <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 animate-fade-in-up">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-dark text-xs sm:text-sm font-medium text-white">
              ✨ Powered by Modern Web APIs
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-4">
              <span className="gradient-text-blue">Analyze. Compare.</span>
              <br />
              <span className="text-gray-800 dark:text-white">Deploy Smarter.</span>
            </h2>
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Intelligent deployment platform analysis with real-time cost calculations, 
              performance predictions, and AI-powered recommendations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4">
              <div className="glass-dark px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-white">10,000+</div>
                <div className="text-xs sm:text-sm text-gray-300">Analyses</div>
              </div>
              <div className="glass-dark px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-white">50+</div>
                <div className="text-xs sm:text-sm text-gray-300">Frameworks</div>
              </div>
              <div className="glass-dark px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-white">6</div>
                <div className="text-xs sm:text-sm text-gray-300">Platforms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="p-6 max-w-7xl mx-auto pt-24">
        {/* Modern Step Indicator */}
        <nav className="mb-12 animate-fade-in-up" aria-label="Wizard steps" style={{animationDelay: '0.1s'}}>
          <div className="glass-dark rounded-2xl p-6 shadow-2xl">
            <ol className="flex items-center justify-between" role="list">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <li className="flex items-center flex-1" role="listitem">
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all-smooth shadow-lg ${
                          state.currentStep > step.id
                            ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white scale-110'
                            : state.currentStep === step.id
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110 animate-pulse'
                            : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                        }`}
                        aria-current={state.currentStep === step.id ? 'step' : undefined}
                        aria-label={`Step ${step.id + 1}: ${step.name}${state.currentStep > step.id ? ' (completed)' : ''}`}
                      >
                        {state.currentStep > step.id ? (
                          <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                        ) : (
                          <span className="font-bold text-lg" aria-hidden="true">{step.id + 1}</span>
                        )}
                      </div>
                      <div className="hidden sm:block flex-1">
                        <p
                          className={`text-sm font-semibold transition-colors ${
                            state.currentStep >= step.id
                              ? 'text-white'
                              : 'text-gray-400'
                          }`}
                        >
                          {step.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {state.currentStep > step.id ? 'Completed' : state.currentStep === step.id ? 'In Progress' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </li>
                  {index < steps.length - 1 && (
                    <li
                      className={`h-1 mx-4 rounded-full transition-all-smooth ${
                        state.currentStep > step.id
                          ? 'bg-gradient-to-r from-green-400 to-emerald-600 w-full'
                          : 'bg-gray-600/30 w-full'
                      }`}
                      role="separator"
                      aria-hidden="true"
                      style={{minWidth: '40px'}}
                    />
                  )}
                </React.Fragment>
              ))}
            </ol>
          </div>
        </nav>

        {/* Current Step with Suspense for lazy loading */}
        <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <Suspense fallback={
            <div className="glass-dark rounded-2xl p-8 shadow-2xl space-y-4">
              <SkeletonLoader className="h-12 w-3/4" />
              <SkeletonLoader className="h-32 w-full" />
              <SkeletonLoader className="h-12 w-1/2" />
            </div>
          }>
            <CurrentStep />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error for monitoring (could send to error tracking service)
        console.error('Application error:', error, errorInfo);
      }}
    >
      <ToastProvider>
        <WizardProvider>
          <WizardContent />
        </WizardProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
