import React from 'react';
import UploadQuote from '../components/UploadQuote';
import QuoteLibrary from '../components/QuoteLibrary';
import QuoteTrashPanel from '../components/QuoteTrashPanel';
import { useAuth } from '../auth';

function QuotesPage() {
  const { company } = useAuth();

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Digitize & export</p>
        <h1>Quote digitization</h1>
        <p className="lede lede--muted">
          {company
            ? `Welcome back, ${company.company_name || company.email}. Upload supplier files, define fields, and build a company-specific quote dataset.`
            : 'Upload supplier quote files, define fields (or let Liz suggest them), and export to Excel or structured JSON.'}
        </p>
      </header>
      <UploadQuote />
      <div style={{ height: '1rem' }} />
      <QuoteLibrary />
      <div style={{ height: '1rem' }} />
      <QuoteTrashPanel />
    </main>
  );
}

export default QuotesPage;
