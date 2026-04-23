import React from 'react';
import { Link } from 'react-router-dom';

const phases = [
  { quarter: 'Q1', title: 'Core digitization', status: 'done', items: ['Multi-PDF upload', 'Liz field templates', 'Excel / JSON export'] },
  { quarter: 'Q2', title: 'Compare & baselines', status: 'active', items: ['Cross-supplier views', 'Product cost baselines', 'Group by compartment / ID'] },
  { quarter: 'Q3', title: 'Risk & FX', status: 'next', items: ['Tariff scores', 'FX exposure', 'Route & logistics map'] },
  { quarter: 'Q4', title: 'Integrations', status: 'planned', items: ['Codespaces & API', 'AutoCAD for blueprints', 'Team dashboards'] },
];

function HomePage() {
  return (
    <div className="page-home">
      <section className="hero-panel">
        <div className="hero-panel__grid">
          <div className="hero-panel__copy">
            <p className="eyebrow">Procurement operating system</p>
            <h1>Supplier quotes, decoded.</h1>
            <p className="lede">
              BlaiseAI turns PDF quotes into a living database: compare suppliers, benchmark costs,
              and see import risk—without the spreadsheet sprawl.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn btn--primary">Log in / sign up</Link>
              <Link to="/baseline" className="btn btn--hero-secondary">Try product baseline</Link>
            </div>
            <p className="meta-line">Example companies: Tesla, SpaceX, Nvidia · Tariff + FX risk split · Global trade map</p>
          </div>
          <div className="hero-panel__visual" aria-hidden>
            <div className="hero-orbit">
              <div className="hero-orbit__ring" />
              <div className="hero-orbit__core">PDF → DB</div>
            </div>
          </div>
        </div>
      </section>

      <section className="value-strip">
        <div>
          <h2>One pipeline</h2>
          <p>From raw supplier PDFs to baselines, FX, and tariff context—kept minimal so teams move fast.</p>
        </div>
        <ul className="value-strip__list">
          <li>Quote intelligence</li>
          <li>Material &amp; country context</li>
          <li>Risk &amp; currency</li>
        </ul>
      </section>

      <section className="roadmap" id="roadmap">
        <div className="section-header">
          <h2>Product roadmap</h2>
          <p>Where we are headed—same clarity as a modern fintech product site, without the noise.</p>
        </div>
        <div className="roadmap__track">
          {phases.map((phase) => (
            <article key={phase.quarter} className={`roadmap-card roadmap-card--${phase.status}`}>
              <div className="roadmap-card__head">
                <span className="roadmap-card__q">{phase.quarter}</span>
                <h3>{phase.title}</h3>
                <span className="roadmap-card__dot" data-status={phase.status} />
              </div>
              <ul>
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <h2>Ready to wire your first batch?</h2>
          <p>Upload quotes on the next screen or open the risk map to see how a part travels from origin to your line. Try the product baseline simulator to experiment with different component combinations.</p>
        </div>
        <div className="hero-cta">
          <Link to="/baseline" className="btn btn--primary">Try baseline simulator</Link>
          <Link to="/compare" className="btn btn--ghost btn--on-dark">View compare (beta)</Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
