import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import QuotesPage from './pages/QuotesPage';
import RiskHedgingPage from './pages/RiskHedgingPage';
import ComparePage from './pages/ComparePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="risk" element={<RiskHedgingPage />} />
        <Route path="compare" element={<ComparePage />} />
      </Route>
    </Routes>
  );
}

export default App;
