import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initMonitoring, reportError } from '@/shared/utils/monitoring';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { debug } from '@/shared/utils/debug';

initMonitoring('options');

// Global error handlers for options page
window.addEventListener('error', (event) => {
  debug('options', 'Uncaught error:', event.error || event.message);
  reportError(event.error || new Error(event.message), { context: 'uncaughtError' });
});

window.addEventListener('unhandledrejection', (event) => {
  debug('options', 'Unhandled promise rejection:', event.reason);
  reportError(event.reason, { context: 'unhandledRejection' });
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('[LinguaFlix] Options root element (#root) not found in DOM.');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary fallbackName="OptionsRoot">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
