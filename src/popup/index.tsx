import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initMonitoring, reportError } from '@/shared/utils/monitoring';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { debug } from '@/shared/utils/debug';

initMonitoring('popup');

// Global error handlers for popup
window.addEventListener('error', (event) => {
  debug('popup', 'Uncaught error:', event.error || event.message);
  reportError(event.error || new Error(event.message), { context: 'uncaughtError' });
});

window.addEventListener('unhandledrejection', (event) => {
  debug('popup', 'Unhandled promise rejection:', event.reason);
  reportError(event.reason, { context: 'unhandledRejection' });
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('[LinguaFlix] Popup root element (#root) not found in DOM.');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary fallbackName="PopupRoot">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
