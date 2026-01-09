import React, { useState, useEffect } from 'react';
import { WizardProvider, useWizard } from './contexts/WizardContext';
import { StepRepo } from './components/StepRepo';
import { StepAnalysis } from './components/StepAnalysis';
import { StepEnv } from './components/StepEnv';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserWarning } from './components/BrowserWarning';
import { RateLimitIndicator } from './components/RateLimitIndicator';
import { Circle, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <BrowserWarning />
      <RateLimitIndicator />
      <header className="p-6 shadow-md dark:shadow-gray-800 bg-gray-50 dark:bg-gray-800" role="banner">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Send-It</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Step Indicator */}
        <nav className="max-w-4xl mx-auto mb-8" aria-label="Wizard steps">
          <ol className="flex items-center justify-between" role="list">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <li className="flex items-center" role="listitem">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      state.currentStep > step.id
                        ? 'bg-green-500 border-green-500 text-white'
                        : state.currentStep === step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                    aria-current={state.currentStep === step.id ? 'step' : undefined}
                    aria-label={`Step ${step.id + 1}: ${step.name}${state.currentStep > step.id ? ' (completed)' : ''}`}
                  >
                    {state.currentStep > step.id ? (
                      <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                    ) : (
                      <span className="font-semibold" aria-hidden="true">{step.id + 1}</span>
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p
                      className={`text-sm font-medium ${
                        state.currentStep >= step.id
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                </li>
                {index < steps.length - 1 && (
                  <li
                    className={`flex-1 h-0.5 mx-4 ${
                      state.currentStep > step.id
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    role="separator"
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            ))}
          </ol>
        </nav>

        {/* Current Step */}
        <div className="max-w-4xl mx-auto">
          <CurrentStep />
        </div>
      </main>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error for monitoring (could send to error tracking service)
        console.error('Application error:', error, errorInfo);
      }}
    >
      <WizardProvider>
        <WizardContent />
      </WizardProvider>
    </ErrorBoundary>
  );
};

export default App;
