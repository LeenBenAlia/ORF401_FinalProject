/**
 * Heuristic extraction from meeting notes / transcripts (mirrors backend extract_verbal_transcript).
 * Used on GitHub Pages demo where there is no Whisper API.
 */

const VERBAL_COUNTRY_NAMES = [
  'Germany',
  'France',
  'Japan',
  'China',
  'Mexico',
  'United States',
  'USA',
  'Taiwan',
  'South Korea',
  'Canada',
  'United Kingdom',
  'UK',
  'Poland',
  'India',
  'Vietnam',
];

const BASELINE_FIELDS = [
  'product_name',
  'supplier_company',
  'product_section_usage',
  'usage_frequency',
  'access_id',
  'subpart_or_compartment',
  'price',
  'cost_per_unit',
  'total_cost_per_business_unit',
  'dimensions',
  'thickness',
  'size',
  'weight',
  'country_of_origin',
  'geography',
  'raw_materials',
  'chemical_composition',
  'melting_point',
  'currency',
];

function generateLizRecommendations(productName, productDescription) {
  const text = `${productName || ''} ${productDescription || ''}`.toLowerCase();
  const recommendations = new Set(BASELINE_FIELDS);
  if (['battery', 'electrical', 'electronics'].some((k) => text.includes(k))) {
    ['voltage', 'current_rating', 'thermal_tolerance', 'certification'].forEach((f) => recommendations.add(f));
  }
  if (['metal', 'steel', 'aluminum', 'alloy'].some((k) => text.includes(k))) {
    ['grade', 'hardness', 'yield_strength', 'surface_finish'].forEach((f) => recommendations.add(f));
  }
  if (['plastic', 'polymer', 'resin'].some((k) => text.includes(k))) {
    ['resin_type', 'flammability_rating', 'density'].forEach((f) => recommendations.add(f));
  }
  if (['aerospace', 'automotive', 'medical'].some((k) => text.includes(k))) {
    ['compliance_standard', 'traceability_level', 'lot_number'].forEach((f) => recommendations.add(f));
  }
  return Array.from(recommendations).sort();
}

function extractFromStructuredText(t) {
  const get = (pattern, defaultVal = 'Unknown') => {
    const m = t.match(pattern);
    return m ? m[1].trim() : defaultVal;
  };
  const rawPrice = get(/Price:\s*[$]?([0-9]+(?:\.[0-9]+)?)/i, '0');
  let price = parseFloat(rawPrice);
  if (Number.isNaN(price)) price = 0;
  return {
    supplier: get(/Supplier:\s*([^\n]+)/i),
    product: get(/Product:\s*([^\n]+)/i),
    price,
    currency: get(/Currency:\s*([A-Z]{3})/i, 'USD'),
    country: get(/Country:\s*([^\n]+)/i),
    material: get(/Material:\s*([^\n]+)/i),
    tariff_rate: null,
    exchange_rate: null,
  };
}

/** @param {string} text */
export function extractVerbalTranscript(text) {
  const t = String(text || '').trim();
  if (!t) {
    return {
      supplier: 'Unknown',
      product: 'Unknown',
      price: 0,
      currency: 'USD',
      country: 'Unknown',
      material: 'Unknown',
      tariff_rate: null,
      exchange_rate: null,
    };
  }
  if (/Supplier:\s*/i.test(t) && /Price:\s*/i.test(t)) {
    return extractFromStructuredText(t);
  }

  let price = 0;
  const pricePatterns = [
    /(?:price|quote|cost|total|unit\s*price)\s*(?:is|of|about|around|at)?\s*[$€£]?\s*([0-9][0-9,]*\.?[0-9]*)/i,
    /(?:$|€|£)\s*([0-9][0-9,]*\.?[0-9]*)/i,
    /\b([0-9][0-9,]*\.?[0-9]*)\s*(?:dollars?|usd|euros?|eur|pounds?|gbp|yuan|cny)\b/i,
  ];
  for (const pat of pricePatterns) {
    const m = t.match(pat);
    if (m) {
      const n = parseFloat(String(m[1]).replace(/,/g, ''));
      if (!Number.isNaN(n) && n > 0) {
        price = n;
        break;
      }
    }
  }

  let currency = 'USD';
  const code = t.match(/\b(USD|EUR|GBP|CNY|JPY|MXN|KRW|TWD|PLN|INR|VND)\b/i);
  if (code) currency = code[1].toUpperCase();
  else if (/\beuros?\b/i.test(t)) currency = 'EUR';
  else if (/\bdollars?\b|\busd\b/i.test(t)) currency = 'USD';
  else if (/\bpounds?\b|\bgbp\b/i.test(t)) currency = 'GBP';

  let country = 'Unknown';
  for (const c of VERBAL_COUNTRY_NAMES) {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(t)) {
      if (c === 'USA' || c === 'United States') country = 'United States';
      else if (c === 'UK') country = 'United Kingdom';
      else country = c;
      break;
    }
  }

  let supplier = 'Unknown';
  let m = t.match(
    /(?:supplier|vendor|company|they(?:'re| are)?)\s*(?:is|called|named|from|:)?\s*([A-Za-z0-9][A-Za-z0-9 &\-'.]{2,79})/i
  );
  if (m) supplier = m[1].trim().replace(/[.,;]+$/, '');

  let product = 'Unknown';
  m = t.match(/(?:product|part|sku|item|widget|assembly)\s*(?:is|called|named|number|:)?\s*([^\n.,;]{3,120})/i);
  if (m) product = m[1].trim();

  let material = 'Unknown';
  m = t.match(/(?:material|alloy|steel|grade|resin)\s*(?:is|:)?\s*([^\n.,;]{2,80})/i);
  if (m) material = m[1].trim();

  return {
    supplier: supplier.slice(0, 200),
    product: product.slice(0, 200),
    price,
    currency,
    country: country.slice(0, 120),
    material: material.slice(0, 200),
    tariff_rate: null,
    exchange_rate: null,
  };
}

/**
 * @param {Record<string, unknown>} extracted
 * @param {string[]} manualFieldsList
 * @param {boolean} useLiz
 * @param {string} productName
 * @param {string} productDescription
 */
export function buildVerbalDemoSelectedFields(
  extracted,
  manualFieldsList,
  useLiz,
  productName,
  productDescription
) {
  const targetFields = new Set((manualFieldsList || []).map((x) => String(x).trim()).filter(Boolean));
  if (useLiz) {
    generateLizRecommendations(productName, productDescription).forEach((f) => targetFields.add(f));
  }
  ['supplier', 'product', 'price', 'currency', 'country', 'material'].forEach((f) => targetFields.add(f));

  const normalizedLookup = {
    supplier_company: 'supplier',
    product_name: 'product',
    country_of_origin: 'country',
    raw_materials: 'material',
    cost_per_unit: 'price',
  };

  const selected = {};
  Array.from(targetFields)
    .sort()
    .forEach((field) => {
      const sourceField = normalizedLookup[field] || field;
      let v = extracted[sourceField];
      if (v === undefined || v === null) v = 'Not found in quote';
      selected[field] = v;
    });
  return selected;
}
