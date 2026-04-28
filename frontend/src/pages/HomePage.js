import React from 'react';
import { Link } from 'react-router-dom';

/** Quarterly themes — snippets echo real areas of the app; not the same spine as “What this workspace does” above. */
const phases = [
  {
    quarter: 'Q1',
    title: 'Core digitization',
    status: 'done',
    snippet: 'ingest',
    items: ['Multi-file upload', 'Email & Excel parsing', 'Library & folders'],
  },
  {
    quarter: 'Q2',
    title: 'Compare & baselines',
    status: 'active',
    snippet: 'baseline',
    items: ['Cross-supplier views', 'Product baseline simulator', 'Quote library by folder'],
  },
  {
    quarter: 'Q3',
    title: 'Risk & geography',
    status: 'next',
    snippet: 'trade',
    items: ['Trade-lane overlays', 'Tariff / duty snapshots', 'Logistics globe view'],
  },
  {
    quarter: 'Q4',
    title: 'Integrations',
    status: 'planned',
    snippet: 'integrations',
    items: ['API hooks', 'Deeper dashboards', 'Team workspaces'],
  },
];

/** Primary spine: ingest → organize → simulate BOM (risk tools are optional below). */
const siteFlowSteps = [
  {
    step: '1',
    title: 'Ingest',
    subtitle: 'Uploads',
    detail: 'Pull structure from PDFs, Excel / CSV sheets, or forwarded-email exports.',
    to: '/quotes',
    snippetSkin: 'flow-quotes',
  },
  {
    step: '2',
    title: 'Library',
    subtitle: 'Organize',
    detail: 'Group quotes into folders, filter by supplier, revisit history in one view.',
    to: '/dashboard',
    snippetSkin: 'flow-dash',
  },
  {
    step: '3',
    title: 'Baseline',
    subtitle: 'Simulate BOM',
    detail:
      'Model mixes against mocked persona quotes—with scenario charts that contrast presets, greedy bounds, and your picks.',
    to: '/baseline',
    snippetSkin: 'flow-baseline',
  },
];

function MiniPageSnippet({ variant }) {
  switch (variant) {
    case 'flow-quotes':
      return (
        <div className="home-mini-snippet home-mini-snippet--quotes">
          <div className="home-mini-snippet__fake-nav">Quote digitization</div>
          <div className="home-mini-snippet__dropzone">Drop supplier files</div>
          <div className="home-mini-snippet__row"><span /></div>
          <div className="home-mini-snippet__row muted-line"><span /></div>
        </div>
      );
    case 'flow-dash':
      return (
        <div className="home-mini-snippet home-mini-snippet--dash">
          <div className="home-mini-snippet__fake-nav">Dashboard</div>
          <div className="home-mini-snippet__chips">
            <span>Folders</span>
            <span>Summary</span>
          </div>
          <div className="home-mini-snippet__rows">
            {[1, 2].map((r) => (
              <div key={r} className="home-mini-snippet__dash-row"><span /></div>
            ))}
          </div>
        </div>
      );
    case 'flow-baseline':
      return (
        <div className="home-mini-snippet home-mini-snippet--baseline">
          <div className="home-mini-snippet__fake-nav">Baseline</div>
          <div className="home-mini-snippet__chart">
            <span /><span /><span /><span />
          </div>
          <div className="home-mini-snippet__legend"><i /><i /><i /></div>
        </div>
      );
    case 'ingest':
      return (
        <div className="home-mini-snippet home-mini-snippet--ingest roadmap-snippet-variant">
          <div className="home-mini-snippet__dropzone">Upload area</div>
          <div className="home-mini-snippet__filelist">
            <span>quote_bundle.pdf</span>
            <span>lines.xls</span>
          </div>
        </div>
      );
    case 'baseline':
      return (
        <div className="home-mini-snippet home-mini-snippet--road-base roadmap-snippet-variant">
          <div className="home-mini-snippet__split">
            <div className="home-mini-snippet__mini-table"><span /><span /><span /></div>
            <div className="home-mini-snippet__bars"><span /><span /></div>
          </div>
        </div>
      );
    case 'trade':
      return (
        <div className="home-mini-snippet home-mini-snippet--trade roadmap-snippet-variant">
          <div className="home-mini-snippet__globe-strip" aria-hidden />
          <div className="home-mini-snippet__route-dots"><i /><i /><i /></div>
          <span className="home-mini-snippet__caption">Lanes · duties · map</span>
        </div>
      );
    case 'integrations':
      return (
        <div className="home-mini-snippet home-mini-snippet--integrations roadmap-snippet-variant">
          <pre className="home-mini-snippet__code">{`POST /quotes\nWebhook · API key`}</pre>
          <div className="home-mini-snippet__plugs"><span /><span /><span /></div>
        </div>
      );
    default:
      return null;
  }
}

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
              <strong className="home-highlight">exported emails</strong>
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
            Three stops from files to simulated BOM previews. Risk &amp; trade views are{' '}
            <strong className="home-flow__lede-strong">optional add-ons</strong> — expand below; they’re separate from the product roadmap timelines.
          </p>
        </div>
        <div className="home-flow__track">
          <div className="home-flow-steps" role="list">
            {siteFlowSteps.map((s, i) => (
              <React.Fragment key={s.step}>
                <div className="home-flow-slide" role="listitem">
                  <div className="home-flow-step__card">
                    <span className="home-flow-step__num">{s.step}</span>
                    <MiniPageSnippet variant={s.snippetSkin} />
                    <strong className="home-flow-step__title">{s.title}</strong>
                    <span className="home-flow-step__subtitle">{s.subtitle}</span>
                    <p className="home-flow-step__detail">{s.detail}</p>
                    <div className="home-flow-step__links">
                      <Link to={s.to} className="home-flow-step__cta">
                        Open page →
                      </Link>
                    </div>
                  </div>
                </div>
                {i < siteFlowSteps.length - 1 && <span className="home-flow-arrow" aria-hidden />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <details className="home-flow-more">
          <summary className="home-flow-more__summary">
            More options · risk exposure (tariff · FX · routes)
          </summary>
          <div className="home-flow-more__body">
            <p className="muted home-flow-more__lede">
              Use these layers after your quotes are normalized. They don’t ladder into the same sequence as each quarter below — pick what fits your review.
            </p>
            <div className="home-flow-more__grid">
              <Link to="/tariff" className="home-flow-more__tile">
                <span className="home-flow-more__tile-title">Tariff risk</span>
                <span className="muted">Lanes, duties, geopolitical context.</span>
              </Link>
              <Link to="/fx" className="home-flow-more__tile">
                <span className="home-flow-more__tile-title">FX desk</span>
                <span className="muted">Forward-style scenarios &amp; illustrative curves.</span>
              </Link>
              <Link to="/risk" className="home-flow-more__tile">
                <span className="home-flow-more__tile-title">Hedging sketch</span>
                <span className="muted">Beta risk overlays on mock positions.</span>
              </Link>
            </div>
          </div>
        </details>
      </section>

      <section className="value-strip home-values">
        <div>
          <h2>Designed for messy reality</h2>
          <p>
            Suppliers rarely send everything in one format. Blend PDF tenders, spreadsheets, and pasted email chains into
            a single normalization pass—before you compare totals or simulate baselines.
          </p>
        </div>
      </section>

      <section className="roadmap home-roadmap" id="roadmap">
        <div className="section-header">
          <h2>Product roadmap</h2>
          <p>
            Delivery themes over time—these milestones are&nbsp;
            <strong>not tied</strong>
            {' '}
            to the three-step spine or to “risk exposure”; they summarize where experiments land each period.
          </p>
        </div>
        <div className="roadmap__track">
          {phases.map((phase) => (
            <article key={phase.quarter} className={`roadmap-card roadmap-card--${phase.status}`}>
              <MiniPageSnippet variant={phase.snippet} />
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
            Upload quotes from the dashboard, skim folders in the library, then spin the baseline simulator against
            your persona pack. Open <strong>More options</strong> on the homepage when you need tariff / FX tooling.
          </p>
        </div>
        <div className="hero-cta">
          <Link to="/baseline" className="btn btn--primary">
            Try baseline simulator
          </Link>
          <Link to="/quotes" className="btn btn--ghost btn--on-dark">
            Quote digitize
          </Link>
          <Link to="/dashboard" className="btn btn--ghost btn--on-dark">
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
