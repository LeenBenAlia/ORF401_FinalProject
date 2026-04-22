import React from 'react';
import UploadQuote from '../components/UploadQuote';

function QuotesPage() {
  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Digitize &amp; export</p>
        <h1>Quote digitization</h1>
        <p className="lede lede--muted">
          Upload supplier PDFs, define fields (or let Liz suggest them), and export to Excel or structured JSON.
        </p>
      </header>
      <UploadQuote />
    </main>
  );
}

export default QuotesPage;
