export const GLOBAL_KPIS = [
  { label: 'High-priority alerts', value: '17', delta: '+3 in 24h' },
  { label: 'Tracked countries', value: '54', delta: '12 elevated risk' },
  { label: 'Critical trade lanes', value: '8', delta: '2 rerouting warnings' },
  { label: 'Macro regime score', value: '62/100', delta: 'Risk-on to neutral' },
];

export const COUNTRY_INTEL = [
  { country: 'Taiwan', region: 'APAC', score: 78, tariffRisk: 'High', fx: 'TWD', lane: 'Sea + Air' },
  { country: 'Germany', region: 'EU', score: 46, tariffRisk: 'Moderate', fx: 'EUR', lane: 'Sea + Rail' },
  { country: 'Mexico', region: 'NA', score: 41, tariffRisk: 'Low', fx: 'MXN', lane: 'Land' },
  { country: 'South Korea', region: 'APAC', score: 69, tariffRisk: 'Elevated', fx: 'KRW', lane: 'Sea + Air' },
  { country: 'Poland', region: 'EU', score: 57, tariffRisk: 'Moderate', fx: 'PLN', lane: 'Rail + Truck' },
];

export const ESCALATION_FEED = [
  {
    id: 'esc-1',
    level: 'Critical',
    title: 'Red Sea vessel diversion trend accelerates',
    summary: 'Three carriers announced route detours, adding 8-11 days to EU-US East Coast shipments.',
    tags: ['Shipping', 'Insurance', 'Tariff'],
    region: 'MENA',
  },
  {
    id: 'esc-2',
    level: 'Elevated',
    title: 'USD strength pressures APAC supplier margins',
    summary: 'Procurement teams with KRW and TWD payables saw modeled FX budget drift above 2.4%.',
    tags: ['FX', 'Hedging'],
    region: 'APAC',
  },
  {
    id: 'esc-3',
    level: 'Moderate',
    title: 'EU customs digitization update reduces queue times',
    summary: 'Early pilot corridors report faster pre-clearance windows for compliant filings.',
    tags: ['Customs', 'Compliance'],
    region: 'EU',
  },
];

export const SIGNAL_LAYERS = [
  'Geopolitical incidents',
  'Tariff policy updates',
  'Currency stress',
  'Port congestion',
  'Supplier sentiment',
  'Energy volatility',
];
