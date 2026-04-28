import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import QuotesPage from './pages/QuotesPage';
import RiskHedgingPage from './pages/RiskHedgingPage';
import AuthPage from './pages/AuthPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import TariffPage from './pages/TariffPage';
import FXPage from './pages/FXPage';
import ProductBaselinePage from './pages/ProductBaselinePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route
          path="dashboard"
          element={(
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="quotes"
          element={(
            <ProtectedRoute>
              <QuotesPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="tariff"
          element={(
            <ProtectedRoute>
              <TariffPage />
            </ProtectedRoute>
          )}
        />
        {/* Public coursework FX panel — localhost /fx loads without redirect to /auth */}
        <Route path="fx" element={<FXPage />} />
        <Route path="compare" element={<Navigate to="/baseline" replace />} />
        <Route
          path="baseline"
          element={(
            <ProtectedRoute>
              <ProductBaselinePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="risk"
          element={(
            <ProtectedRoute>
              <RiskHedgingPage />
            </ProtectedRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
