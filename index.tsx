import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Unregister existing service workers to avoid 404s from stale caches or PWA misconfiguration
if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => { });
        }
      })
      .catch((err) => {
        console.warn("Failed to get service worker registrations:", err);
      });
  } catch (e) {
    console.warn("Error checking service workers:", e);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ThemeProvider } from './context/ThemeContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);