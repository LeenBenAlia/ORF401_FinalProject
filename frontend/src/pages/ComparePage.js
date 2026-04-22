import React from 'react';
import { Link } from 'react-router-dom';

function ComparePage() {
  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Benchmarking</p>
        <h1>Compare quotes</h1>
        <p className="lede lede--muted">
          Side-by-side supplier comparison and online range benchmarks are rolling out in Q2. For now, digitize quotes first,
          then group exports by supplier, country, or product compartment in Excel.
        </p>
      </header>
      <section className="panel card-soft">
        <h2>What’s coming</h2>
        <ul className="list-check">
          <li>Filter by manufacturer, country, or subpart / compartment</li>
          <li>Highlight outliers vs. typical market ranges</li>
          <li>Save comparison views and share with procurement</li>
        </ul>
        <p className="muted" style={{ marginTop: '1rem' }}>To prepare data, use <Link to="/quotes">Quote digitize</Link>.</p>
      </section>
    </main>
  );
}

export default ComparePage;
