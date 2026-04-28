import React, { useState, useMemo, useCallback, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  buildTradeContextFromLines,
  buildTariffLink,
  buildFxLinkFromContext,
} from '../utils/baselineTradeSignals';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

/** Rough FX vs USD for rolled-up BOM display */
const FX_TO_USD = { USD: 1, EUR: 1.085, GBP: 1.263, MXN: 0.058, CNY: 0.138, JPY: 0.0065, KRW: 0.00075, TWD: 0.031 };

function toUsd(amount, currency) {
  const c = currency || 'USD';
  const rate = FX_TO_USD[c] ?? 1;
  return amount * rate;
}

function lineUsd(item) {
  return toUsd(item.unitCost * item.quantity, item.currency);
}

function formatUsd(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n));
}

function routeLabel(route) {
  if (route === 'sea') return 'Ocean freight';
  if (route === 'air') return 'Air cargo';
  if (route === 'land') return 'Rail / truck';
  return route ? String(route) : '—';
}

const CHART_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];
const CATEGORY_FILL = {
  Structural: '#3b82f6',
  Battery: '#22c55e',
  Electrical: '#eab308',
  Thermal: '#f97316',
  Fasteners: '#a855f7',
  Insulation: '#78716c',
  Avionics: '#0ea5e9',
  Semiconductor: '#14b8a6',
};
const FALLBACK_PALETTE = ['#818cf8', '#34d399', '#fcd34d', '#fb923c', '#c084fc', '#fb7185', '#93c5fd'];

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

function mapSkusToCategories(skuList, itemsByCategory) {
  const inv = new Map();
  Object.entries(itemsByCategory).forEach(([cat, items]) => {
    items.forEach((it) => inv.set(it.sku, cat));
  });
  const out = {};
  skuList.forEach((sku) => {
    const cat = inv.get(sku);
    if (!cat) return;
    if (!out[cat]) out[cat] = [];
    if (!out[cat].includes(sku)) out[cat].push(sku);
  });
  return out;
}

function computeBomSnapshot(selectedSkuByCat, productConfig, availableItems) {
  const selectedLines = [];
  let partsUsd = 0;
  const byCategoryUsd = {};
  Object.keys(productConfig.components).forEach((c) => {
    byCategoryUsd[c] = 0;
  });

  Object.entries(selectedSkuByCat).forEach(([cat, skus]) => {
    skus.forEach((sku) => {
      const item = availableItems.find((i) => i.sku === sku);
      if (item && item.category === cat) {
        const lu = lineUsd(item);
        selectedLines.push({ ...item, lineUsd: lu });
        partsUsd += lu;
        byCategoryUsd[cat] = (byCategoryUsd[cat] || 0) + lu;
      }
    });
  });

  const baseUsd = productConfig.baseCostUsd ?? 0;
  const totalUsd = baseUsd + partsUsd;

  const missingRequired = Object.entries(productConfig.components)
    .filter(([cat, cfg]) => cfg.required && !(selectedSkuByCat[cat] && selectedSkuByCat[cat].length))
    .map(([cat]) => cat);

  const warnings = [];
  Object.entries(productConfig.components).forEach(([cat, cfg]) => {
    const sel = selectedSkuByCat[cat]?.length ?? 0;
    if (sel < cfg.minItems) warnings.push(`${cat}: below minimum (${sel}/${cfg.minItems})`);
    if (sel > cfg.maxItems) warnings.push(`${cat}: above maximum (${sel}/${cfg.maxItems})`);
  });

  return {
    selectedLines,
    partsUsd,
    totalUsd,
    blendedBaseUsd: baseUsd,
    byCategoryUsd,
    missingRequired,
    warnings,
  };
}

function buildGreedySelection(itemsByCategory, productConfig, mode) {
  const out = {};
  Object.entries(productConfig.components).forEach(([cat, cfg]) => {
    const raw = (itemsByCategory[cat] || []).map((it) => ({ ...it, _line: lineUsd(it) }));
    if (!raw.length) {
      out[cat] = [];
      return;
    }
    const items = [...raw].sort((a, b) => (mode === 'high' ? b._line - a._line : a._line - b._line));

    if (mode === 'low') {
      const need = Math.max(cfg.minItems, 0);
      if (need === 0 && !cfg.required) {
        out[cat] = [];
        return;
      }
      const take = Math.min(Math.max(need, cfg.required ? 1 : 0), items.length, cfg.maxItems);
      out[cat] = items.slice(0, take).map((i) => i.sku);
      return;
    }

    const takeHigh = Math.min(cfg.maxItems, items.length);
    out[cat] = items.slice(0, takeHigh).map((i) => i.sku);
  });
  return out;
}

function ProductBaselinePage() {
  const { company, user } = useAuth();
  const formId = useId();

  const companyKey = resolveCompanyKey(company, user);
  const supplierPayload = SUPPLIER_DATA[companyKey] || SUPPLIER_DATA.Tesla;
  const allowedProductIds = CONFIGS_FOR_COMPANY[companyKey] || CONFIGS_FOR_COMPANY.Tesla;

  const [selectedProductId, setSelectedProductId] = useState(allowedProductIds[0]);
  const [selectedSkuByCat, setSelectedSkuByCat] = useState({});
  const [simulationResults, setSimulationResults] = useState(null);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [newComparisonLabel, setNewComparisonLabel] = useState('');
  const [visibleScenarioIds, setVisibleScenarioIds] = useState(() => new Set(['preset', 'min', 'max', 'manual']));

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

  /** Auto scenarios + manual run for charts */
  const scenarioMatrix = useMemo(() => {
    if (!productConfig) return [];

    const presetSkus =
      PRESETS_TESLA[selectedProductId] || PRESETS_OTHER[selectedProductId] || [];
    const filteredPreset = presetSkus.filter((sku) => availableItems.some((i) => i.sku === sku));
    const presetMap = mapSkusToCategories(filteredPreset, itemsByCategory);

    const lowMap = buildGreedySelection(itemsByCategory, productConfig, 'low');
    const highMap = buildGreedySelection(itemsByCategory, productConfig, 'high');

    const presetSnap = computeBomSnapshot(presetMap, productConfig, availableItems);
    const lowSnap = computeBomSnapshot(lowMap, productConfig, availableItems);
    const highSnap = computeBomSnapshot(highMap, productConfig, availableItems);
    const manualSnap = computeBomSnapshot(selectedSkuByCat, productConfig, availableItems);

    return [
      { id: 'preset', label: 'Sample preset BOM', color: CHART_COLORS[0], skuByCat: presetMap, ...presetSnap },
      { id: 'min', label: 'Greedy lowest-cost mix', color: CHART_COLORS[1], skuByCat: lowMap, ...lowSnap },
      { id: 'max', label: 'Greedy highest-cost mix', color: CHART_COLORS[2], skuByCat: highMap, ...highSnap },
      { id: 'manual', label: 'Your current checklist (live)', color: CHART_COLORS[3], skuByCat: selectedSkuByCat, ...manualSnap },
    ];
  }, [selectedProductId, productConfig, availableItems, itemsByCategory, selectedSkuByCat]);

  const savedEnriched = useMemo(
    () =>
      savedComparisons.map((s, idx) => ({
        ...s,
        id: `saved-${s.slotId}`,
        color: CHART_COLORS[(idx + 4) % CHART_COLORS.length],
      })),
    [savedComparisons]
  );

  const comparisonRowsAll = useMemo(() => [...scenarioMatrix, ...savedEnriched], [scenarioMatrix, savedEnriched]);

  const tradeCtxByRowId = useMemo(() => {
    const map = {};
    comparisonRowsAll.forEach((row) => {
      map[row.id] = buildTradeContextFromLines(row.selectedLines || []);
    });
    return map;
  }, [comparisonRowsAll]);

  const toggleScenarioVisible = (id) => {
    setVisibleScenarioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categoryKeys = useMemo(
    () => (productConfig ? Object.keys(productConfig.components) : []),
    [productConfig]
  );

  const stackedChartData = useMemo(() => {
    return comparisonRowsAll
      .filter((row) => visibleScenarioIds.has(row.id))
      .map((row) => {
        const rec = {
          label: row.label,
          id: row.id,
          Total: Math.round(row.totalUsd),
          platform: Math.round(row.blendedBaseUsd),
        };
        categoryKeys.forEach((k) => {
          rec[k] = Math.round(row.byCategoryUsd[k] || 0);
        });
        return rec;
      });
  }, [comparisonRowsAll, visibleScenarioIds, categoryKeys]);

  const horizontalTotals = useMemo(
    () =>
      stackedChartData.map((row) => ({
        name: row.label.length > 28 ? `${row.label.slice(0, 26)}…` : row.label,
        fullLabel: row.label,
        total: row.Total,
        id: row.id,
        color: comparisonRowsAll.find((r) => r.id === row.id)?.color || '#64748b',
      })),
    [stackedChartData, comparisonRowsAll]
  );

  const pieSlices = useMemo(() => {
    const src =
      simulationResults?.byCategoryUsd ||
      scenarioMatrix.find((s) => s.id === 'manual')?.byCategoryUsd;
    if (!src || !categoryKeys.length) return [];
    return categoryKeys
      .map((k) => ({
        name: k,
        value: Math.max(0, Math.round(src[k] || 0)),
      }))
      .filter((s) => s.value > 0);
  }, [simulationResults, scenarioMatrix, categoryKeys]);

  const minTotalAcrossVisible = useMemo(() => {
    if (!stackedChartData.length) return 0;
    return Math.min(...stackedChartData.map((d) => d.Total));
  }, [stackedChartData]);

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
    let skus = PRESETS_TESLA[selectedProductId] || PRESETS_OTHER[selectedProductId] || [];
    skus = skus.filter((sku) => Object.values(itemsByCategory).flat().some((item) => item.sku === sku));
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
    const snap = computeBomSnapshot(selectedSkuByCat, productConfig, availableItems);

    let insight = '';
    if (!snap.missingRequired.length && !snap.warnings.length) {
      insight =
        'Baseline satisfies category guardrails — use the charts to compare greedy min/max mixes against your curated BOM.';
    } else if (snap.missingRequired.length) {
      insight = `Add selections for required categories (${snap.missingRequired.join(', ')}) before treating this BOM as complete.`;
    } else {
      insight = `Adjust mixes to stay within quantity bounds — compare rows in “Scenario comparator”.`;
    }

    setSimulationResults({
      ...snap,
      insight,
    });
  };

  const addCurrentComparison = () => {
    const label =
      newComparisonLabel.trim() ||
      `Saved mix ${savedComparisons.length + 1}`;
    const snap = computeBomSnapshot(selectedSkuByCat, productConfig, availableItems);
    const slotId = `${Date.now()}`;
    setSavedComparisons((prev) => [
      ...prev,
      {
        slotId,
        label,
        skuByCat: JSON.parse(JSON.stringify(selectedSkuByCat)),
        ...snap,
      },
    ]);
    setNewComparisonLabel('');
    setVisibleScenarioIds((prev) => new Set([...prev, `saved-${slotId}`]));
  };

  const displayCompany = company?.company_name || company?.email || user?.company || 'Your company';

  return (
    <main className="page page--wide baseline-page">
      <header className="page__header">
        <p className="eyebrow">Product baseline simulation</p>
        <h1>Cost baseline builder</h1>
        <p className="lede lede--muted">
          Pick a platform, compare simulated BOM snapshots (preset vs greedy mixes vs your picks), then run a rollup.
          Figures are illustrative for coursework only.
        </p>
      </header>

      <div className="simulation-grid">
        <section className="panel simulation-panel baseline-panel-accent">
          <h2>Product configuration</h2>
          <p className="muted">
            Signed in as <strong>{displayCompany}</strong> — showing mocked supplier quotes for{' '}
            <strong>{companyKey}</strong>-style programs.
          </p>

          <div className="product-config">
            <label htmlFor={`${formId}-product`} style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Vehicle / platform SKU
            </label>
            <select
              id={`${formId}-product`}
              className="upload-folder-select"
              style={{ maxWidth: '100%' }}
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedSkuByCat({});
                setSimulationResults(null);
                setSavedComparisons([]);
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
              Estimated platform / integration base:{' '}
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
                        const line = formatUsd(lineUsd(item));
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
                                {' · '}Quote {item.supplierQuoteId}
                                {' · '}
                                {item.currency}{' '}
                                {(item.quantity * item.unitCost).toLocaleString()} (~{line})
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

          <div className="baseline-add-compare glass-card">
            <p className="muted" style={{ margin: '0 0 0.5rem' }}>
              Snapshot your checklist as an extra lane in the comparator & charts below.
            </p>
            <div className="upload-row baseline-add-row">
              <input
                type="text"
                aria-label="Snapshot label"
                placeholder="Label e.g. “Supplier A mix”"
                value={newComparisonLabel}
                onChange={(e) => setNewComparisonLabel(e.target.value)}
                className="baseline-label-input"
              />
              <button type="button" className="btn btn--ghost" onClick={addCurrentComparison}>
                Save current mix to comparator
              </button>
            </div>
          </div>
        </section>

        <section className="panel simulation-panel baseline-results-glow">
          <h2>Simulation results</h2>

          {!simulationResults ? (
            <div className="no-results">
              Tick supplier lines above (or load sample BOM), then <strong>Run baseline simulation</strong> —
              donut updates from your checklist; totals also stay live under “Your current checklist”.
            </div>
          ) : (
            <div className="simulation-results">
              {(simulationResults.missingRequired?.length > 0 || simulationResults.warnings?.length > 0) && (
                <div className="alert alert--warning">
                  <h4>Compliance notes</h4>
                  {simulationResults.missingRequired?.length > 0 && (
                    <p>
                      Missing required categories: <strong>{simulationResults.missingRequired.join(', ')}</strong>
                    </p>
                  )}
                  {simulationResults.warnings?.length > 0 && (
                    <ul>
                      {simulationResults.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="results-summary baseline-metric-cards">
                <div className="summary-metric summary-metric--violet">
                  <h3>Blended BOM (quotes)</h3>
                  <strong>{formatUsd(simulationResults.partsUsd ?? 0)}</strong>
                </div>
                <div className="summary-metric summary-metric--teal">
                  <h3>Platform / integration</h3>
                  <strong>{formatUsd(simulationResults.blendedBaseUsd ?? 0)}</strong>
                </div>
                <div className="summary-metric summary-metric--amber">
                  <h3>Rolled-up baseline</h3>
                  <strong>{formatUsd(simulationResults.totalUsd)}</strong>
                </div>
              </div>

              <div className="baseline-donut-wrap">
                <h4 style={{ margin: '0 0 0.5rem' }}>Quoted spend by category (last run)</h4>
                {pieSlices.length === 0 ? (
                  <p className="muted">No BOM lines yet — selections are empty.</p>
                ) : (
                  <div className="baseline-donut-inner">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={pieSlices}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={52}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {pieSlices.map((_, i) => (
                            <Cell key={pieSlices[i].name} fill={CATEGORY_FILL[pieSlices[i].name] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]} stroke="#0f172a22" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatUsd(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="selected-components">
                <h4>Quoted line items</h4>
                <div className="components-list">
                  {simulationResults.selectedLines.length === 0 ? (
                    <p className="muted">No quoted lines matched your selection.</p>
                  ) : (
                    simulationResults.selectedLines.map((item) => {
                      const lctx = buildTradeContextFromLines([item]);
                      const lineLabel = `${item.supplierLabel} · ${item.sku}`;
                      return (
                      <article key={`${item.sku}-${item.supplierQuoteId}`} className="component-summary">
                        <div className="component-header">
                          <strong>{item.name}</strong>
                          <span className="component-cost">{formatUsd(item.lineUsd)} USD eq.</span>
                        </div>
                        <div className="component-meta">
                          Supplier: {item.supplierLabel} · {item.countryOfQuote}
                        </div>
                        <div className="baseline-line-trade">
                          <span className="baseline-line-trade-hint">{routeLabel(lctx.route)} · {lctx.tariffScore}/100</span>
                          {' · '}
                          <span className="baseline-fx-snippet">{lctx.fxInsight}</span>
                        </div>
                        <div className="baseline-line-trade-links">
                          <Link className="baseline-trade-link" to={buildTariffLink([item], lineLabel)}>
                            Tariff
                          </Link>
                          <Link className="baseline-trade-link" to={buildFxLinkFromContext(lctx, lineLabel)}>
                            FX
                          </Link>
                        </div>
                      </article>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="simulation-insights baseline-insight">
                <h4>Interpretation</h4>
                <p>{simulationResults.insight}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel baseline-comparator-deck baseline-viz-banner">
        <div className="baseline-comparator-head">
          <h2 style={{ margin: 0 }}>Scenario comparator & charts</h2>
          <p className="muted baseline-comparator-sub">
            Toggle which mixes appear in bars. Greedy presets explore price bounds; yellow row shows deltas vs cheapest visible mix.
            Each scenario row estimates a transport lane (for tariff scoring) and quote-currency weights —{' '}
            <Link to="/tariff">Tariff map</Link> and <Link to="/fx">FX desk</Link> links open prefilled detail for that mix.
          </p>
        </div>

        <div className="baseline-scenario-scroll">
          <table className="baseline-scenario-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Scenario</th>
                <th>Quoted BOM</th>
                <th>Platform</th>
                <th>Total (USD eq.)</th>
                <th>Tariff lane · score</th>
                <th>FX mix (quotes)</th>
                <th>Δ vs cheapest shown</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRowsAll.map((row) => {
                const tctx = tradeCtxByRowId[row.id];
                const tariffHref = buildTariffLink(row.selectedLines || [], row.label);
                const fxHref = buildFxLinkFromContext(tctx, row.label);
                return (
                <tr key={row.id} style={{ opacity: visibleScenarioIds.has(row.id) ? 1 : 0.45 }}>
                  <td>
                    <label className="baseline-table-check">
                      <input
                        type="checkbox"
                        checked={visibleScenarioIds.has(row.id)}
                        onChange={() => toggleScenarioVisible(row.id)}
                      />
                    </label>
                  </td>
                  <td>
                    <span className="baseline-scenario-dot" style={{ background: row.color }} aria-hidden />
                    {row.label}
                  </td>
                  <td>{formatUsd(row.partsUsd)}</td>
                  <td>{formatUsd(row.blendedBaseUsd)}</td>
                  <td>
                    <strong>{formatUsd(row.totalUsd)}</strong>
                  </td>
                  <td className="baseline-trade-cell">
                    <div className="baseline-trade-line">
                      <span>{routeLabel(tctx.route)}</span>
                      <span className="baseline-trade-score">{tctx.tariffScore}/100</span>
                    </div>
                    <Link className="baseline-trade-link" to={tariffHref}>
                      Tariff routes
                    </Link>
                  </td>
                  <td className="baseline-trade-cell baseline-fx-mini">
                    <div className="baseline-fx-snippet">{tctx.fxInsight}</div>
                    <Link className="baseline-trade-link" to={fxHref}>
                      FX insights
                    </Link>
                  </td>
                  <td className="baseline-delta-cell">
                    {visibleScenarioIds.has(row.id)
                      ? `+${formatUsd(row.totalUsd - minTotalAcrossVisible)} vs min visible`
                      : '—'}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="baseline-chart-grid">
          <div className="glass-card baseline-chart-panel">
            <h3>Side-by-side total baseline</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={horizontalTotals} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e140" />
                  <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} stroke="#64748b" />
                  <YAxis type="category" dataKey="name" width={120} stroke="#64748b" tick={{ fill: '#334155', fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [formatUsd(v), 'Baseline']}
                    contentStyle={{
                      borderRadius: 10,
                      border: 'none',
                      background: '#0f172a',
                      color: '#f8fafc',
                      boxShadow: '0 8px 28px rgba(15,23,42,0.35)',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} name="USD eq." maxBarSize={28}>
                    {horizontalTotals.map((e) => (
                      <Cell key={e.id} fill={e.color} stroke="#fff8" strokeWidth={1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card baseline-chart-panel">
            <h3>Stacked: platform vs category spend</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stackedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e140" />
                  <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 10 }} interval={0} angle={-12} height={70} dy={16} dx={4} />
                  <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} stroke="#64748b" />
                  <Tooltip
                    formatter={(v, n) => [formatUsd(v), n]}
                    contentStyle={{
                      borderRadius: 10,
                      background: '#0f172aed',
                      color: '#f1f5f9',
                      border: '1px solid #33415588',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="platform" stackId="a" name="Platform" fill="#64748b" radius={[6, 6, 0, 0]} />
                  {categoryKeys.map((k, idx) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="a"
                      name={k}
                      fill={CATEGORY_FILL[k] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductBaselinePage;
