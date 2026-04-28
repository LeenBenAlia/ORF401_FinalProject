import React from 'react';
import { Link } from 'react-router-dom';

const phases = [
  { quarter: 'Q1', title: 'Core digitization', status: 'done', items: ['Multi-file upload', 'Email & Excel parsing', 'Library & folders'] },
  { quarter: 'Q2', title: 'Compare & baselines', status: 'active', items: ['Cross-supplier views', 'Product cost baseline simulator', 'Quote library by folder'] },
  { quarter: 'Q3', title: 'Risk & geography', status: 'next', items: ['Tariff snapshots', 'FX desk', 'World logistics map'] },
  { quarter: 'Q4', title: 'Integrations', status: 'planned', items: ['API hooks', 'Deeper dashboards', 'Team workspaces'] },
];

/** High-level navigation of what this SPA offers (links honor auth gates where configured). */
const siteFlowSteps = [
  {
    step: '1',
    title: 'Ingest',
    subtitle: 'Uploads',
    detail: 'Pull structure from PDFs, Excel / CSV sheets, or forwarded-email exports.',
    to: '/quotes',
  },
  {
    step: '2',
    title: 'Library',
    subtitle: 'Organize',
    detail: 'Group quotes into folders, filter by supplier, revisit history in one view.',
    to: '/dashboard',
  },
  {
    step: '3',
    title: 'Benchmark',
    subtitle: 'Compare',
    detail: 'Line up suppliers and roll numbers without copy-pasting into spreadsheets.',
    to: '/compare',
  },
  {
    step: '4',
    title: 'Baseline',
    subtitle: 'Simulate BOM',
    detail: 'Model component mixes against mocked quotes from your persona pack.',
    to: '/baseline',
  },
  {
    step: '5',
    title: 'Exposure',
    subtitle: 'Risk',
    detail: 'Layer tariff routes and FX context before you lock sourcing decisions.',
    to: '/tariff',
    secondaryTo: '/fx',
    secondaryLabel: 'FX',
  },
];

function HomePage() {
  return (
    <div className="page-home">
      <section className="hero-panel home-hero">
        <div className="home-hero__mesh" aria-hidden />
        <div className="hero-panel__grid home-hero__grid">
          <div className="hero-panel__copy">
            <p className="eyebrow">Procurement operating system</p>
            <h1>Messy files. One living quote layer.</h1>
            <p className="lede lede--on-dark">
              BlaiseAI ingests supplier pricing from{' '}
              <strong className="home-highlight">PDFs</strong>,{' '}
              <strong className="home-highlight">Excel workbooks</strong>, and{' '}
              <strong className="home-highlight">exported emails</strong> (forwarded Outlook / Gmail dumps)
              —then turns line items into a searchable benchmark you can tie to tariff, FX, and route views—without
              the spreadsheet sprawl.
            </p>
            <div className="hero-cta">
              <Link to="/auth" className="btn btn--primary">
                Log in / sign up
              </Link>
              <Link to="/baseline" className="btn btn--hero-secondary">
                Try product baseline
              </Link>
              <Link to="/fx" className="btn home-hero__btn-muted">
                Explore FX desk
              </Link>
            </div>
            <p className="meta-line meta-line--on-dark">
              Demo packs: Tesla · SpaceX · Nvidia-style quotes · Coursework illustrative only.
            </p>
          </div>

          <div className="home-hero__visual" aria-hidden>
            <div className="home-source-stack">
              <div className="home-source-chip home-source-chip--pdf">
                <span className="home-source-chip__icon">📄</span>
                <span>PDF quotes</span>
              </div>
              <div className="home-source-chip home-source-chip--xlsx">
                <span className="home-source-chip__icon">📊</span>
                <span>Excel &amp; CSV</span>
              </div>
              <div className="home-source-chip home-source-chip--eml">
                <span className="home-source-chip__icon">✉️</span>
                <span>Email exports</span>
              </div>
            </div>
            <div className="home-source-arrows">
              <span />
              <span />
              <span />
            </div>
            <div className="home-core-hub">
              <span className="home-core-hub__badge">Unified</span>
              <strong>Structured supplier quotes</strong>
              <small>Comparable · tagged · route-ready</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-flow" aria-labelledby="home-flow-heading">
        <div className="home-flow__intro">
          <p className="eyebrow eyebrow--on-light">Navigate the app</p>
          <h2 id="home-flow-heading">What this workspace does</h2>
          <p className="muted home-flow__lede">
            A straight path from files on disk to sourcing decisions—with each stop mapped to a page in BlaiseAI.
          </p>
        </div>
        <div className="home-flow__track">
          <div className="home-flow-steps" role="list">
            {siteFlowSteps.map((s, i) => (
              <React.Fragment key={s.step}>
                <div className="home-flow-slide" role="listitem">
                  <div className="home-flow-step__card">
                    <span className="home-flow-step__num">{s.step}</span>
                    <strong className="home-flow-step__title">{s.title}</strong>
                    <span className="home-flow-step__subtitle">{s.subtitle}</span>
                    <p className="home-flow-step__detail">{s.detail}</p>
                    <div className="home-flow-step__links">
                      <Link to={s.to} className="home-flow-step__cta">
                        Open →
                      </Link>
                      {s.secondaryTo && (
                        <>
                          {' · '}
                          <Link to={s.secondaryTo} className="home-flow-step__cta home-flow-step__cta--ghost">
                            {s.secondaryLabel} →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {i < siteFlowSteps.length - 1 && <span className="home-flow-arrow" aria-hidden />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="value-strip home-values">
        <div>
          <h2>Designed for messy reality</h2>
          <p>
            Suppliers rarely send everything in one format. Blend PDF tenders, spreadsheets, and pasted email chains into
            a single normalization pass—before you compare totals or simulate baselines.
          </p>
        </div>
        <ul className="value-strip__list">
          <li>Multi-format quote digitization</li>
          <li>Structured fields + country cues</li>
          <li>Baseline, tariff, and FX overlays</li>
        </ul>
      </section>

      <section className="roadmap home-roadmap" id="roadmap">
        <div className="section-header">
          <h2>Product roadmap</h2>
          <p>Landing zones for experimentation—priorities evolve with how teams ingest and stress-test quotes.</p>
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
          <h2>Ready to stress-test your next batch?</h2>
          <p>
            Upload quotes from the dashboard, open Compare for side-by-side costs, spin the baseline simulator against
            your persona pack, then layer Tariff routing and FX on top.
          </p>
        </div>
        <div className="hero-cta">
          <Link to="/baseline" className="btn btn--primary">
            Try baseline simulator
          </Link>
          <Link to="/quotes" className="btn btn--ghost btn--on-dark">
            Quote digitize
          </Link>
          <Link to="/compare" className="btn btn--ghost btn--on-dark">
            Compare (beta)
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
