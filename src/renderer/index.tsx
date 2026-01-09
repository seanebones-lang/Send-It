import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import './index.css';

// Set up browser-compatible Electron API BEFORE any components render
// This ensures window.electronAPI is available synchronously
import './electron.browser';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
