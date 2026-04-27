import React, { useState } from 'react';
import WorldMapMonitor from '../components/WorldMapMonitor';
import { useAuth } from '../auth';

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
