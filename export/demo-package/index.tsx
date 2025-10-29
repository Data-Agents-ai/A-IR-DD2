import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LocalizationProvider } from './contexts/LocalizationContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LocalizationProvider>
      <App />
    </LocalizationProvider>
  </React.StrictMode>
);
