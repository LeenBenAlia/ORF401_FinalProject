import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'KRW', name: 'Korean Won', flag: '🇰🇷' },
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
  { code: 'CNY', rate: 0.138, trend: '-0.1%', volHint: 'Med' },
  { code: 'TWD', rate: 0.031, trend: '+0.2%', volHint: 'High' },
  { code: 'MXN', rate: 0.058, trend: '-0.1%', volHint: 'Med' },
  { code: 'KRW', rate: 0.00075, trend: '-0.3%', volHint: 'High' },
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

const FWD_LAB_TENORS = [
  { id: '3M', label: '3 months', mo: 3 },
  { id: '6M', label: '6 months', mo: 6 },
  { id: '1Y', label: '12 months', mo: 12 },
];

/** Illustrative forwards curve — seeded, not tradable quotes. */
function computeIllustrativeForward(spot, code, tenorMo) {
  const mo = tenorMo || 6;
  const basis = [...String(code)].reduce((acc, ch, i) => acc + ch.charCodeAt(i) * (19 + i), mo * 911);
  const drift = ((((basis >>> 5) % 31) - 14) / 10000) * (mo / 12);
  return spot * (1 + drift);
}

function forwardPointsPips(spot, fwd, code) {
  if (!spot || !fwd) return 0;
  const diff = Math.abs(fwd - spot);
  if (['JPY', 'KRW'].includes(code)) return Math.round(diff * 100); // yen pips shorthand
  return Math.round((diff / spot) * 10000); // majors
}

/** Naive payoff mock: payoff if forward lock vs hypothetical settlement spot. */
function illustrativeHedgePnLUsd({ notionalUsd, spotRef, fwdLock, settleSpot, sidePayForeign }) {
  if (!notionalUsd || !fwdLock) return 0;
  const s = settleSpot || spotRef;
  if (!s) return 0;
  const rel = sidePayForeign === 'pay_foreign' ? (fwdLock - s) / s : (s - fwdLock) / s;
  return Math.round(notionalUsd * clamp(rel, -0.25, 0.25));
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
  const [searchParams] = useSearchParams();
  const [tracked, setTracked] = useState(DEFAULT_CURRENCIES);
  const [newCurrency, setNewCurrency] = useState('');
  const [focusedCode, setFocusedCode] = useState(DEFAULT_CURRENCIES[0]?.code ?? 'EUR');
  const [stressShockPct, setStressShockPct] = useState(3);
  /** User-built forward mocks for the cockpit grid */
  const [userForwardContracts, setUserForwardContracts] = useState([]);
  /** Forward lab */
  const [labCcy, setLabCcy] = useState('EUR');
  const [labTenor, setLabTenor] = useState('6M');
  const [labNotionalUsd, setLabNotionalUsd] = useState(750_000);
  const [labSide, setLabSide] = useState('pay_foreign');
  const [labSettleSpot, setLabSettleSpot] = useState('');

  const daySeed = Math.floor(Date.now() / 86400000);

  const fromBaseline = searchParams.get('from') === 'baseline';
  const baselineScenario = searchParams.get('scenario');
  const baselineInsight = searchParams.get('insight');

  useEffect(() => {
    if (searchParams.get('from') !== 'baseline') return;
    const raw = searchParams.get('focus');
    if (!raw) return;
    const codes = raw
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (!codes.length) return;
    setTracked((prev) => {
      const have = new Set(prev.map((x) => x.code));
      const next = [...prev];
      codes.forEach((code) => {
        if (have.has(code)) return;
        have.add(code);
        next.push({
          code,
          rate: 1.0,
          trend: '—',
          volHint: 'Med',
        });
      });
      return next;
    });
    setFocusedCode(codes[0]);
  }, [searchParams]);

  const originCountry = user?.company ? COMPANY_ORIGINS[user.company] || 'Global' : 'Global';
  const exposureLevel = COUNTRY_EXPOSURE[originCountry] || 'Standard';

  const curvesByCode = useMemo(() => {
    const map = {};
    tracked.forEach((item) => {
      map[item.code] = buildIntradayCurve(item.code, item.rate, daySeed);
    });
    return map;
  }, [tracked, daySeed]);

  const labTenorMo = FWD_LAB_TENORS.find((t) => t.id === labTenor)?.mo ?? 6;
  const labSpotRef = tracked.find((t) => t.code === labCcy)?.rate ?? 1;
  const labFwdLock = useMemo(
    () => computeIllustrativeForward(labSpotRef, labCcy, labTenorMo),
    [labSpotRef, labCcy, labTenorMo]
  );
  const labSettleParsed = labSettleSpot.trim() === '' ? labSpotRef : parseFloat(labSettleSpot.replace(/,/g, ''));
  const labSettleOk = Number.isFinite(labSettleParsed) ? labSettleParsed : labSpotRef;
  const labPnl = illustrativeHedgePnLUsd({
    notionalUsd: labNotionalUsd,
    spotRef: labSpotRef,
    fwdLock: labFwdLock,
    settleSpot: labSettleOk,
    sidePayForeign: labSide,
  });

  const forwardsStressed = useMemo(() => {
    const m = clamp(stressShockPct, 0, 12) / 100;
    const stressRow = (row) => ({
      ...row,
      stressedUsd: Math.round(row.riskUsd * (1 + m)),
    });
    return [...SAMPLE_FORWARDS.map(stressRow), ...userForwardContracts.map(stressRow)];
  }, [stressShockPct, userForwardContracts]);

  const forwardsAgg = useMemo(() => {
    const baseRows = [...SAMPLE_FORWARDS, ...userForwardContracts];
    const sumAbs = baseRows.reduce((acc, row) => acc + Math.abs(row.riskUsd), 0);
    const stressed = forwardsStressed.reduce((acc, row) => acc + Math.abs(row.stressedUsd), 0);
    return { nominalAbsUsd: sumAbs, stressedScenarioAbsUsd: stressed };
  }, [userForwardContracts, forwardsStressed]);

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

  const addLabForwardToCockpit = useCallback(() => {
    const id = `LAB-${Date.now()}`;
    const pair = `${labCcy}/USD`;
    const tenorLabel = FWD_LAB_TENORS.find((t) => t.id === labTenor)?.label || labTenor;
    const row = {
      id,
      pair,
      buyBaseCcy: labCcy,
      notionalUsd: labNotionalUsd,
      settlement: tenorLabel,
      spotRef:
        labCcy === 'JPY' || labCcy === 'KRW'
          ? Number(labSpotRef.toFixed(labCcy === 'KRW' ? 6 : 5))
          : Number(labSpotRef.toFixed(4)),
      fwdAllIn:
        labCcy === 'JPY' || labCcy === 'KRW'
          ? Number(labFwdLock.toFixed(labCcy === 'KRW' ? 6 : 5))
          : Number(labFwdLock.toFixed(4)),
      descr: `Mock forward (${labSide === 'pay_foreign' ? 'pay foreign' : 'receive foreign'}, lab)`,
      riskUsd: illustrativeHedgePnLUsd({
        notionalUsd: labNotionalUsd,
        spotRef: labSpotRef,
        fwdLock: labFwdLock,
        settleSpot: labSettleOk,
        sidePayForeign: labSide,
      }),
      tier: 'Med',
      hedgeCoveragePct: 50,
      isUserLab: true,
    };
    setUserForwardContracts((prev) => [...prev, row]);
  }, [labCcy, labFwdLock, labNotionalUsd, labSettleOk, labSide, labTenor, labSpotRef]);

  const displayNameFor = (item) =>
    META_BY_CODE[item.code]?.name ||
    item.name ||
    G10_CURRENCIES.find((x) => x.code === item.code)?.name ||
    item.code;

  return (
    <main className="page page--wide fx-page">
      {fromBaseline && (
        <aside className="panel card-soft fx-baseline-import" role="note">
          <p className="muted" style={{ margin: 0 }}>
            <strong>Baseline mix</strong>
            {baselineScenario ? `: ${baselineScenario}` : ''}. FX share is illustrative.
            {baselineInsight ? (
              <>
                <br />
                <span style={{ color: 'var(--ink)' }}>{baselineInsight}</span>
              </>
            ) : null}
          </p>
        </aside>
      )}

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

      <section className="panel card-soft fx-forward-lab">
        <div className="fx-forward-lab__head">
          <div>
            <h2>Forward lab — draft &amp; stress-test contracts</h2>
            <p className="muted fx-page__fineprint">
              Inputs use the mid from your watchlist (or 1.0 if the code isn’t tracked). Outputs are illustrative
              coursework mocks — plug your own treasury ladder for real trades.
            </p>
          </div>
        </div>
        <div className="fx-forward-lab__grid">
          <label className="fx-forward-lab__field">
            <span>Currency vs USD</span>
            <select className="fx-forward-lab__select" value={labCcy} onChange={(e) => setLabCcy(e.target.value)}>
              {tracked.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} ({displayNameFor(item)})
                </option>
              ))}
            </select>
          </label>
          <label className="fx-forward-lab__field">
            <span>Settlement tenor</span>
            <select className="fx-forward-lab__select" value={labTenor} onChange={(e) => setLabTenor(e.target.value)}>
              {FWD_LAB_TENORS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fx-forward-lab__field">
            <span>Exposure (USD-equiv notional)</span>
            <input
              type="number"
              className="fx-forward-lab__input"
              min={5000}
              step={5000}
              value={labNotionalUsd}
              onChange={(e) => setLabNotionalUsd(Number(e.target.value) || 0)}
            />
          </label>
          <fieldset className="fx-forward-lab__field fx-forward-lab__fieldset">
            <legend>Hedge intuition</legend>
            <label className="fx-forward-lab__radio">
              <input type="radio" name="fwdSide" checked={labSide === 'pay_foreign'} onChange={() => setLabSide('pay_foreign')} />
              Pay supplier in quote currency later
            </label>
            <label className="fx-forward-lab__radio">
              <input type="radio" name="fwdSide" checked={labSide === 'receive_foreign'} onChange={() => setLabSide('receive_foreign')} />
              Receive proceeds in quote currency later
            </label>
          </fieldset>
          <label className="fx-forward-lab__field">
            <span>Hypothetical spot at expiry (stress test vs mid)</span>
            <input
              type="text"
              className="fx-forward-lab__input"
              placeholder={String(labSpotRef)}
              value={labSettleSpot}
              onChange={(e) => setLabSettleSpot(e.target.value)}
            />
          </label>
        </div>
        <div className="fx-forward-lab__results panel card-soft fx-forward-lab__band">
          <div className="fx-forward-lab__cols">
            <div>
              <span className="muted">Mid (watchlist)</span>
              <strong className="fx-forward-lab__num">{labSpotRef.toFixed(['JPY', 'KRW'].includes(labCcy) ? (labCcy === 'KRW' ? 6 : 5) : 4)}</strong>
            </div>
            <div>
              <span className="muted">Mock forward ({labTenor})</span>
              <strong className="fx-forward-lab__num">{labFwdLock.toFixed(['JPY', 'KRW'].includes(labCcy) ? (labCcy === 'KRW' ? 6 : 5) : 4)}</strong>
            </div>
            <div>
              <span className="muted">Points (illus.)</span>
              <strong className="fx-forward-lab__num">{forwardPointsPips(labSpotRef, labFwdLock, labCcy)}</strong>
            </div>
            <div>
              <span className="muted">Est. payoff @ stress spot</span>
              <strong className={`fx-forward-lab__pnl ${labPnl <= 0 ? 'fx-forward-lab__pnl--loss' : 'fx-forward-lab__pnl--gain'}`}>
                {formatUsdSigned(labPnl)}
              </strong>
            </div>
          </div>
          <div className="fx-forward-lab__actions">
            <button type="button" className="btn btn--primary" onClick={addLabForwardToCockpit}>
              Add result to cockpit below
            </button>
            {userForwardContracts.filter((x) => x.isUserLab).length > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setUserForwardContracts((prev) => prev.filter((r) => !r.isUserLab))}
              >
                Clear lab entries
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel card-soft fx-forwards">
        <div className="fx-forwards__head">
          <div>
            <h2>Forward contracts cockpit (sample + your lab adds)</h2>
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
            <article
              key={row.id}
              className={`fx-forward-card fx-forward-tier--${row.tier.toLowerCase()}${row.isUserLab ? ' fx-forward-card--lab' : ''}`}
            >
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
