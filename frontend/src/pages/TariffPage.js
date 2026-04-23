import React, { useState } from 'react';
import WorldMapMonitor from '../components/WorldMapMonitor';
import { useAuth } from '../auth';

const ROUTES = [
  { id: 'sea', label: 'ocean freight', from: { x: 14, y: 48 }, to: { x: 82, y: 34 }, color: 'var(--route-sea)' },
  { id: 'air', label: 'air cargo', from: { x: 18, y: 22 }, to: { x: 78, y: 30 }, color: 'var(--route-air)' },
  { id: 'land', label: 'rail / truck', from: { x: 42, y: 28 }, to: { x: 58, y: 42 }, color: 'var(--route-land)' },
];

const PORTS = [
  { x: 14, y: 48, label: 'Hamburg', type: 'port' },
  { x: 78, y: 34, label: 'Savannah', type: 'port' },
  { x: 18, y: 22, label: 'Paris', type: 'port' },
  { x: 54, y: 20, label: 'Seoul', type: 'port' },
];

const CONFLICT_ZONES = [
  { x: 40, y: 24, label: 'Red sea tension' },
  { x: 68, y: 12, label: 'Taiwan Strait' },
  { x: 32, y: 44, label: 'Eastern Europe alert' },
];

function TariffPage() {
  const { user } = useAuth();
  const [activeRoute, setActiveRoute] = useState('sea');
  const company = user?.company || 'Your company';
  const tariffScore = 100 - (activeRoute === 'air' ? 28 : activeRoute === 'land' ? 16 : 35);

  return (
    <main className="page page--wide">
      <header className="page__header page__header--split">
        <div>
          <p className="eyebrow">Tariff risk</p>
          <h1>Tariff and trade-route view</h1>
          <p className="lede lede--muted">
            Track tariff sensitivity across major supply lanes and conflict zones. This view is designed to be lightweight like World Monitor,
            with a focus on ports, container routes, and the shipping corridors that matter.
          </p>
        </div>
      </header>

      <div className="risk-grid">
        <section className="panel risk-panel">
          <h2>Company context</h2>
          <p className="muted">Signed in as <strong>{company}</strong>. Supplier tariffs are shaped by origin countries, trade documentation, and route choice.</p>
          <dl className="kv">
            <div><dt>Active route</dt><dd>{activeRoute.toUpperCase()}</dd></div>
            <div><dt>Tariff risk score</dt><dd>{tariffScore}/100</dd></div>
            <div><dt>Recommended action</dt><dd>{activeRoute === 'air' ? 'Use air only for urgent, high-value parts' : activeRoute === 'land' ? 'Optimize inland trucking and customs handling' : 'Prefer ocean shipping with route intelligence'}</dd></div>
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
          <p className="muted">These zones are visible on trade routes when you need to align supplier choice with import clearance and insurance planning.</p>
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
