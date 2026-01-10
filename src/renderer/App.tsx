import React, { useState, useEffect } from 'react';
import { WizardProvider, useWizard } from './contexts/WizardContext';
import { StepRepo } from './components/StepRepo';
import { StepAnalysis } from './components/StepAnalysis';
import { StepEnv } from './components/StepEnv';
import { Step2PlatformDiscovery } from '../../components/DeploymentWizard/Step2PlatformDiscovery';
import { Step5Deploy } from '../../components/DeploymentWizard/Step5Deploy';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CheckCircle2 } from 'lucide-react';
import type { DeployConfig, DeployPlatform } from '../../types/ipc';

const steps = [
  { id: 0, name: 'Repository', component: StepRepo },
  { id: 1, name: 'Analysis', component: StepAnalysis },
  { id: 2, name: 'Platform', component: Step2PlatformDiscovery },
  { id: 3, name: 'Environment', component: StepEnv },
  { id: 4, name: 'Deploy', component: Step5Deploy },
];

function WizardContent() {
  const wizard = useWizard();
  const { state } = wizard;
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
    <div style={{ minHeight: '100vh', backgroundColor: '#1f2937', color: 'white', padding: '24px' }}>
      <header role="banner" style={{ padding: '24px', backgroundColor: '#374151', borderRadius: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Send-It</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              backgroundColor: '#4b5563',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main role="main">
        {/* Step Indicator */}
        <nav style={{ maxWidth: '800px', margin: '0 auto 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: state.currentStep > step.id
                        ? '#22c55e'
                        : state.currentStep === step.id
                        ? '#2563eb'
                        : '#4b5563',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {state.currentStep > step.id ? (
                      <CheckCircle2 style={{ width: '24px', height: '24px' }} />
                    ) : (
                      <span>{step.id + 1}</span>
                    )}
                  </div>
                  <span style={{ marginLeft: '12px', fontWeight: '500' }}>
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      margin: '0 16px',
                      backgroundColor: state.currentStep > step.id ? '#22c55e' : '#4b5563'
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </nav>

        {/* Current Step */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {state.currentStep === 2 ? (
            <Step2PlatformDiscovery
              detectedFramework={state.analysisResult?.framework}
              selectedPlatform={state.selectedDeployPlatform || undefined}
              onSelect={(platformId) => {
                wizard.setSelectedDeployPlatform(platformId);
              }}
              onNext={() => wizard.nextStep()}
              onBack={() => wizard.prevStep()}
            />
          ) : state.currentStep === 4 ? (
            <Step5Deploy
              deploymentConfig={{
                platform: (state.selectedDeployPlatform || 'vercel') as DeployPlatform,
                repoPath: state.repoPath || state.repoUrl || '',
                repoUrl: state.repoUrl,
                envVars: state.envVars,
                projectName: state.projectName,
                branch: state.branch || 'main',
                framework: state.framework || state.analysisResult?.framework,
                buildCommand: state.buildCommand,
                startCommand: state.startCommand,
                rootDirectory: state.rootDirectory,
              }}
              onDeploymentComplete={(result) => {
                console.log('Deployment complete:', result);
                // Could navigate to success screen or reset
              }}
              onBack={() => wizard.prevStep()}
            />
          ) : (
            <CurrentStep />
          )}
        </div>
      </main>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
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
