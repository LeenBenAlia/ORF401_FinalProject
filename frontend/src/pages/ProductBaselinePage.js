import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../auth';

/** Rough FX vs USD for rolled-up BOM display */
const FX_TO_USD = { USD: 1, EUR: 1.085, GBP: 1.263, MXN: 0.058, CNY: 0.138, JPY: 0.0065, KRW: 0.00075, TWD: 0.031 };

function toUsd(amount, currency) {
  const c = currency || 'USD';
  const rate = FX_TO_USD[c] ?? 1;
  return amount * rate;
}

function formatUsd(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n));
}

/**
 * Invented supplier quote lines — demo only (not legal / commercial reality).
 */
const SUPPLIER_DATA = {
  Tesla: [
    {
      id: 'T-VIN-901',
      supplier: 'VoltageWorks GmbH',
      country: 'Germany',
      currency: 'EUR',
      items: [
        { sku: 'TW-EU-E01', name: '800V busbar assembly kit', quantity: 1, unitCost: 1420, currency: 'EUR', category: 'Electrical' },
        { sku: 'TW-EU-E02', name: 'BMS sensing harness (double shielded)', quantity: 120, unitCost: 14.25, currency: 'EUR', category: 'Electrical' },
      ],
    },
    {
      id: 'T-STR-771',
      supplier: 'Panthera Cast & Stamp',
      country: 'USA',
      currency: 'USD',
      items: [
        { sku: 'TW-STR-S01', name: 'Ultra-high-strength door ring subassembly', quantity: 4, unitCost: 890, currency: 'USD', category: 'Structural' },
        { sku: 'TW-STR-S02', name: 'Giga-press magnesium cross-car beam', quantity: 1, unitCost: 2100, currency: 'USD', category: 'Structural' },
        { sku: 'TW-STR-S03', name: 'Rear mega-casting (single piece)', quantity: 1, unitCost: 1650, currency: 'USD', category: 'Structural' },
      ],
    },
    {
      id: 'T-BAT-440',
      supplier: 'Kairo Cell Partners',
      country: 'Japan',
      currency: 'USD',
      items: [
        { sku: 'TW-BAT-B01', name: 'Structured battery module (2170 pack segment)', quantity: 28, unitCost: 118, currency: 'USD', category: 'Battery' },
        { sku: 'TW-BAT-B02', name: 'Module interconnect & cooling spine', quantity: 28, unitCost: 36, currency: 'USD', category: 'Battery' },
      ],
    },
    {
      id: 'T-SHA-220',
      supplier: 'GigaForge Shanghai Tier-1 JV',
      country: 'China',
      currency: 'CNY',
      items: [
        { sku: 'TW-SHF-C01', name: 'Structural battery deck closure panels', quantity: 2, unitCost: 4800, currency: 'CNY', category: 'Structural' },
        { sku: 'TW-SHF-C02', name: 'HVAC blower housing (composite)', quantity: 4, unitCost: 920, currency: 'CNY', category: 'Thermal' },
      ],
    },
    {
      id: 'T-NMX-633',
      supplier: 'Baja AeroFasteners',
      country: 'Mexico',
      currency: 'MXN',
      items: [
        { sku: 'TW-FAS-M01', name: 'High-torque powertrain fasteners (kit)', quantity: 480, unitCost: 8.9, currency: 'MXN', category: 'Fasteners' },
        { sku: 'TW-FAS-M02', name: 'Aluminium rivet collation (body shop)', quantity: 820, unitCost: 1.2, currency: 'MXN', category: 'Fasteners' },
      ],
    },
    {
      id: 'T-XFR-554',
      supplier: 'NordFoam Climate Systems',
      country: 'Sweden',
      currency: 'EUR',
      items: [
        { sku: 'TW-THR-E03', name: 'Heat pump core & octovalve bundle', quantity: 1, unitCost: 2380, currency: 'EUR', category: 'Thermal' },
        { sku: 'TW-THR-E04', name: 'Cabin condensate manifold', quantity: 2, unitCost: 198, currency: 'EUR', category: 'Thermal' },
      ],
    },
    {
      id: 'T-INT-882',
      supplier: 'LumenStack Interiors SAS',
      country: 'France',
      currency: 'EUR',
      items: [
        { sku: 'TW-INS-E05', name: 'Acoustic headliner substrate (veg tan)', quantity: 1, unitCost: 420, currency: 'EUR', category: 'Insulation' },
        { sku: 'TW-INS-E06', name: 'Fire-rated floor carpet mat set', quantity: 1, unitCost: 265, currency: 'EUR', category: 'Insulation' },
      ],
    },
    {
      id: 'T-CTL-991',
      supplier: 'Apex Cyber Metals',
      country: 'USA',
      currency: 'USD',
      items: [
        { sku: 'TW-CT-US01', name: 'Stainless ultra-hard exoskin panel (Cyber)', quantity: 12, unitCost: 640, currency: 'USD', category: 'Structural' },
        { sku: 'TW-CT-US02', name: 'Retractable tonneau actuator rail', quantity: 2, unitCost: 790, currency: 'USD', category: 'Electrical' },
      ],
    },
  ],

  SpaceX: [
    {
      id: 'S-AVN-302',
      supplier: 'Orbital Harness Works',
      country: 'Germany',
      currency: 'EUR',
      items: [
        { sku: 'SX-AV-E01', name: 'Reaction wheel housing (machined titanium)', quantity: 4, unitCost: 12800, currency: 'EUR', category: 'Avionics' },
        { sku: 'SX-AV-E02', name: 'Starlink phased-array backplane tray', quantity: 2, unitCost: 22400, currency: 'EUR', category: 'Avionics' },
      ],
    },
    {
      id: 'S-STR-110',
      supplier: 'Cape Alloy Foundry',
      country: 'USA',
      currency: 'USD',
      items: [
        { sku: 'SX-ST-US1', name: 'Stage inter-tank truss ring weldment', quantity: 1, unitCost: 420000, currency: 'USD', category: 'Structural' },
      ],
    },
    {
      id: 'S-THE-884',
      supplier: 'CryoSeal Thermodynamics',
      country: 'USA',
      currency: 'USD',
      items: [
        { sku: 'SX-TH-US1', name: 'LOX dome insulation blanket assembly', quantity: 12, unitCost: 18800, currency: 'USD', category: 'Thermal' },
      ],
    },
  ],

  Nvidia: [
    {
      id: 'N-SMIC-661',
      supplier: 'Hsinchu Mask & Wafer Logistics',
      country: 'Taiwan',
      currency: 'TWD',
      items: [
        { sku: 'NV-SM-TW01', name: 'H100 reticle-qualified interposer wafer tray', quantity: 48, unitCost: 3850, currency: 'TWD', category: 'Semiconductor' },
        { sku: 'NV-SM-TW02', name: 'CoWoS rework carrier frame', quantity: 96, unitCost: 620, currency: 'TWD', category: 'Semiconductor' },
      ],
    },
    {
      id: 'N-OCL-222',
      supplier: 'Shenzhen Cooling Laboratory',
      country: 'China',
      currency: 'CNY',
      items: [
        { sku: 'NV-OCL-C01', name: 'Vapor-chamber manifold for DGX server backplane', quantity: 8, unitCost: 1180, currency: 'CNY', category: 'Thermal' },
      ],
    },
    {
      id: 'N-PWB-993',
      supplier: 'Fremont Printed Works',
      country: 'USA',
      currency: 'USD',
      items: [
        { sku: 'NV-PWB-US1', name: '96-layer PCB stack-up (GPU carrier)', quantity: 32, unitCost: 940, currency: 'USD', category: 'Electrical' },
      ],
    },
  ],
};

/** Rolling chassis / platform BOM rules per Tesla vehicle program */
const PRODUCT_CONFIGURATIONS = {
  'Tesla Model 3 Highland': {
    name: 'Tesla Model 3 Highland',
    baseCostUsd: 12800,
    description: 'Compact sedan — balanced structural + battery BOM.',
    components: {
      Structural: { required: true, minItems: 2, maxItems: 5 },
      Battery: { required: true, minItems: 1, maxItems: 3 },
      Electrical: { required: true, minItems: 1, maxItems: 3 },
      Thermal: { required: false, minItems: 0, maxItems: 3 },
      Fasteners: { required: true, minItems: 1, maxItems: 3 },
      Insulation: { required: false, minItems: 0, maxItems: 2 },
    },
  },
  'Tesla Model S Plaid': {
    name: 'Tesla Model S Plaid',
    baseCostUsd: 28900,
    description: 'Flagship sedan — high thermal / electrical coupling.',
    components: {
      Structural: { required: true, minItems: 2, maxItems: 5 },
      Battery: { required: true, minItems: 2, maxItems: 4 },
      Electrical: { required: true, minItems: 2, maxItems: 4 },
      Thermal: { required: true, minItems: 1, maxItems: 3 },
      Fasteners: { required: true, minItems: 1, maxItems: 3 },
      Insulation: { required: false, minItems: 0, maxItems: 2 },
    },
  },
  'Tesla Model Y Performance': {
    name: 'Tesla Model Y Performance',
    baseCostUsd: 17400,
    description: 'Crossover — stiffness + ingress protection mix.',
    components: {
      Structural: { required: true, minItems: 3, maxItems: 6 },
      Battery: { required: true, minItems: 1, maxItems: 3 },
      Electrical: { required: true, minItems: 1, maxItems: 3 },
      Thermal: { required: true, minItems: 1, maxItems: 2 },
      Fasteners: { required: true, minItems: 1, maxItems: 4 },
      Insulation: { required: false, minItems: 0, maxItems: 3 },
    },
  },
  'Tesla Cybertruck Dual Motor': {
    name: 'Tesla Cybertruck Dual Motor',
    baseCostUsd: 24500,
    description: 'Stainless structural exoskeleton + tonneau subsystem.',
    components: {
      Structural: { required: true, minItems: 2, maxItems: 8 },
      Battery: { required: true, minItems: 1, maxItems: 3 },
      Electrical: { required: true, minItems: 1, maxItems: 4 },
      Thermal: { required: false, minItems: 0, maxItems: 3 },
      Fasteners: { required: true, minItems: 2, maxItems: 6 },
      Insulation: { required: false, minItems: 0, maxItems: 2 },
    },
  },

  'Falcon 9 booster (Block 5)': {
    name: 'Falcon 9 booster (Block 5)',
    baseCostUsd: 18500000,
    description: 'Reference recovery booster — weld + avionics heavy.',
    components: {
      Avionics: { required: true, minItems: 1, maxItems: 3 },
      Structural: { required: true, minItems: 1, maxItems: 2 },
      Thermal: { required: false, minItems: 0, maxItems: 2 },
    },
  },

  'DGX H100 Node (baseline)': {
    name: 'DGX H100 Node (baseline)',
    baseCostUsd: 72000,
    description: 'AI server SKU — interconnect + vapor cooling.',
    components: {
      Semiconductor: { required: true, minItems: 1, maxItems: 3 },
      Thermal: { required: true, minItems: 1, maxItems: 2 },
      Electrical: { required: true, minItems: 1, maxItems: 2 },
    },
  },
};

/** Which company sees which configurations */
const CONFIGS_FOR_COMPANY = {
  Tesla: ['Tesla Model 3 Highland', 'Tesla Model S Plaid', 'Tesla Model Y Performance', 'Tesla Cybertruck Dual Motor'],
  SpaceX: ['Falcon 9 booster (Block 5)'],
  Nvidia: ['DGX H100 Node (baseline)'],
};

function resolveCompanyKey(companyRecord, userFallback) {
  const raw =
    typeof companyRecord === 'string'
      ? companyRecord
      : companyRecord?.company_name || companyRecord?.email || '';
  const normalized = raw.trim();
  if (['Tesla', 'SpaceX', 'Nvidia'].includes(normalized)) return normalized;
  if (normalized.toLowerCase().includes('tesla')) return 'Tesla';
  if (normalized.toLowerCase().includes('spacex')) return 'SpaceX';
  if (normalized.toLowerCase().includes('nvidia')) return 'Nvidia';
  const u = userFallback?.company;
  if (typeof u === 'string') {
    if (['Tesla', 'SpaceX', 'Nvidia'].includes(u)) return u;
    if (u.toLowerCase().includes('tesla')) return 'Tesla';
    if (u.toLowerCase().includes('spacex')) return 'SpaceX';
    if (u.toLowerCase().includes('nvidia')) return 'Nvidia';
  }
  return 'Tesla';
}

/** Optional preset SKU sets ≈ plausible BOM snapshots per Tesla model — user can tweak */
const PRESETS_TESLA = {
  'Tesla Model 3 Highland': ['TW-EU-E01', 'TW-EU-E02', 'TW-STR-S01', 'TW-STR-S02', 'TW-BAT-B01', 'TW-BAT-B02', 'TW-FAS-M01', 'TW-THR-E04', 'TW-INS-E05'],
  'Tesla Model S Plaid': ['TW-EU-E01', 'TW-EU-E02', 'TW-STR-S01', 'TW-STR-S03', 'TW-BAT-B01', 'TW-BAT-B02', 'TW-THR-E03', 'TW-THR-E04', 'TW-FAS-M01'],
  'Tesla Model Y Performance': ['TW-STR-S01', 'TW-STR-S02', 'TW-SHF-C01', 'TW-BAT-B01', 'TW-EU-E01', 'TW-EU-E02', 'TW-THR-E03', 'TW-FAS-M02', 'TW-INS-E06'],
  'Tesla Cybertruck Dual Motor': ['TW-CT-US01', 'TW-STR-S03', 'TW-BAT-B01', 'TW-CT-US02', 'TW-FAS-M01', 'TW-FAS-M02', 'TW-THR-E03'],
};

const PRESETS_OTHER = {
  'Falcon 9 booster (Block 5)': ['SX-AV-E01', 'SX-AV-E02', 'SX-ST-US1'],
  'DGX H100 Node (baseline)': ['NV-SM-TW01', 'NV-OCL-C01', 'NV-PWB-US1'],
};

function ProductBaselinePage() {
  const { company, user } = useAuth();

  const companyKey = resolveCompanyKey(company, user);
  const supplierPayload = SUPPLIER_DATA[companyKey] || SUPPLIER_DATA.Tesla;
  const allowedProductIds = CONFIGS_FOR_COMPANY[companyKey] || CONFIGS_FOR_COMPANY.Tesla;

  const [selectedProductId, setSelectedProductId] = useState(allowedProductIds[0]);
  const [selectedSkuByCat, setSelectedSkuByCat] = useState({});
  const [simulationResults, setSimulationResults] = useState(null);

  const productConfig = PRODUCT_CONFIGURATIONS[selectedProductId];

  useEffect(() => {
    if (!allowedProductIds.includes(selectedProductId)) {
      setSelectedProductId(allowedProductIds[0]);
      setSimulationResults(null);
    }
  }, [allowedProductIds, companyKey, selectedProductId]);

  const availableItems = useMemo(() => {
    const flat = [];
    supplierPayload.forEach((sup) => {
      sup.items.forEach((item) => {
        flat.push({
          ...item,
          supplierLabel: sup.supplier,
          supplierQuoteId: sup.id,
          countryOfQuote: sup.country,
        });
      });
    });
    return flat;
  }, [supplierPayload]);

  const itemsForProduct = useMemo(() => {
    if (!productConfig) return [];
    const allowedCats = new Set(Object.keys(productConfig.components || {}));
    return availableItems.filter((i) => allowedCats.has(i.category));
  }, [availableItems, productConfig]);

  const itemsByCategory = useMemo(() => {
    const grouped = {};
    itemsForProduct.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [itemsForProduct]);

  const toggleSku = useCallback((category, sku, checked) => {
    setSelectedSkuByCat((prev) => {
      const cur = [...(prev[category] || [])];
      if (checked) {
        if (!cur.includes(sku)) cur.push(sku);
      } else {
        const idx = cur.indexOf(sku);
        if (idx >= 0) cur.splice(idx, 1);
      }
      return { ...prev, [category]: cur };
    });
    setSimulationResults(null);
  }, []);

  const applyPresetQuotes = () => {
    let skus =
      PRESETS_TESLA[selectedProductId] ||
      PRESETS_OTHER[selectedProductId] ||
      [];

    skus = skus.filter((sku) =>
      Object.values(itemsByCategory)
        .flat()
        .some((item) => item.sku === sku)
    );

    const next = {};
    if (!productConfig) return;

    Object.keys(productConfig.components).forEach((cat) => {
      next[cat] = skus.filter((sku) => {
        const item = Object.values(itemsByCategory)
          .flat()
          .find((i) => i.sku === sku && i.category === cat);
        return Boolean(item);
      });
    });

    setSelectedSkuByCat(next);
    setSimulationResults(null);
  };

  const clearSelections = () => {
    setSelectedSkuByCat({});
    setSimulationResults(null);
  };

  const runSimulation = () => {
    if (!productConfig) return;

    const selectedLines = [];
    let partsUsd = 0;

    Object.entries(selectedSkuByCat).forEach(([cat, skus]) => {
      skus.forEach((sku) => {
        const item = availableItems.find((i) => i.sku === sku);
        if (item && item.category === cat) {
          const lineUsd = toUsd(item.unitCost * item.quantity, item.currency);
          selectedLines.push({
            ...item,
            lineUsd,
            rolloutDescription: `${item.supplierLabel} · ${item.supplierQuoteId}`,
          });
          partsUsd += lineUsd;
        }
      });
    });

    const baseUsd = productConfig.baseCostUsd ?? 0;
    const totalUsd = baseUsd + partsUsd;

    const missingRequired = Object.entries(productConfig.components)
      .filter(
        ([cat, cfg]) =>
          cfg.required && (!(selectedSkuByCat[cat] && selectedSkuByCat[cat].length))
      )
      .map(([cat]) => cat);

    const warnings = [];
    Object.entries(productConfig.components).forEach(([cat, cfg]) => {
      const sel = selectedSkuByCat[cat]?.length ?? 0;
      if (sel < cfg.minItems) warnings.push(`${cat}: below minimum (${sel}/${cfg.minItems})`);
      if (sel > cfg.maxItems) warnings.push(`${cat}: above maximum (${sel}/${cfg.maxItems})`);
    });

    let insight = '';
    if (!missingRequired.length && !warnings.length) {
      insight = 'Baseline satisfies category guardrails — compare alternative supplier lines to stress-test margin.';
    } else if (missingRequired.length) {
      insight = `Add selections for required categories (${missingRequired.join(', ')}) before using this BOM as authoritative.`;
    } else {
      insight = `Adjust mixes to stay within quantity bounds for each category ${companyKey}.`;
    }

    setSimulationResults({
      selectedLines,
      totalUsd,
      blendedBaseUsd: baseUsd,
      partsUsd,
      missingRequired,
      warnings,
      insight,
    });
  };

  const displayCompany = company?.company_name || company?.email || user?.company || 'Your company';

  return (
    <main className="page page--wide">
      <header className="page__header">
        <p className="eyebrow">Product baseline simulation</p>
        <h1>Cost baseline builder</h1>
        <p className="lede lede--muted">
          Pick a Tesla vehicle program or another platform template, compose supplier quotes by category,
          then run a BOM-style simulation to approximate a whole-vehicle baseline in USD equivalents.
          Data is illustrative for coursework only.
        </p>
      </header>

      <div className="simulation-grid">
        <section className="panel simulation-panel">
          <h2>Product configuration</h2>
          <p className="muted">
            Signed in as <strong>{displayCompany}</strong> — showing mocked supplier quotes keyed to{' '}
            <strong>{companyKey}</strong>-style programs.
          </p>

          <div className="product-config">
            <label htmlFor="product-select" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Vehicle / platform SKU
            </label>
            <select
              id="product-select"
              className="upload-folder-select"
              style={{ maxWidth: '100%' }}
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedSkuByCat({});
                setSimulationResults(null);
              }}
            >
              {allowedProductIds.map((id) => (
                <option key={id} value={id}>
                  {PRODUCT_CONFIGURATIONS[id]?.name || id}
                </option>
              ))}
            </select>
            {productConfig?.description && (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                {productConfig.description}
              </p>
            )}
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Estimated fixed platform / integration base (excluding selected quotes below):{' '}
              <strong>{formatUsd(productConfig?.baseCostUsd ?? 0)}</strong>.
            </p>
          </div>

          <div className="simulation-actions">
            <button type="button" className="btn btn--primary" onClick={applyPresetQuotes}>
              Load sample BOM for this vehicle
            </button>
            <button type="button" className="btn btn--ghost" onClick={clearSelections}>
              Clear selections
            </button>
          </div>

          <div className="component-stack" style={{ marginTop: '1rem' }}>
            {productConfig &&
              Object.entries(productConfig.components).map(([category, cfg]) => {
                const bucket = itemsByCategory[category] || [];
                return (
                  <div key={category} className="component-category">
                    <h4>
                      {category}
                      {cfg.required && <span className="required">*</span>}
                      <span className="category-limits">
                        Choose {cfg.minItems}–{cfg.maxItems}
                      </span>
                    </h4>
                    {bucket.length === 0 ? (
                      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                        No quote lines mapped for this category in the current supplier pack.
                      </p>
                    ) : (
                      bucket.map((item) => {
                        const checked = Boolean(selectedSkuByCat[category]?.includes(item.sku));
                        const lineUsd = formatUsd(toUsd(item.unitCost * item.quantity, item.currency));
                        return (
                          <label key={item.sku} className="component-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleSku(category, item.sku, e.target.checked)}
                            />
                            <div className="item-details">
                              <strong>{item.name}</strong>
                              <div className="item-meta">
                                <span>{item.supplierLabel}</span>
                                {' · '}
                                <span>
                                  Quote {item.supplierQuoteId}
                                </span>
                                {' · '}
                                <span>
                                  {item.currency} {(item.quantity * item.unitCost).toLocaleString()} (
                                  ~{lineUsd})
                                </span>
                              </div>
                              <div className="item-meta">SKU {item.sku}</div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                );
              })}
          </div>

          <div className="simulation-actions">
            <button type="button" className="btn btn--primary" onClick={runSimulation}>
              Run baseline simulation
            </button>
          </div>
        </section>

        <section className="panel simulation-panel">
          <h2>Simulation results</h2>

          {!simulationResults ? (
            <div className="no-results">
              Choose supplier lines — or tap <strong>Load sample BOM</strong> — then{' '}
              <strong>Run baseline simulation</strong> for a modeled whole-unit cost rollup.
            </div>
          ) : (
            <div className="simulation-results">
              {(simulationResults.missingRequired.length > 0 || simulationResults.warnings.length > 0) && (
                <div className="alert alert--warning">
                  <h4>Compliance notes</h4>
                  {simulationResults.missingRequired.length > 0 && (
                    <p>
                      Missing required categories:{' '}
                      <strong>{simulationResults.missingRequired.join(', ')}</strong>
                    </p>
                  )}
                  {simulationResults.warnings.length > 0 && (
                    <ul>
                      {simulationResults.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="results-summary">
                <div className="summary-metric">
                  <h3>Blended BOM (quotes)</h3>
                  <strong>{formatUsd(simulationResults.partsUsd ?? 0)}</strong>
                </div>
                <div className="summary-metric">
                  <h3>Integration / platform base</h3>
                  <strong>{formatUsd(simulationResults.blendedBaseUsd ?? 0)}</strong>
                </div>
                <div className="summary-metric">
                  <h3>Rolled-up baseline (approx.)</h3>
                  <strong>{formatUsd(simulationResults.totalUsd)}</strong>
                </div>
              </div>

              <div className="selected-components">
                <h4>Quoted line items rolled in</h4>
                <div className="components-list">
                  {simulationResults.selectedLines.length === 0 ? (
                    <p className="muted">No quoted lines matched your selection.</p>
                  ) : (
                    simulationResults.selectedLines.map((item) => (
                      <article key={`${item.sku}-${item.supplierQuoteId}`} className="component-summary">
                        <div className="component-header">
                          <strong>{item.name}</strong>
                          <span className="component-cost">{formatUsd(item.lineUsd)} USD eq.</span>
                        </div>
                        <div className="component-meta">
                          Supplier: {item.supplierLabel} · {item.countryOfQuote}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="simulation-insights">
                <h4>Interpretation</h4>
                <p>{simulationResults.insight}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductBaselinePage;
