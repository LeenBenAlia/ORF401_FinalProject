import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './auth';

/** CRA injects PUBLIC_URL; strip accidental trailing slash so /fx matches localhost and Heroku roots. */
const routerBasename = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);