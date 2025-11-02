import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { ThemeProvider } from './ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}

// Wrap app with error boundary
try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  createRoot(root).render(
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <div>
        <h2 style="color: #d32f2f;">⚠️ Application Error</h2>
        <p>Failed to initialize the application. Please refresh the page.</p>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">${error.message}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      </div>
    </div>
  `;
}
