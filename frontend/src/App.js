import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import QuotesPage from './pages/QuotesPage';
import ComparePage from './pages/ComparePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import TariffPage from './pages/TariffPage';
import FXPage from './pages/FXPage';
import ProductBaselinePage from './pages/ProductBaselinePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="tariff" element={<TariffPage />} />
        <Route path="fx" element={<FXPage />} />
        <Route path="baseline" element={<ProductBaselinePage />} />
        <Route path="compare" element={<ComparePage />} />
      </Route>
    </Routes>
  );
}

export default App;
