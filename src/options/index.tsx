import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initMonitoring } from '@/shared/utils/monitoring';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

initMonitoring('options');

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
