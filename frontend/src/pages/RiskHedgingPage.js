import React, { useMemo, useState } from 'react';
import WorldMapMonitor from '../components/WorldMapMonitor';
import LizPanel from '../components/LizPanel';

/* Mock “quote line” inventory — in production, hydrate from /api/v1/quotes */
const MOCK_LINES = [
  { id: 'q1', product: 'Hardened steel bracket', material: 'AISI 4140', country: 'Germany', currency: 'EUR', originPort: 'Hamburg' },
  { id: 'q2', product: 'PCB assembly', material: 'FR-4, tin-lead', country: 'China', currency: 'CNY', originPort: 'Shenzhen' },
  { id: 'q3', product: 'Aluminum extrusion', material: '6061-T6', country: 'Mexico', currency: 'MXN', originPort: 'Monterrey' },
];

const TRANSPORT = {
  sea: { label: 'Ocean freight', days: '28–40', relCost: 'Lowest $/kg', co2: 'Lower vs air' },
  air: { label: 'Air cargo', days: '3–7', relCost: 'Premium', co2: 'Higher' },
  land: { label: 'Rail / truck', days: '10–20', relCost: 'Mid', co2: 'Varies' },
};

const TARIFF_LINK = 'https://hts.usitc.gov/';

function RiskHedgingPage() {
  const [lineId, setLineId] = useState(MOCK_LINES[0].id);
  const [activeRoute, setActiveRoute] = useState('sea');
  const line = useMemo(() => MOCK_LINES.find((l) => l.id === lineId) || MOCK_LINES[0], [lineId]);

  const showFx = line.currency && line.currency !== 'USD';
  const fxMock = { pair: `${line.currency}/USD`, rate: '— live feed TBD', hedge: 'Forward & spot benchmark' };

  const tariffScore = useMemo(() => {
    const base = 100 - (line.country === 'China' ? 32 : line.country === 'Germany' ? 8 : 18);
    return Math.max(12, Math.min(96, base));
  }, [line.country]);

  return (
    <div className="page-risk">
      <main className="page page--wide">
        <header className="page__header page__header--split">
          <div>
            <p className="eyebrow">Global supply &amp; import risk</p>
            <h1>Risk &amp; hedging</h1>
            <p className="lede lede--muted">
              Pick a line from your quote universe, inspect routes on the map, and read tariff and FX in one place—World Monitor style, stripped to essentials.
            </p>
          </div>
        </header>

        <div className="risk-grid">
          <section className="panel risk-panel" aria-label="Selection">
            <h2>Line from supplier quote</h2>
            <label className="field-inline">
              <span>Product / material</span>
              <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
                {MOCK_LINES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.product} — {l.material} ({l.country})
                  </option>
                ))}
              </select>
            </label>
            <dl className="kv">
              <div><dt>Origin</dt><dd>{line.country} · {line.originPort}</dd></div>
              <div><dt>Material</dt><dd>{line.material}</dd></div>
            </dl>
          </section>

          <section className="panel risk-panel map-wrap">
            <div className="map-head">
              <h2>Route monitor</h2>
              <div className="seg" role="tablist" aria-label="Transport mode">
                {Object.keys(TRANSPORT).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={activeRoute === key ? 'seg__btn is-on' : 'seg__btn'}
                    onClick={() => setActiveRoute(key)}
                  >
                    {TRANSPORT[key].label}
                  </button>
                ))}
              </div>
            </div>
            <WorldMapMonitor
              activeRoute={activeRoute}
              originLabel={line.originPort}
              destLabel="US hub"
            />
            <div className="transport-cards">
              {Object.entries(TRANSPORT).map(([key, t]) => (
                <article key={key} className={key === activeRoute ? 't-card is-active' : 't-card'} onClick={() => setActiveRoute(key)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setActiveRoute(key)}>
                  <h3>{t.label}</h3>
                  <p className="t-meta">{t.days} · {t.relCost}</p>
                  <p className="t-co2">{t.co2}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel risk-panel">
            <h2>Tariff potential</h2>
            <p className="muted small">Linked view — align HS codes in your data model for production scores.</p>
            <a className="link-tariff" href={TARIFF_LINK} target="_blank" rel="noreferrer">
              Open USITC HTS / tariff report →
            </a>
            <div className="tariff-gauge" aria-label={`Tariff risk score ${tariffScore} out of 100`}>
              <div className="tariff-gauge__bar">
                <div className="tariff-gauge__fill" style={{ width: `${tariffScore}%` }} />
              </div>
              <div className="tariff-gauge__row">
                <span>Score</span>
                <strong>{tariffScore}</strong>
                <span className="muted small">(heuristic: origin + material class)</span>
              </div>
            </div>
          </section>

          <section className={`panel risk-panel ${showFx ? '' : 'is-dim'}`}>
            <h2>FX exposure</h2>
            {showFx ? (
              <>
                <p className="fx-pair">{fxMock.pair}</p>
                <ul className="fx-list">
                  <li>Quote currency: <strong>{line.currency}</strong> vs your USD books</li>
                  <li>Spot &amp; forward: {fxMock.hedge}</li>
                  <li className="muted small">Connect treasury feed for live rate (placeholder).</li>
                </ul>
              </>
            ) : (
              <p className="muted">USD-quoted line — no cross-currency hedge needed for this selection.</p>
            )}
          </section>
        </div>
      </main>

      <LizPanel product={line.product} material={line.material} country={line.country} />
    </div>
  );
}

export default RiskHedgingPage;
