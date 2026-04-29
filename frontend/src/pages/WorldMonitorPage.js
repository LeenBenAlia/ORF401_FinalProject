import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Globe2, Radar, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import WorldMapMonitor from '../components/WorldMapMonitor';
import api, { formatApiError } from '../api';

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/world-intel');
        if (!mounted) return;
        setData(res?.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(formatApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const kpis = useMemo(() => data?.kpis || [], [data]);
  const countryIntel = useMemo(() => data?.countryIntel || [], [data]);
  const escalationFeed = useMemo(() => data?.escalationFeed || [], [data]);
  const signalLayers = useMemo(() => data?.signalLayers || [], [data]);
  const recommendations = useMemo(() => data?.recommendations || [], [data]);

  return (
    <main className="page page--wide worldintel-page">
      <header className="worldintel-hero">
        <p className="eyebrow">World monitor integration</p>
        <h1>Procurement intelligence cockpit</h1>
        <p className="lede lede--muted">
          A focused layer for supplier-origin, tariff, FX, and lane risk. Signals are derived from your company quotes so
          this page stays tied to procurement decisions.
        </p>
      </header>

      {error && (
        <section className="panel">
          <p className="form-error" style={{ margin: 0 }}>{error}</p>
        </section>
      )}

      <section className="worldintel-kpis">
        {(loading ? [
          { label: 'Loading', value: '...', delta: 'Fetching quote-derived signals' },
          { label: 'Loading', value: '...', delta: 'Fetching quote-derived signals' },
          { label: 'Loading', value: '...', delta: 'Fetching quote-derived signals' },
          { label: 'Loading', value: '...', delta: 'Fetching quote-derived signals' },
        ] : kpis).map((kpi, idx) => (
          <motion.article
            key={`${kpi.label}-${idx}`}
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
          <p className="muted">Logistics map with conflict overlays and lane-level context for sourcing reviews.</p>
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
                {countryIntel.map((row) => (
                  <tr key={row.country}>
                    <td>
                      <strong>{row.country}</strong>
                    </td>
                    <td>{row.score}/100</td>
                    <td>{row.tariffRisk}</td>
                    <td>{row.fx}</td>
                    <td>{row.lane}</td>
                  </tr>
                ))}
                {!loading && countryIntel.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No country signals yet. Upload quotes with country-of-origin fields to activate this table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel worldintel-card">
          <h3><AlertTriangle size={16} /> Escalation feed</h3>
          <div className="worldintel-feed">
            {escalationFeed.map((item) => (
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
            {!loading && escalationFeed.length === 0 && (
              <p className="muted">No escalation items for current quote mix.</p>
            )}
          </div>
        </article>

        <article className="panel worldintel-card">
          <h3><Radar size={16} /> Signal layers</h3>
          <ul className="list-check">
            {signalLayers.map((layer) => (
              <li key={layer}>{layer}</li>
            ))}
          </ul>
        </article>

        <article className="panel worldintel-card">
          <h3><Activity size={16} /> Recommended next actions</h3>
          <ul className="list-check">
            {recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
          <div className="hero-cta">
            <Link to="/quotes" className="btn btn--outline btn--sm">Quote digitize</Link>
            <Link to="/tariff" className="btn btn--outline btn--sm">Tariff risk</Link>
            <Link to="/fx" className="btn btn--outline btn--sm">FX risk</Link>
            <Link to="/baseline" className="btn btn--outline btn--sm">Product baseline</Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default WorldMonitorPage;
