/**
 * Browser-only quote rows for GitHub Pages (no FastAPI). Persisted in sessionStorage
 * so the quote library and dashboard stay in sync until the tab closes.
 */

import { buildVerbalDemoSelectedFields } from './utils/verbalQuoteExtract';

const QUOTES_KEY = 'blaise_demo_quotes_v1';
const EXTRA_GROUPS_KEY = 'blaise_demo_extra_groups_v1';
const PRODUCTS_KEY = 'blaise_demo_products_v1';

function readAll() {
  try {
    const raw = sessionStorage.getItem(QUOTES_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows) {
  sessionStorage.setItem(QUOTES_KEY, JSON.stringify(rows));
}

function readExtraGroupsMap() {
  try {
    const raw = sessionStorage.getItem(EXTRA_GROUPS_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeExtraGroupsMap(map) {
  sessionStorage.setItem(EXTRA_GROUPS_KEY, JSON.stringify(map));
}

function readProductsMap() {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeProductsMap(map) {
  sessionStorage.setItem(PRODUCTS_KEY, JSON.stringify(map));
}

export function getDemoProducts(companyId) {
  const m = readProductsMap();
  const arr = Array.isArray(m[companyId]) ? [...m[companyId]] : [];
  return arr.sort((a, b) => a.localeCompare(b));
}

export function addDemoProduct(companyId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const m = readProductsMap();
  const prev = Array.isArray(m[companyId]) ? [...m[companyId]] : [];
  if (!prev.includes(trimmed)) prev.push(trimmed);
  prev.sort((a, b) => a.localeCompare(b));
  m[companyId] = prev;
  writeProductsMap(m);
}

export function assignDemoQuoteProduct(companyId, quoteIds, productName) {
  const ids = new Set(quoteIds.map((x) => Number(x)));
  const trimmed = String(productName || '').trim();
  const next = readAll().map((q) => {
    if (q.company_id !== companyId || !ids.has(Number(q.id))) return q;
    const copy = { ...q };
    if (trimmed) copy.manual_product = trimmed;
    else delete copy.manual_product;
    return copy;
  });
  writeAll(next);
}

export function nextDemoQuoteId() {
  return readAll().reduce((m, q) => Math.max(m, Number(q.id) || 0), 0) + 1;
}

export function loadActiveDemoQuotes(companyId) {
  return readAll().filter((q) => q.company_id === companyId && !q.trashed);
}

export function loadTrashedDemoQuotes(companyId) {
  return readAll().filter((q) => q.company_id === companyId && q.trashed);
}

export function appendDemoQuotes(records) {
  const all = readAll();
  writeAll([...all, ...records]);
}

export function getDemoGroupNames(companyId) {
  const keys = new Set(['default']);
  loadActiveDemoQuotes(companyId).forEach((q) => keys.add(q.group_key || 'default'));
  const extras = readExtraGroupsMap()[companyId];
  if (Array.isArray(extras)) {
    extras.forEach((g) => keys.add(g));
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export function addDemoExtraGroup(companyId, name) {
  const map = readExtraGroupsMap();
  const prev = Array.isArray(map[companyId]) ? [...map[companyId]] : [];
  if (!prev.includes(name)) prev.push(name);
  map[companyId] = prev;
  writeExtraGroupsMap(map);
}

export function assignDemoQuotesToGroup(companyId, quoteIds, groupName) {
  const ids = new Set(quoteIds.map((x) => Number(x)));
  const next = readAll().map((q) =>
    q.company_id === companyId && ids.has(Number(q.id)) ? { ...q, group_key: groupName } : q
  );
  writeAll(next);
}

export function trashDemoQuote(companyId, quoteId) {
  const id = Number(quoteId);
  const next = readAll().map((q) =>
    q.company_id === companyId && Number(q.id) === id
      ? {
          ...q,
          trashed: true,
          previous_group_key: q.group_key || 'default',
        }
      : q
  );
  writeAll(next);
}

export function restoreDemoQuote(companyId, quoteId) {
  const id = Number(quoteId);
  const next = readAll().map((q) =>
    q.company_id === companyId && Number(q.id) === id
      ? {
          ...q,
          trashed: false,
          group_key: q.previous_group_key ?? q.group_key ?? 'default',
        }
      : q
  );
  writeAll(next);
}

/**
 * @param {File[]} files
 * @param {{ companyId: string, groupKey: string, productName: string, manualProductLine?: string }} opts
 */
/**
 * One demo quote row from a meeting transcript (GitHub Pages).
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.groupKey
 * @param {string} [opts.manualProductLine]
 * @param {string} opts.meetingTitle
 * @param {string} opts.transcript
 * @param {Record<string, unknown>} opts.extracted
 * @param {boolean} opts.useLiz
 * @param {string[]} opts.manualFieldsList
 * @param {string} opts.productName
 * @param {string} opts.productDescription
 */
export function buildDemoVerbalQuoteRecord(opts) {
  const {
    companyId,
    groupKey,
    manualProductLine,
    meetingTitle,
    transcript,
    extracted,
    useLiz,
    manualFieldsList,
    productName,
    productDescription,
  } = opts;
  const id = nextDemoQuoteId();
  const slug = String(meetingTitle || 'sales-call')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'meeting';
  const fname = `${slug}-${id}.meeting.txt`;
  const mp = typeof manualProductLine === 'string' ? manualProductLine.trim() : '';
  const selected_fields = buildVerbalDemoSelectedFields(
    extracted,
    manualFieldsList || [],
    useLiz,
    productName || '',
    productDescription || ''
  );
  const rec = {
    id,
    company_id: companyId,
    filename: fname,
    group_key: groupKey,
    trashed: false,
    source_type: '.meeting.txt',
    extracted: { ...extracted },
    selected_fields,
    meeting_transcript: String(transcript || '').slice(0, 50000),
    meeting_title: String(meetingTitle || 'Sales call').slice(0, 200),
  };
  if (mp) {
    rec.manual_product = mp;
    addDemoProduct(companyId, mp);
  }
  return rec;
}

export function buildDemoQuoteRecordsFromFiles(files, { companyId, groupKey, productName, manualProductLine }) {
  let id = nextDemoQuoteId();
  return files.map((file) => {
    const mp = typeof manualProductLine === 'string' ? manualProductLine.trim() : '';
    const rec = {
      id,
      company_id: companyId,
      filename: file.name,
      group_key: groupKey,
      trashed: false,
      source_type: (file.name.match(/(\.[a-z0-9]+)$/i) || [''])[0].toLowerCase() || '.pdf',
      extracted: {
        product: productName || 'Preview digitization',
        supplier_company: 'Demo supplier (GitHub Pages preview)',
        price: null,
      },
      selected_fields: {
        product: productName || 'Preview digitization',
        supplier_company: 'Demo supplier (GitHub Pages preview)',
      },
    };
    if (mp) {
      rec.manual_product = mp;
      addDemoProduct(companyId, mp);
    }
    id += 1;
    return rec;
  });
}
