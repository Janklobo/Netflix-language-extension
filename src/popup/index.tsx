import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initMonitoring } from '@/shared/utils/monitoring';

initMonitoring('popup');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('[LinguaFlix] Popup root element (#root) not found in DOM.');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
