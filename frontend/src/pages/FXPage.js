import React, { useMemo, useState } from 'react';
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
const DEFAULT_CURRENCIES = [
  { code: 'EUR', rate: 1.08, trend: '+0.8%' },
  { code: 'JPY', rate: 0.0065, trend: '-0.2%' },
  { code: 'GBP', rate: 1.26, trend: '+0.4%' },
  { code: 'AUD', rate: 0.67, trend: '-0.1%' },
  { code: 'CAD', rate: 0.74, trend: '+0.2%' },
  { code: 'CHF', rate: 1.10, trend: '+0.1%' },
  { code: 'NZD', rate: 0.61, trend: '+0.3%' },
  { code: 'SEK', rate: 0.090, trend: '-0.5%' },
  { code: 'NOK', rate: 0.088, trend: '+0.0%' },
];

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

function FXPage() {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(DEFAULT_CURRENCIES);
  const [newCurrency, setNewCurrency] = useState('');
  const originCountry = user?.company ? COMPANY_ORIGINS[user.company] || 'Global' : 'Global';
  const exposureLevel = COUNTRY_EXPOSURE[originCountry] || 'Standard';

  const addCurrency = () => {
    const code = newCurrency.toUpperCase().trim();
    if (!code || tracked.some((item) => item.code === code)) {
      setNewCurrency('');
      return;
    }
    setTracked((prev) => [...prev, { code, rate: 1.0, trend: '+0.0%' }]);
    setNewCurrency('');
  };

  const currencyRisk = useMemo(() => {
    return {
      label: exposureLevel,
      description:
        originCountry === 'Global'
          ? 'No company selected. Log in to see a tailored currency exposure profile.'
          : originCountry === 'Taiwan'
          ? 'High import sensitivity to USD/TWD swings, especially for semiconductor inputs.'
          : originCountry === 'Germany'
          ? 'Exposure is tied to EUR sourcing and transit costs for European suppliers.'
          : originCountry === 'France'
          ? 'Euro risk is material and should be monitored alongside trade lane volatility.'
          : 'Origin currency exposure is aligned with supplier country pricing and FX hedging plans.',
    };
  }, [exposureLevel, originCountry]);

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">FX exposure</p>
        <h1>G10 currency tracker</h1>
        <p className="lede lede--muted">
          Track major forex pairs in a simple, procurement-focused view. Add a currency to monitor bespoke exposure for your supplier origins.
        </p>
      </header>

      <section className="panel card-soft">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2>Base exposure</h2>
            <p className="muted">Origin country: <strong>{originCountry}</strong></p>
            <p className="muted">Currency exposure factor: <strong>{currencyRisk.label}</strong></p>
          </div>
          <div className="fx-summary-card">
            <strong>Risk view</strong>
            <p>{currencyRisk.description}</p>
          </div>
        </div>
      </section>

      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <div className="fx-tracker-header">
          <h2>Live G10 tracker</h2>
          <div className="fx-add-row">
            <input
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              placeholder="Add code (e.g. SGD)"
            />
            <button type="button" className="btn btn--primary" onClick={addCurrency}>
              Add
            </button>
          </div>
        </div>
        <table className="company-quote-table">
          <thead>
            <tr>
              <th>Currency</th>
              <th>USD rate</th>
              <th>24h trend</th>
              <th>Exposure note</th>
            </tr>
          </thead>
          <tbody>
            {tracked.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.rate.toFixed(4)}</td>
                <td>{item.trend}</td>
                <td>{item.code === 'USD' ? 'Base currency' : 'Primary trading pair'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <h2>FX and country exposure</h2>
        <p className="muted">Your active company is mapped to a common origin country for demo purposes. Real quotes will refine this exposure by line item and supplier currency.</p>
        <ul className="list-check">
          <li>Country of origin informs FX hedging priority.</li>
          <li>Higher risk for non-USD supply chains where currency swings drive landed cost volatility.</li>
          <li>G10 monitoring is a good baseline; add local and emerging currencies for deep supplier coverage.</li>
        </ul>
      </section>
    </main>
  );
}

export default FXPage;
