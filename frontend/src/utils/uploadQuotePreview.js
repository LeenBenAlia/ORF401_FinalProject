/**
 * Build columns/rows for a non-redundant spreadsheet preview of digitized quotes.
 * Uses metadata + `extracted` only (avoids duplicating values also present in `selected_fields`).
 */

const META_KEYS = ['id', 'filename', 'group_key', 'source_type', 'manual_product', 'meeting_title'];

export function flattenQuoteRecordsForPreview(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { columns: [], rows: [] };
  }

  const extKeySet = new Set();
  records.forEach((r) => {
    const ex = r.extracted;
    if (ex && typeof ex === 'object') {
      Object.keys(ex).forEach((k) => extKeySet.add(k));
    }
  });
  const extCols = Array.from(extKeySet).sort((a, b) => a.localeCompare(b));

  const metaCols = META_KEYS.filter((k) =>
    records.some((r) => {
      const v = r[k];
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim() !== '';
      return true;
    })
  );

  const columns = [...metaCols, ...extCols];
  const rows = records.map((r) => {
    const row = {};
    columns.forEach((c) => {
      if (metaCols.includes(c)) {
        row[c] = r[c] ?? '';
      } else {
        const v = r.extracted && r.extracted[c];
        row[c] = v === null || v === undefined ? '' : v;
      }
    });
    return row;
  });

  return { columns, rows };
}
