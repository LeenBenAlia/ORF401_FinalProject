/**
 * Lightweight heuristics to align baseline BOM mixes with Tariff-route scoring (same deltas as Tariff page)
 * and summarize FX-share by currency — coursework / illustrative only.
 */

/** @param {string[]} countries */
export function inferTransportRoute(countries) {
  const list = (countries || []).map((c) => String(c || '').toLowerCase());
  if (!list.length) return 'sea';
  const asia = (s) =>
    ['china', 'taiwan', 'japan', 'korea', 'hong kong', 'singapore', 'vietnam'].some((k) => s.includes(k));
  const eu = (s) =>
    ['germany', 'france', 'sweden', 'norway', 'netherlands', 'italy', 'spain', 'poland'].some((k) => s.includes(k));
  const americas = (s) =>
    ['united states', 'usa', 'mexico', 'canada'].some((k) => s.includes(k));
  if (list.some(asia)) return 'sea';
  if (list.some(eu)) return 'land';
  if (list.length && list.every(americas)) return 'land';
  return 'sea';
}

/** Mirrors TariffPage score: 100 - (air 28 | land 16 | sea 35). */
export function tariffRiskScoreForRoute(route) {
  const r = route === 'air' ? 28 : route === 'land' ? 16 : 35;
  return 100 - r;
}

/**
 * @param {{ lineUsd: number, currency?: string, countryOfQuote?: string }[]} selectedLines
 */
export function buildTradeContextFromLines(selectedLines) {
  if (!selectedLines?.length) {
    return {
      route: 'sea',
      tariffScore: tariffRiskScoreForRoute('sea'),
      countries: [],
      countriesParam: '',
      fxInsight: '—',
      currencyCodesForUrl: '',
    };
  }

  const countries = [...new Set(selectedLines.map((l) => l.countryOfQuote).filter(Boolean))];
  const route = inferTransportRoute(countries);
  const tariffScore = tariffRiskScoreForRoute(route);

  const byCur = {};
  let total = 0;
  selectedLines.forEach((l) => {
    const c = (l.currency || 'USD').toUpperCase();
    byCur[c] = (byCur[c] || 0) + (l.lineUsd || 0);
    total += l.lineUsd || 0;
  });
  const sorted = Object.entries(byCur).sort((a, b) => b[1] - a[1]);
  const fxInsight = sorted.length
    ? sorted
        .map(([c, v]) => `${c} ${total ? Math.round((v / total) * 100) : 0}%`)
        .join(' · ')
    : '—';

  const currencyCodesForUrl = sorted.map(([c]) => c).join(',');

  return {
    route,
    tariffScore,
    countries,
    countriesParam: countries.join('|'),
    fxInsight,
    currencyCodesForUrl,
  };
}

/** URL-safe-ish base64(JSON) — short breakdowns only; skip if oversized. */
const BD_MAX_LEN = 10000;

function encodeLineBreakdown(selectedLines) {
  if (!selectedLines?.length) return '';
  try {
    const slim = selectedLines.slice(0, 200).map((l) => ({
      supplier: String(l.supplierLabel || '').slice(0, 120),
      country: String(l.countryOfQuote || '').slice(0, 80),
      sku: String(l.sku || '').slice(0, 64),
      name: String(l.name || '').slice(0, 120),
      usd: Math.round(Number(l.lineUsd) || 0),
    }));
    const json = JSON.stringify(slim);
    const b64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : '';
    if (!b64 || b64.length > BD_MAX_LEN) return '';
    return b64;
  } catch {
    return '';
  }
}

export function decodeTariffBreakdownBd(raw) {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const bin = decodeURIComponent(escape(atob(raw)));
    const arr = JSON.parse(bin);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Product baseline page syncs options here for the Tariff picker. */
export const BASELINE_TARIFF_SESSION_KEY = 'blaise_tariff_baseline_options';

/**
 * @param {{supplierLabel?: string,countryOfQuote?: string,lineUsd?: number,sku?:string,name?:string}[]} selectedLines
 * @returns {{supplier:string,country:string,sku:string,name:string,usd:number}[]}
 */
export function breakdownRowsFromSelectedLines(selectedLines) {
  if (!selectedLines?.length) return [];
  return selectedLines.map((l) => ({
    supplier: String(l.supplierLabel || '—').slice(0, 120),
    country: String(l.countryOfQuote || '').slice(0, 80),
    sku: String(l.sku || '').slice(0, 64),
    name: String(l.name || '').slice(0, 120),
    usd: Math.max(0, Math.round(Number(l.lineUsd) || 0)),
  }));
}

/**
 * @param {object} record Quote library record with extracted + filename
 */
export function breakdownRowsFromUploadedQuoteRecord(record) {
  const ex = record?.extracted || {};
  const price = Number(ex.price);
  const lineUsd = Number.isFinite(price) ? price : 0;
  return [
    {
      supplier: typeof ex.supplier === 'string' ? ex.supplier : '—',
      country: typeof ex.country === 'string' ? ex.country : '',
      sku: record?.id != null ? `#${record.id}` : '',
      name: record?.filename || '',
      usd: Math.round(lineUsd),
    },
  ];
}

/** @param {string} laneId */
export function routeLaneShortLabel(laneId) {
  const m = { sea: 'Ocean freight', air: 'Air cargo', land: 'Rail / truck' };
  return m[laneId] || laneId || '—';
}

/**
 * @param {{supplierLabel?: string,countryOfQuote?: string,lineUsd?: number,sku?:string,name?:string}[]} selectedLines
 * @param {string} scenarioLabel
 * @param {'baseline'|'quotes'} source
 */
export function buildTariffLink(selectedLines, scenarioLabel, source = 'baseline') {
  const ctx = buildTradeContextFromLines(selectedLines);
  const p = new URLSearchParams();
  p.set('route', ctx.route);
  p.set('score', String(ctx.tariffScore));
  if (ctx.countriesParam) p.set('countries', ctx.countriesParam);
  if (scenarioLabel) p.set('scenario', scenarioLabel.slice(0, 160));
  p.set('from', source);
  const bd = encodeLineBreakdown(selectedLines);
  if (bd) p.set('bd', bd);
  return `/tariff?${p.toString()}`;
}

/**
 * One uploaded digitized quote: infer lane from extracted country/supplier line.
 */
export function buildTariffLinkFromUploadedQuote(record, fallbackFilename = '') {
  const ex = record?.extracted || {};
  const country = typeof ex.country === 'string' && ex.country.trim() ? ex.country.trim() : '';
  let lineUsd = 0;
  const priceRaw = ex.price;
  try {
    lineUsd = Number(priceRaw);
  } catch {
    lineUsd = 0;
  }
  if (!Number.isFinite(lineUsd)) lineUsd = 0;

  const line = [
    {
      supplierLabel: typeof ex.supplier === 'string' ? ex.supplier : 'Supplier',
      countryOfQuote: country || 'Unknown',
      lineUsd,
      sku: `#${record?.id}`,
      name: record?.filename || fallbackFilename || 'Uploaded quote',
    },
  ];

  const label =
    typeof record?.id !== 'undefined'
      ? `Quote #${record.id} · ${record?.filename || 'upload'}`
      : `Quote · ${record?.filename || 'upload'}`;

  return buildTariffLink(line, label, 'quotes');
}

export function buildFxLinkFromContext(ctx, scenarioLabel) {
  const p = new URLSearchParams();
  if (ctx.currencyCodesForUrl) p.set('focus', ctx.currencyCodesForUrl);
  p.set('insight', `BOM mix: ${ctx.fxInsight}`.slice(0, 220));
  if (scenarioLabel) p.set('scenario', scenarioLabel.slice(0, 120));
  p.set('from', 'baseline');
  return `/fx?${p.toString()}`;
}
