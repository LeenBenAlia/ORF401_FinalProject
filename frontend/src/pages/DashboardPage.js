import React from 'react';
import { useAuth } from '../auth';

const COMPANY_QUOTES = {
  Tesla: [
    { id: 'T-001', supplier: 'Panthera Metals', country: 'Germany', currency: 'EUR', value: '€1,420,000', product: 'Battery frame castings' },
    { id: 'T-002', supplier: 'Magnaflux', country: 'Mexico', currency: 'USD', value: '$930,000', product: 'High-strength fasteners' },
  ],
  SpaceX: [
    { id: 'S-001', supplier: 'Orbital Components', country: 'France', currency: 'EUR', value: '€780,000', product: 'Avionics housings' },
    { id: 'S-002', supplier: 'SkyPort', country: 'South Korea', currency: 'KRW', value: '₩1,120,000,000', product: 'Guidance actuators' },
  ],
  Nvidia: [
    { id: 'N-001', supplier: 'Silicon Foundry', country: 'Taiwan', currency: 'TWD', value: 'NT$54,000,000', product: 'High-density interposers' },
    { id: 'N-002', supplier: 'ThermoFlow', country: 'Japan', currency: 'JPY', value: '¥82,000,000', product: 'Cooling plate assemblies' },
  ],
};

function DashboardPage() {
  const { user } = useAuth();
  const company = user?.company || 'Your company';
  const quotes = COMPANY_QUOTES[user?.company] || [];

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Welcome back</p>
        <h1>{company} dashboard</h1>
        <p className="lede lede--muted">
          This dashboard centralizes the quote flow for the company you signed in as. Use it to review supplier quote examples and prime the reader for your next import risk session.
        </p>
      </header>
      <section className="panel card-soft">
        <h2>Supplier quote examples</h2>
        <p className="muted">These sample quote lines are seeded for each company. When you upload your own supplier PDFs, they will appear here in the same workflow.</p>
        <div className="company-quote-table-wrap">
          <table className="company-quote-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Supplier</th>
                <th>Origin</th>
                <th>Currency</th>
                <th>Value</th>
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>{quote.id}</td>
                  <td>{quote.supplier}</td>
                  <td>{quote.country}</td>
                  <td>{quote.currency}</td>
                  <td>{quote.value}</td>
                  <td>{quote.product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <h2>Next steps</h2>
        <ul className="list-check">
          <li>Upload your company-specific supplier PDFs in Quote digitization.</li>
          <li>Build product cost baselines using the Product baseline simulator.</li>
          <li>Review FX exposure for sourced currencies in the FX page.</li>
          <li>Analyze tariff risk with route and conflict context in the Tariff page.</li>
        </ul>
      </section>
    </main>
  );
}

export default DashboardPage;
