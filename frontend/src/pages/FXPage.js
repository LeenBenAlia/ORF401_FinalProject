import React, { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../auth';

const G10_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
];

const META_BY_CODE = Object.fromEntries(G10_CURRENCIES.map((c) => [c.code, c]));

const DEFAULT_CURRENCIES = [
  { code: 'EUR', rate: 1.085, trend: '+0.8%', volHint: 'Med' },
  { code: 'JPY', rate: 0.0065, trend: '-0.2%', volHint: 'High' },
  { code: 'GBP', name: 'British Pound', rate: 1.263, trend: '+0.4%', volHint: 'Med' },
  { code: 'AUD', rate: 0.67, trend: '-0.1%', volHint: 'Med' },
  { code: 'CAD', rate: 0.74, trend: '+0.2%', volHint: 'Low' },
  { code: 'CHF', rate: 1.1, trend: '+0.1%', volHint: 'Low' },
  { code: 'NZD', rate: 0.61, trend: '+0.3%', volHint: 'High' },
  { code: 'SEK', rate: 0.09, trend: '-0.5%', volHint: 'Med' },
  { code: 'NOK', rate: 0.088, trend: '+0.0%', volHint: 'Med' },
];

/** Bloomberg Markets quote URL for FX vs USD where applicable */
function bloombergFxUrl(code) {
  const c = code.toUpperCase();
  if (c === 'USD') return 'https://www.bloomberg.com/markets/currencies/fx-rates/';
  const tickers = {
    EUR: 'EURUSD:CUR',
    GBP: 'GBPUSD:CUR',
    JPY: 'USDJPY:CUR',
    CAD: 'USDCAD:CUR',
    AUD: 'AUDUSD:CUR',
    CHF: 'USDCHF:CUR',
    SEK: 'USDSEK:CUR',
    NOK: 'USDNOK:CUR',
    NZD: 'NZDUSD:CUR',
  };
  const t = tickers[c] || `${c}USD:CUR`;
  return `https://www.bloomberg.com/quote/${encodeURIComponent(t)}`;
}

/** Secondary public reference pages (education / cross-check) */
function investingPairUrl(code) {
  const c = code.toUpperCase();
  if (c === 'USD') return 'https://www.investing.com/currencies/us-dollar-index';
  const slug = ({
    EUR: 'eur-usd',
    JPY: 'usd-jpy',
    GBP: 'gbp-usd',
    AUD: 'aud-usd',
    CAD: 'usd-cad',
    CHF: 'usd-chf',
    SEK: 'usd-sek',
    NOK: 'usd-nok',
    NZD: 'nzd-usd',
  })[c];
  return slug ? `https://www.investing.com/currencies/${slug}` : investingPairUrl('USD');
}

const COMPANY_ORIGINS = {
  Tesla: 'Germany',
  SpaceX: 'France',
  Nvidia: 'Taiwan',
};

const COUNTRY_EXPOSURE = {
  Germany: 'Moderate',
  France: 'Moderate',
  Taiwan: 'Elevated',
  'South Korea': 'Elevated',
  Mexico: 'Low',
  Japan: 'Moderate',
};

/** Illustrative seeded intraday USD/XXX path ( coursework demo — not live data ) */
function buildIntradayCurve(code, refRate, daySeed, points = 20) {
  const s = [...String(code)].reduce((n, _, i) => n + code.charCodeAt(i) * (37 + i), daySeed * 9973);
  let r = (s >>> 0) || 1;
  const rnd = () => {
    r = (Math.imul(r, 48271) >>> 0) % 2147483647;
    return (r >>> 16) / 65536;
  };
  let v = refRate * (0.993 + rnd() * 0.016);
  const out = [];
  for (let i = 0; i < points; i++) {
    v *= 1 + (rnd() - 0.48) * 0.0065;
    const hourUtc = Math.floor(rnd() * 16) + 6;
    out.push({
      t: `${String(hourUtc).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
      v,
    });
  }
  return out;
}

/**
 * Educational sample forwards — not contract terms; illustrative for ORF coursework.
 */
const SAMPLE_FORWARDS = [
  {
    id: 'F-01',
    pair: 'EUR/USD',
    buyBaseCcy: 'EUR',
    notionalUsd: 2_400_000,
    settlement: '3M',
    spotRef: 1.084,
    fwdAllIn: 1.087,
    descr: 'EUR pay fixed on German structural steel exposure',
    riskUsd: -42_000,
    tier: 'Med',
    hedgeCoveragePct: 55,
  },
  {
    id: 'F-02',
    pair: 'USD/JPY',
    buyBaseCcy: 'JPY',
    notionalUsd: 1_100_000,
    settlement: '6M',
    spotRef: 154.25,
    fwdAllIn: 154.92,
    descr: 'Hedge yen receivables for Japan battery harness suppliers',
    riskUsd: 78_500,
    tier: 'High',
    hedgeCoveragePct: 40,
  },
  {
    id: 'F-03',
    pair: 'GBP/USD',
    buyBaseCcy: 'GBP',
    notionalUsd: 890_000,
    settlement: '1Y',
    spotRef: 1.266,
    fwdAllIn: 1.272,
    descr: 'GBP-linked casting services from UK subcontractors',
    riskUsd: -15_700,
    tier: 'Low',
    hedgeCoveragePct: 70,
  },
];

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function formatUsdSigned(n) {
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  });
  return fmt.format(Math.round(n));
}

function FXPage() {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(DEFAULT_CURRENCIES);
  const [newCurrency, setNewCurrency] = useState('');
  const [focusedCode, setFocusedCode] = useState(DEFAULT_CURRENCIES[0]?.code ?? 'EUR');
  const [stressShockPct, setStressShockPct] = useState(3);

  const daySeed = Math.floor(Date.now() / 86400000);

  const originCountry = user?.company ? COMPANY_ORIGINS[user.company] || 'Global' : 'Global';
  const exposureLevel = COUNTRY_EXPOSURE[originCountry] || 'Standard';

  const curvesByCode = useMemo(() => {
    const map = {};
    tracked.forEach((item) => {
      map[item.code] = buildIntradayCurve(item.code, item.rate, daySeed);
    });
    return map;
  }, [tracked, daySeed]);

  const forwardsStressed = useMemo(() => {
    const m = clamp(stressShockPct, 0, 12) / 100;
    return SAMPLE_FORWARDS.map((row) => ({
      ...row,
      stressedUsd: Math.round(row.riskUsd * (1 + m)),
    }));
  }, [stressShockPct]);

  const forwardsAgg = useMemo(() => {
    const sumAbs = SAMPLE_FORWARDS.reduce((acc, row) => acc + Math.abs(row.riskUsd), 0);
    const stressed = forwardsStressed.reduce((acc, row) => acc + Math.abs(row.stressedUsd), 0);
    return { nominalAbsUsd: sumAbs, stressedScenarioAbsUsd: stressed };
  }, [forwardsStressed]);

  const currencyRisk = useMemo(() => {
    return {
      label: exposureLevel,
      description:
        originCountry === 'Global'
          ? 'No company profile selected — log in or pick a persona to align FX notes with sourcing geography.'
          : originCountry === 'Taiwan'
            ? 'High sensitivity to USD/TWD swings for semiconductor-heavy supply chains.'
            : originCountry === 'Germany'
              ? 'EUR exposure dominates landed cost for Continental suppliers and rail lanes.'
              : originCountry === 'France'
                ? 'EUR risk material for EU suppliers; pair with ECB policy windows when rolling hedges.'
                : 'Exposure follows supplier currency pricing and tenor of payables.',
    };
  }, [exposureLevel, originCountry]);

  const addCurrency = () => {
    const code = newCurrency.toUpperCase().trim().slice(0, 6);
    if (!code || tracked.some((item) => item.code === code)) {
      setNewCurrency('');
      return;
    }
    setTracked((prev) => [...prev, { code, rate: 1.0, trend: '+0.0%', volHint: '—' }]);
    setFocusedCode(code);
    setNewCurrency('');
  };

  const focusedSeries = curvesByCode[focusedCode]?.length ? curvesByCode[focusedCode] : [];

  const onCardKey = useCallback((e, code) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFocusedCode(code);
    }
  }, []);

  const displayNameFor = (item) =>
    META_BY_CODE[item.code]?.name ||
    item.name ||
    G10_CURRENCIES.find((x) => x.code === item.code)?.name ||
    item.code;

  return (
    <main className="page page--wide fx-page">
      <header className="page__header fx-page__hero">
        <p className="eyebrow">FX exposure</p>
        <h1>G10 currency desk</h1>
        <p className="lede lede--muted">
          Intraday paths below are illustrative (seeded demos for coursework — not traded prices). Expand a row to drill in,
          stress sample forwards on the slider, then open Bloomberg or Investing.com for authoritative live quotes.
        </p>
      </header>

      <section className="panel card-soft fx-page__risk">
        <div className="fx-page__risk-row">
          <div>
            <h2>Base exposure</h2>
            <p className="muted">
              Origin country (demo mapping):{' '}
              <strong>{originCountry}</strong>
            </p>
            <p className="muted">
              Profile: <strong>{currencyRisk.label}</strong>
            </p>
          </div>
          <div className="fx-summary-card fx-summary-card--accent">
            <strong>Risk view</strong>
            <p>{currencyRisk.description}</p>
          </div>
        </div>
      </section>

      <section className="panel card-soft fx-page__desk">
        <div className="fx-tracker-header">
          <div>
            <h2>Interactive G10 tracker</h2>
            <p className="muted fx-page__fineprint">
              Click a currency card or row to synchronize the enlarged chart — links open Bloomberg / Investing.com in a new tab.
            </p>
          </div>
          <div className="fx-add-row">
            <input
              value={newCurrency}
              aria-label="Add ISO currency code"
              onChange={(e) => setNewCurrency(e.target.value)}
              placeholder="ISO code e.g. SGD"
              className="fx-page__add-input"
            />
            <button type="button" className="btn btn--primary" onClick={addCurrency}>
              Add to watchlist
            </button>
          </div>
        </div>

        <div className="fx-page__focused">
          <div className="fx-page__focused-head">
            <span className="fx-page__flag-pill">{META_BY_CODE[focusedCode]?.flag || '💱'}</span>
            <div>
              <strong>
                {focusedCode} vs USD — session path (today)
              </strong>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                {META_BY_CODE[focusedCode]?.name || displayNameFor({ code: focusedCode })}
                {' · '}Illustrative only
              </p>
            </div>
            <div className="fx-page__focused-links">
              <a href={bloombergFxUrl(focusedCode)} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                Bloomberg live quote →
              </a>
              <a href={investingPairUrl(focusedCode)} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                Investing.com charts →
              </a>
            </div>
          </div>
          <div className="fx-page__focused-chart-wrap">
            {focusedSeries.length === 0 ? (
              <p className="muted">No series for this code — add supported pairs or reload.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={focusedSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillFxFocused" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="t" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} interval={2} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(x) =>
                      typeof x === 'number' ? (focusedCode === 'JPY' ? x.toPrecision(5) : x.toFixed(4)) : ''
                    }
                    stroke="#64748b"
                    width={focusedCode === 'JPY' ? 68 : 58}
                  />
                  <Tooltip
                    formatter={(v) => [typeof v === 'number' ? v.toPrecision(7) : v, `${focusedCode}`]}
                    labelFormatter={(l) => `Label (UTC-ish): ${l}`}
                  />
                  <Area type="monotone" dataKey="v" name={focusedCode} stroke="#4338ca" fill="url(#fillFxFocused)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="fx-page__cards">
          {tracked.map((item) => {
            const curve = curvesByCode[item.code] || [];
            const hi = curve.length ? Math.max(...curve.map((d) => d.v)) : item.rate;
            const lo = curve.length ? Math.min(...curve.map((d) => d.v)) : item.rate;
            const active = focusedCode === item.code;
            const meta = META_BY_CODE[item.code];
            return (
              <button
                type="button"
                key={item.code}
                className={`fx-currency-card${active ? ' is-active' : ''}`}
                onClick={() => setFocusedCode(item.code)}
                onKeyDown={(e) => onCardKey(e, item.code)}
              >
                <div className="fx-currency-card__top">
                  <span className="fx-currency-card__flag">{meta?.flag ?? '💱'}</span>
                  <div>
                    <span className="fx-currency-card__code">{item.code}</span>
                    <span className="muted fx-currency-card__name">{meta?.name ?? displayNameFor(item)}</span>
                  </div>
                  <span className={`fx-currency-card__pill fx-vol-${(item.volHint || 'Low').toLowerCase()}`}>
                    {item.volHint || '—'} vol
                  </span>
                </div>
                <div className="fx-currency-card__rates">
                  <span>
                    <small>Mid</small>{' '}
                    <strong>{item.rate.toFixed(item.code === 'JPY' ? 6 : 4)}</strong>
                  </span>
                  <span className="fx-currency-card__trend">{item.trend}</span>
                </div>
                <div className="fx-currency-card__spark" aria-hidden="true">
                  {curve.length > 0 && (
                    <ResponsiveContainer width="100%" height={48}>
                      <AreaChart data={curve} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id={`spark${item.code}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={active ? '#818cf8' : '#cbd5f5'} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={active ? '#c7d2fe' : '#e2e8f0'} stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <Area type="stepAfter" dataKey="v" stroke="#6366f1" strokeWidth={1} fill={`url(#spark${item.code})`} isAnimationActive={false} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="fx-currency-card__range muted">
                  Session Δ {curve.length === 0 ? '—' : `${((hi - lo) / lo * 100).toFixed(2)}%`}
                </div>
                <div className="fx-currency-card__links" onClick={(e) => e.stopPropagation()} role="presentation">
                  <a href={bloombergFxUrl(item.code)} target="_blank" rel="noopener noreferrer" className="fx-link-mini">
                    Bloomberg
                  </a>
                  <a href={investingPairUrl(item.code)} target="_blank" rel="noopener noreferrer" className="fx-link-mini fx-link-mini--muted">
                    Investing.com
                  </a>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fx-page__table-wrap">
          <table className="company-quote-table fx-page__table">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Mid (USD / unit)</th>
                <th>Illustrative day range</th>
                <th>24h badge</th>
                <th>Charts</th>
              </tr>
            </thead>
            <tbody>
              {tracked.map((item) => {
                const curve = curvesByCode[item.code] || [];
                const hi = curve.length ? Math.max(...curve.map((d) => d.v)) : item.rate;
                const lo = curve.length ? Math.min(...curve.map((d) => d.v)) : item.rate;
                return (
                  <tr key={`row-${item.code}`}>
                    <td>
                      <strong>{item.code}</strong>
                      <span className="muted" style={{ display: 'block', fontWeight: 400 }}>
                        {displayNameFor(item)}
                      </span>
                    </td>
                    <td>{item.rate.toFixed(item.code === 'JPY' ? 6 : 4)}</td>
                    <td>
                      {curve.length === 0
                        ? '—'
                        : `${lo.toFixed(item.code === 'JPY' ? 7 : 4)} … ${hi.toFixed(item.code === 'JPY' ? 7 : 4)}`}
                    </td>
                    <td>{item.trend}</td>
                    <td>
                      <a href={bloombergFxUrl(item.code)} target="_blank" rel="noopener noreferrer" className="fx-link-mini">
                        Bloomberg
                      </a>
                      {' · '}
                      <a href={investingPairUrl(item.code)} target="_blank" rel="noopener noreferrer" className="fx-link-mini">
                        Investing.com
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel card-soft fx-forwards">
        <div className="fx-forwards__head">
          <div>
            <h2>Sample forward contracts — risk cockpit</h2>
            <p className="muted fx-page__fineprint">
              Hypothetical payables/forwards pegged to your procurement scenario (education only — not transactional).
              Tune the adverse-move slider to visualize how tenor and residual FX gap affect mark-to-market.
            </p>
          </div>
          <label className="fx-stress-field">
            <span>Stress move (Δ)</span>
            <input
              type="range"
              min={0}
              max={12}
              value={stressShockPct}
              onChange={(e) => setStressShockPct(Number(e.target.value))}
            />
            <strong>{stressShockPct}%</strong>
          </label>
        </div>

        <div className="fx-forwards__summary">
          <div className="fx-metric-chip">
            <span>Σ | illustrative MtM |</span>
            <strong>{formatUsdSigned(forwardsAgg.nominalAbsUsd)}</strong>
          </div>
          <div className="fx-metric-chip fx-metric-chip--stress">
            <span>Stress scenario (slider)</span>
            <strong>{formatUsdSigned(forwardsAgg.stressedScenarioAbsUsd)}</strong>
          </div>
        </div>

        <div className="fx-forwards-grid">
          {forwardsStressed.map((row) => (
            <article key={row.id} className={`fx-forward-card fx-forward-tier--${row.tier.toLowerCase()}`}>
              <header>
                <strong>{row.pair}</strong>
                <span className="muted">{row.id}</span>
              </header>
              <dl className="fx-forward-meta">
                <div>
                  <dt>Settlement</dt>
                  <dd>{row.settlement}</dd>
                </div>
                <div>
                  <dt>Spot → Fwd (all‑in)</dt>
                  <dd>
                    {row.buyBaseCcy === 'JPY'
                      ? `${Number(row.spotRef).toFixed(2)} → ${Number(row.fwdAllIn).toFixed(2)}`
                      : `${row.spotRef.toFixed(4)} → ${row.fwdAllIn.toFixed(4)}`}
                  </dd>
                </div>
                <div>
                  <dt>USD notional equiv.</dt>
                  <dd>{formatUsdSigned(row.notionalUsd)}</dd>
                </div>
              </dl>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {row.descr}
              </p>
              <dl className="fx-forward-metrics">
                <div>
                  <dt>Est. residual MtM (base)</dt>
                  <dd className={row.riskUsd < 0 ? 'fx-forward-mtm--loss' : 'fx-forward-mtm--gain'}>
                    {formatUsdSigned(row.riskUsd)}
                  </dd>
                </div>
                <div>
                  <dt>MtM after slider</dt>
                  <dd>{formatUsdSigned(row.stressedUsd)}</dd>
                </div>
                <div>
                  <dt>Hedge coverage %</dt>
                  <dd>{row.hedgeCoveragePct}%</dd>
                </div>
              </dl>
              <footer className="fx-forward-tags">
                <span className="fx-chip">Tier {row.tier}</span>
                <a href={investingPairUrl(row.buyBaseCcy)} target="_blank" rel="noopener noreferrer" className="fx-chip fx-chip--ghost">
                  Track {row.buyBaseCcy} →
                </a>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="panel card-soft fx-page__education">
        <h2>Use in this project</h2>
        <p className="muted">
          Pair this view with BOM quotes denominated in non-USD: forward coverage reduces variance on committed supplier spend.
          ECB / Fed policy shocks flow through crosses — always verify live forwards with your treasury desk or Bloomberg/Refinitiv.
        </p>
        <ul className="list-check">
          <li>Country exposure + listed forwards summarize FX risk posture for dashboards.</li>
          <li>Open Bloomberg from any card for authoritative spot and forward ladders.</li>
          <li>Stress slider approximates nonlinear gap risk on illustrative notionals — substitute your actual hedge ratio during review.</li>
        </ul>
      </section>
    </main>
  );
}

export default FXPage;
