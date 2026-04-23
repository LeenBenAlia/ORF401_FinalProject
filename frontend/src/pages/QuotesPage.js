import React from 'react';
import UploadQuote from '../components/UploadQuote';
import { useAuth } from '../auth';

function QuotesPage() {
  const { user } = useAuth();

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Digitize & export</p>
        <h1>Quote digitization</h1>
        <p className="lede lede--muted">
          {user ? `Welcome back, ${user.company}. Upload supplier PDFs, define fields, and build a company-specific quote dataset.` : 'Upload supplier PDFs, define fields (or let Liz suggest them), and export to Excel or structured JSON.'}
        </p>
      </header>
      <UploadQuote />
    </main>
  );
}

export default QuotesPage;
