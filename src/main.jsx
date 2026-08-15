import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';
import './styles/index.css';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);



// Register Progressive Web App Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker registered successfully with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('PWA ServiceWorker registration failed: ', error);
      });
  });
}
