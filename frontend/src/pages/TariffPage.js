import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorldMapMonitor from '../components/WorldMapMonitor';
import api, { formatApiError } from '../api';
import { usesStaticGithubPagesDemo } from '../githubPagesDemo';
import {
  decodeTariffBreakdownBd,
  inferTransportRoute,
  routeLaneShortLabel,
  tariffRiskScoreForRoute,
  BASELINE_TARIFF_SESSION_KEY,
  breakdownRowsFromSelectedLines,
  breakdownRowsFromUploadedQuoteRecord,
} from '../utils/baselineTradeSignals';

const ROUTES = [
  {
    id: 'sea',
    label: 'ocean freight',
    from: { lng: 9.9937, lat: 53.5511 },
    to: { lng: -81.09, lat: 32.0809 },
    color: 'var(--route-sea)',
  },
  {
    id: 'air',
    label: 'air cargo',
    from: { lng: 2.3522, lat: 48.8566 },
    to: { lng: -73.7781, lat: 40.6413 },
    color: 'var(--route-air)',
  },
  {
    id: 'land',
    label: 'rail / truck',
    from: { lng: 21.0122, lat: 52.2297 },
    to: { lng: 4.4777, lat: 51.9244 },
    color: 'var(--route-land)',
  },
];

const PORTS = [
  { lng: 9.9937, lat: 53.5511, label: 'Hamburg', type: 'port' },
  { lng: -81.09, lat: 32.0809, label: 'Savannah', type: 'port' },
  { lng: 2.3522, lat: 48.8566, label: 'Paris', type: 'port' },
  { lng: 126.978, lat: 37.5665, label: 'Seoul', type: 'port' },
];

const CONFLICT_ZONES = [
  { lng: 40.0, lat: 18.5, label: 'Red Sea tension' },
  { lng: 121.0, lat: 24.5, label: 'Taiwan Strait' },
  { lng: 31.0, lat: 50.0, label: 'Eastern Europe alert' },
];

function formatUsd0(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Math.round(Number(n) || 0)
  );
}

function normalizeDecodedBd(rawList) {
  return rawList.map((r) => ({
    supplier: r.supplier || '—',
    country: r.country || '',
    sku: r.sku || '',
    name: r.name || '',
    usd: Math.max(0, Math.round(Number(r.usd) || 0)),
  }));
}

function TariffPage() {
  const [searchParams] = useSearchParams();
  const [activeRoute, setActiveRoute] = useState(() => searchParams.get('route') || 'sea');
  const tariffScore = 100 - (activeRoute === 'air' ? 28 : activeRoute === 'land' ? 16 : 35);
  const fromBaseline = searchParams.get('from') === 'baseline';
  const fromQuotes = searchParams.get('from') === 'quotes';
  const baselineScenario = searchParams.get('scenario');
  const baselineCountries = searchParams.get('countries');
  const baselineScoreHint = searchParams.get('score');
  const bdRaw = searchParams.get('bd');

  const [sourceTab, setSourceTab] = useState('quotes');
  const [quotesList, setQuotesList] = useState([]);
  const [quotesLoadErr, setQuotesLoadErr] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [baselineOptions, setBaselineOptions] = useState([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState('');

  const refreshBaselineOptions = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(BASELINE_TARIFF_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setBaselineOptions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBaselineOptions([]);
    }
  }, []);

  useEffect(() => {
    refreshBaselineOptions();
    const onStorage = (e) => {
      if (e.key === BASELINE_TARIFF_SESSION_KEY || e.key === null) refreshBaselineOptions();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshBaselineOptions]);

  useEffect(() => {
    if (usesStaticGithubPagesDemo()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setQuotesLoadErr('');
        const res = await api.get('/quotes');
        if (!cancelled) setQuotesList(res.data.quotes || []);
      } catch (err) {
        if (!cancelled) setQuotesLoadErr(formatApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsFromUrl = useMemo(() => normalizeDecodedBd(decodeTariffBreakdownBd(bdRaw)), [bdRaw]);

  const breakdownRows = useMemo(() => {
    if (sourceTab === 'quotes' && selectedQuoteId) {
      const q = quotesList.find((x) => String(x.id) === String(selectedQuoteId));
      if (q) return breakdownRowsFromUploadedQuoteRecord(q);
    }
    if (sourceTab === 'baseline' && selectedBaselineId) {
      const row = baselineOptions.find((x) => x.id === selectedBaselineId);
      if (row?.lines?.length) return breakdownRowsFromSelectedLines(row.lines);
    }
    return rowsFromUrl;
  }, [
    sourceTab,
    selectedQuoteId,
    selectedBaselineId,
    quotesList,
    baselineOptions,
    rowsFromUrl,
  ]);

  const breakdownEnriched = useMemo(() => {
    const total = breakdownRows.reduce((acc, r) => acc + r.usd, 0) || 0;
    return breakdownRows.map((r) => {
      const lane = inferTransportRoute(r.country ? [r.country] : []);
      const score = tariffRiskScoreForRoute(lane);
      const share = total > 0 ? Math.round((r.usd / total) * 1000) / 10 : 0;
      return { ...r, lane, score, routeLabel: routeLaneShortLabel(lane), share };
    });
  }, [breakdownRows]);

  const blendLane = useMemo(() => {
    if (!breakdownRows.length) return null;
    const uniq = [...new Set(breakdownRows.map((r) => r.country).filter(Boolean))];
    const lane = inferTransportRoute(uniq);
    const score = tariffRiskScoreForRoute(lane);
    return { uniq, lane, score, routeLabel: routeLaneShortLabel(lane) };
  }, [breakdownRows]);

  useEffect(() => {
    const r = searchParams.get('route');
    if (r === 'sea' || r === 'air' || r === 'land') setActiveRoute(r);
  }, [searchParams]);

  const showBanner = fromBaseline || fromQuotes || rowsFromUrl.length > 0;
  const pickerOverridesUrl =
    (sourceTab === 'quotes' && selectedQuoteId) || (sourceTab === 'baseline' && selectedBaselineId);

  return (
    <main className="page page--wide tariff-page">
      {showBanner && (
        <aside className="panel tariff-from-baseline" role="note">
          <p className="muted" style={{ margin: 0 }}>
            {fromBaseline && (
              <>
                Opened from <strong>product baseline simulation</strong>
                {baselineScenario ? `: ${baselineScenario}` : ''}.
              </>
            )}
            {fromQuotes && (
              <>
                Opened from <strong>quote digitization</strong>
                {baselineScenario ? `: ${baselineScenario}` : ''}.
              </>
            )}
            {!fromBaseline && !fromQuotes && rowsFromUrl.length > 0 ? (
              <>Imported <strong>sourcing line breakdown</strong> (see table below).</>
            ) : null}
            {baselineCountries ? (
              <>
                {' '}
                Origins referenced:{' '}
                <strong>{baselineCountries.split('|').filter(Boolean).join(', ')}</strong>.
              </>
            ) : null}
            {baselineScoreHint ? (
              <>
                {' '}
                Map route estimate vs blend:{' '}
                <strong>{baselineScoreHint}/100</strong> (still updates when you change lane tabs).
              </>
            ) : null}
          </p>
        </aside>
      )}
      <header className="page__header page__header--split">
        <div>
          <p className="eyebrow">Tariff risk</p>
          <h1>Tariff and trade-route view</h1>
          <p className="lede lede--muted">
            Track tariff sensitivity across lanes and inspect how supplier geography maps to illustrative route stress scores.
            Choose a digitized quote or a product-baseline scenario below, or open this page from baseline / quote links (URL
            import).
          </p>
        </div>
      </header>

      {(breakdownRows.length > 0 || pickerOverridesUrl) && (
        <section className="panel card-soft tariff-breakdown-panel">
          <div className="tariff-breakdown-head">
            <h2>Supplier sourcing routes</h2>
            <p className="muted tariff-breakdown-lede">
              Each row uses the same country → lane heuristic as the map. BOM share weights lines by USD when available.
              {pickerOverridesUrl ? (
                <>
                  {' '}
                  <strong>Showing picker selection</strong> (overrides URL import until you clear the dropdown).
                </>
              ) : null}
            </p>
            {blendLane && breakdownRows.length > 0 && (
              <p className="tariff-blend-summary">
                <strong>Blend across lines:</strong> {blendLane.routeLabel} · score{' '}
                <strong>{blendLane.score}/100</strong> · origins: {blendLane.uniq.join(', ') || '—'}
              </p>
            )}
          </div>
          {breakdownRows.length === 0 ? (
            <p className="muted">Select a quote or baseline scenario in the panel below, or open this page from a Tariff link.</p>
          ) : (
            <div className="tariff-breakdown-scroll">
              <table className="tariff-breakdown-table">
                <thead>
                  <tr>
                    <th>Supplier / line</th>
                    <th>Origin</th>
                    <th>USD eq.</th>
                    <th>Share</th>
                    <th>Inferred lane</th>
                    <th>Tariff risk</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownEnriched.map((r, i) => (
                    <tr key={`${r.sku}-${r.name}-${i}`}>
                      <td>
                        <strong>{r.supplier}</strong>
                        {r.name ? <span className="muted tariff-bd-sub">{r.name}</span> : null}
                        {r.sku ? <span className="muted tariff-bd-sub">{r.sku}</span> : null}
                      </td>
                      <td>{r.country || '—'}</td>
                      <td>{formatUsd0(r.usd)}</td>
                      <td>{r.share ? `${r.share}%` : '—'}</td>
                      <td>{r.routeLabel}</td>
                      <td>
                        <span className="tariff-bd-score">{r.score}/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="risk-grid">
        <section className="panel risk-panel tariff-source-panel">
          <h2>Tariff inputs</h2>
          <div className="tariff-source-seg" role="tablist" aria-label="Calculation source">
            <button
              type="button"
              className={sourceTab === 'quotes' ? 'seg__btn is-on' : 'seg__btn'}
              onClick={() => {
                setSourceTab('quotes');
              }}
            >
              Digitized quotes
            </button>
            <button
              type="button"
              className={sourceTab === 'baseline' ? 'seg__btn is-on' : 'seg__btn'}
              onClick={() => {
                setSourceTab('baseline');
              }}
            >
              Product baseline
            </button>
          </div>

          {sourceTab === 'quotes' && (
            <div className="tariff-picker-block">
              {usesStaticGithubPagesDemo() ? (
                <p className="muted">
                  The quote library API is not available on this static preview. Host the backend and set REACT_APP_API_BASE_URL,
                  or use <strong>Product baseline</strong> after visiting that page in this browser, or open Tariff from a quote link when hosted.
                </p>
              ) : (
                <>
                  {quotesLoadErr ? <p className="error-text tariff-error-compact">{quotesLoadErr}</p> : null}
                  <label className="tariff-picker-label">
                    Scanned quote
                    <select
                      className="tariff-picker-select"
                      value={selectedQuoteId}
                      onChange={(e) => setSelectedQuoteId(e.target.value)}
                    >
                      <option value="">— Use URL import only —</option>
                      {quotesList.map((q) => (
                        <option key={q.id} value={q.id}>
                          #{q.id} · {q.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}

          {sourceTab === 'baseline' && (
            <div className="tariff-picker-block">
              <p className="muted tariff-source-hint">
                Scenarios are saved when you use <strong>Product baseline simulation</strong> (same browser session). Open baseline,
                load vehicle presets or saved mixes, then pick a row here.
              </p>
              <label className="tariff-picker-label">
                Baseline scenario
                <select
                  className="tariff-picker-select"
                  value={selectedBaselineId}
                  onChange={(e) => setSelectedBaselineId(e.target.value)}
                >
                  <option value="">— Use URL import only —</option>
                  {baselineOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn--ghost btn--sm tariff-refresh-baseline" onClick={refreshBaselineOptions}>
                Refresh list from baseline page
              </button>
            </div>
          )}

          {(selectedQuoteId || selectedBaselineId) && (
            <button
              type="button"
              className="btn btn--ghost btn--sm tariff-clear-pick"
              onClick={() => {
                setSelectedQuoteId('');
                setSelectedBaselineId('');
              }}
            >
              Clear picker (use URL import)
            </button>
          )}

          <dl className="kv tariff-source-kv">
            <div>
              <dt>Active lane (map)</dt>
              <dd>{routeLaneShortLabel(activeRoute)}</dd>
            </div>
            <div>
              <dt>Tariff risk score</dt>
              <dd>{tariffScore}/100</dd>
            </div>
            <div>
              <dt>Recommended action</dt>
              <dd>
                {activeRoute === 'air'
                  ? 'Use air only for urgent, high-value parts'
                  : activeRoute === 'land'
                    ? 'Optimize inland trucking and customs handling'
                    : 'Prefer ocean shipping with route intelligence'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel risk-panel map-wrap">
          <div className="map-head">
            <h2>Global trade map</h2>
            <div className="seg" role="tablist" aria-label="Transport mode">
              {ROUTES.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={activeRoute === route.id ? 'seg__btn is-on' : 'seg__btn'}
                  onClick={() => setActiveRoute(route.id)}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
          <WorldMapMonitor
            originLabel="Key ports"
            destLabel="US hub"
            activeRoute={activeRoute}
            routes={ROUTES}
            ports={PORTS}
            conflictZones={CONFLICT_ZONES}
          />
        </section>

        <section className="panel risk-panel">
          <h2>Conflict and customs watch</h2>
          <p className="muted">
            These zones are visible on trade routes when you need to align supplier choice with import clearance and insurance
            planning.
          </p>
          <ul className="list-check">
            <li>Red Sea: shipping insurance and vessel diversion risk.</li>
            <li>Taiwan Strait: microchip and electronic sourcing pressure.</li>
            <li>Eastern Europe: elevated tariff review and logistics delays.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

export default TariffPage;
