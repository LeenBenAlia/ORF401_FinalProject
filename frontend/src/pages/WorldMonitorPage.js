import React from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Globe2, Radar, ShieldAlert } from 'lucide-react';
import WorldMapMonitor from '../components/WorldMapMonitor';
import { COUNTRY_INTEL, ESCALATION_FEED, GLOBAL_KPIS, SIGNAL_LAYERS } from '../data/worldMonitorMock';

const ROUTES = [
  { id: 'sea', label: 'Ocean freight', from: { lng: 121.5, lat: 25.03 }, to: { lng: -74.0, lat: 40.71 }, color: 'var(--route-sea)' },
  { id: 'air', label: 'Air cargo', from: { lng: 126.97, lat: 37.56 }, to: { lng: -87.62, lat: 41.87 }, color: 'var(--route-air)' },
  { id: 'land', label: 'Rail / truck', from: { lng: 19.04, lat: 47.49 }, to: { lng: 2.35, lat: 48.85 }, color: 'var(--route-land)' },
];

const PORTS = [
  { lng: 121.5, lat: 25.03, label: 'Taipei', type: 'port' },
  { lng: 126.97, lat: 37.56, label: 'Seoul', type: 'port' },
  { lng: -74.0, lat: 40.71, label: 'New York', type: 'port' },
  { lng: 2.35, lat: 48.85, label: 'Paris', type: 'port' },
];

const HOTSPOTS = [
  { lng: 40.0, lat: 18.5, label: 'Red Sea corridor' },
  { lng: 121.0, lat: 24.4, label: 'Taiwan Strait' },
  { lng: 31.2, lat: 50.4, label: 'Eastern Europe' },
];

function severityClass(level) {
  if (level === 'Critical') return 'severity-critical';
  if (level === 'Elevated') return 'severity-elevated';
  return 'severity-moderate';
}

function WorldMonitorPage() {
  return (
    <main className="page page--wide worldintel-page">
      <header className="worldintel-hero">
        <p className="eyebrow">World monitor integration</p>
        <h1>Geopolitical + trade intelligence cockpit</h1>
        <p className="lede lede--muted">
          This first-pass module blends WorldMonitor-style global signals with your existing tariff, FX, and route pages.
          The style direction mirrors the crisp enterprise aesthetic seen on PaxAI.
        </p>
      </header>

      <section className="worldintel-kpis">
        {GLOBAL_KPIS.map((kpi, idx) => (
          <motion.article
            key={kpi.label}
            className="worldintel-kpi-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
          >
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.delta}</small>
          </motion.article>
        ))}
      </section>

      <section className="panel worldintel-map-panel">
        <div className="worldintel-section-head">
          <h2><Globe2 size={17} /> Live route theater</h2>
          <p className="muted">Dual-use logistics map with conflict overlays and lane-level context.</p>
        </div>
        <WorldMapMonitor
          originLabel="Global suppliers"
          destLabel="US + EU demand"
          activeRoute="sea"
          routes={ROUTES}
          ports={PORTS}
          conflictZones={HOTSPOTS}
        />
      </section>

      <section className="worldintel-grid">
        <article className="panel worldintel-card">
          <h3><ShieldAlert size={16} /> Country intelligence index</h3>
          <div className="worldintel-table-wrap">
            <table className="company-quote-table worldintel-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Score</th>
                  <th>Tariff risk</th>
                  <th>FX</th>
                  <th>Lane</th>
                </tr>
              </thead>
              <tbody>
                {COUNTRY_INTEL.map((row) => (
                  <tr key={row.country}>
                    <td>
                      <strong>{row.country}</strong>
                      <span className="muted" style={{ display: 'block', fontWeight: 400 }}>{row.region}</span>
                    </td>
                    <td>{row.score}/100</td>
                    <td>{row.tariffRisk}</td>
                    <td>{row.fx}</td>
                    <td>{row.lane}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel worldintel-card">
          <h3><AlertTriangle size={16} /> Escalation feed</h3>
          <div className="worldintel-feed">
            {ESCALATION_FEED.map((item) => (
              <div key={item.id} className="worldintel-feed-item">
                <span className={`worldintel-severity ${severityClass(item.level)}`}>{item.level}</span>
                <strong>{item.title}</strong>
                <p className="muted">{item.summary}</p>
                <div className="worldintel-tags">
                  {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  <i>{item.region}</i>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel worldintel-card">
          <h3><Radar size={16} /> Signal layers</h3>
          <ul className="list-check">
            {SIGNAL_LAYERS.map((layer) => (
              <li key={layer}>{layer}</li>
            ))}
          </ul>
          <p className="muted worldintel-note">
            Next step: connect this panel to backend feeds for automated summaries and risk scoring.
          </p>
        </article>

        <article className="panel worldintel-card">
          <h3><Activity size={16} /> Frontend libraries selected</h3>
          <ul className="list-check">
            <li><strong>framer-motion</strong> for smooth reveal/transitions on intel cards.</li>
            <li><strong>lucide-react</strong> for a clean, enterprise icon set.</li>
            <li><strong>recharts</strong> (already present) for rapid signal trend charts.</li>
            <li><strong>react-simple-maps</strong> (already present) for flat-map geopolitical overlays.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

export default WorldMonitorPage;
