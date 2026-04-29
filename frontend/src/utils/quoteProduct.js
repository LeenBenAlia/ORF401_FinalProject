/**
 * Display label for which product line a digitized quote belongs to.
 * Manual assignment (dashboard / library / upload) overrides extracted text.
 */
export function quoteProductLabel(q) {
  const mp = typeof q?.manual_product === 'string' ? q.manual_product.trim() : '';
  if (mp) return mp;
  const sf = q?.selected_fields || {};
  const ex = q?.extracted || {};
  const raw = sf.product ?? ex.product ?? 'Unknown product';
  const s = String(raw).trim();
  return s || 'Unknown product';
}
