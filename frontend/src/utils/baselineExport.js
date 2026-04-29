import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function fmtUsd(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));
}

function routeLabel(route) {
  if (route === 'sea') return 'Ocean freight';
  if (route === 'air') return 'Air cargo';
  if (route === 'land') return 'Rail / truck';
  return route ? String(route) : '—';
}

function safeFileSlug(s) {
  return String(s || 'baseline')
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 72) || 'baseline';
}

function serializeLine(item) {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    supplierLabel: item.supplierLabel,
    supplierQuoteId: item.supplierQuoteId,
    countryOfQuote: item.countryOfQuote,
    quantity: item.quantity,
    unitCost: item.unitCost,
    currency: item.currency,
    lineUsd: Math.round((Number(item.lineUsd) || 0) * 100) / 100,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.exportedAt ISO timestamp
 * @param {string} opts.displayCompany
 * @param {string} opts.companyKey
 * @param {string} opts.selectedProductId
 * @param {string} [opts.productName]
 * @param {number} [opts.baseCostUsd]
 * @param {object | null} opts.simulationResults
 * @param {object[]} opts.comparisonRowsAll
 * @param {Record<string, { route?: string, tariffScore?: number, fxInsight?: string, countries?: string[] }>} opts.tradeCtxByRowId
 */
export function buildBaselineExportBundle({
  exportedAt,
  displayCompany,
  companyKey,
  selectedProductId,
  productName,
  baseCostUsd,
  simulationResults,
  comparisonRowsAll,
  tradeCtxByRowId,
}) {
  const scenarios = (comparisonRowsAll || []).map((row) => {
    const t = tradeCtxByRowId?.[row.id];
    return {
      id: row.id,
      label: row.label,
      partsUsd: row.partsUsd,
      blendedBaseUsd: row.blendedBaseUsd,
      totalUsd: row.totalUsd,
      byCategoryUsd: row.byCategoryUsd || {},
      lineCount: row.selectedLines?.length ?? 0,
      skuByCat: row.skuByCat || {},
      trade: t
        ? {
            route: t.route,
            routeLabel: routeLabel(t.route),
            tariffScore: t.tariffScore,
            fxInsight: t.fxInsight,
            countries: t.countries,
          }
        : null,
    };
  });

  const lastSimulation = simulationResults
    ? {
        partsUsd: simulationResults.partsUsd,
        blendedBaseUsd: simulationResults.blendedBaseUsd,
        totalUsd: simulationResults.totalUsd,
        byCategoryUsd: simulationResults.byCategoryUsd || {},
        missingRequired: simulationResults.missingRequired || [],
        warnings: simulationResults.warnings || [],
        insight: simulationResults.insight,
        selectedLines: (simulationResults.selectedLines || []).map(serializeLine),
      }
    : null;

  return {
    meta: {
      exportedAt,
      app: 'BlaiseAI product baseline',
      displayCompany,
      companyKey,
      selectedProductId,
      productName: productName || selectedProductId,
      baseCostUsd: baseCostUsd ?? null,
    },
    lastSimulation,
    scenarios,
  };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportBaselineJson(bundle, productIdForName) {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const slug = safeFileSlug(productIdForName);
  triggerDownload(blob, `baseline_export_${slug}_${Date.now()}.json`);
}

export function exportBaselineExcel(bundle, productIdForName) {
  const wb = XLSX.utils.book_new();
  const { meta, lastSimulation, scenarios } = bundle;

  const metaRows = [
    ['Field', 'Value'],
    ['Exported (UTC)', meta.exportedAt],
    ['Company', meta.displayCompany],
    ['Program pack', meta.companyKey],
    ['Product', meta.productName],
    ['Platform base (USD)', meta.baseCostUsd != null ? meta.baseCostUsd : ''],
    ['Last simulation present', lastSimulation ? 'Yes' : 'No'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), 'Meta');

  const scenSheet = scenarios.map((s) => ({
    scenario_id: s.id,
    scenario_label: s.label,
    quoted_bom_usd: Math.round(s.partsUsd || 0),
    platform_usd: Math.round(s.blendedBaseUsd || 0),
    total_usd_eq: Math.round(s.totalUsd || 0),
    line_count: s.lineCount,
    transport_route: s.trade?.routeLabel || '',
    tariff_score: s.trade?.tariffScore ?? '',
    fx_mix: s.trade?.fxInsight || '',
    by_category_usd_json: JSON.stringify(s.byCategoryUsd || {}),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scenSheet), 'Scenarios');

  if (lastSimulation?.selectedLines?.length) {
    const lines = lastSimulation.selectedLines.map((l) => ({
      ...l,
      line_usd_usd_eq: l.lineUsd,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), 'Last_run_lines');
  } else {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Note'], ['Run baseline simulation to populate line-level export.']]),
      'Last_run_lines'
    );
  }

  if (lastSimulation) {
    const summary = [
      ['Metric', 'USD eq.'],
      ['Quoted BOM (parts)', lastSimulation.partsUsd],
      ['Platform / integration', lastSimulation.blendedBaseUsd],
      ['Rolled-up total', lastSimulation.totalUsd],
      ['', ''],
      ['Insight', lastSimulation.insight || ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Last_run_summary');
  }

  const slug = safeFileSlug(productIdForName);
  XLSX.writeFile(wb, `baseline_export_${slug}_${Date.now()}.xlsx`);
}

export function exportBaselinePdf(bundle, productIdForName) {
  const { meta, lastSimulation, scenarios } = bundle;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Product baseline export', 48, y);
  y += 28;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Company: ${meta.displayCompany} · Pack: ${meta.companyKey}`, 48, y);
  y += 16;
  doc.text(`Product: ${meta.productName}`, 48, y);
  y += 16;
  doc.text(`Exported: ${meta.exportedAt}`, 48, y);
  y += 28;

  if (lastSimulation) {
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Last simulation rollup', 48, y);
    y += 18;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Quoted BOM: ${fmtUsd(lastSimulation.partsUsd)}`, 48, y);
    y += 14;
    doc.text(`Platform: ${fmtUsd(lastSimulation.blendedBaseUsd)}`, 48, y);
    y += 14;
    doc.text(`Total: ${fmtUsd(lastSimulation.totalUsd)}`, 48, y);
    y += 18;
    const insight = doc.splitTextToSize(String(lastSimulation.insight || ''), pageW - 96);
    doc.text(insight, 48, y);
    y += insight.length * 12 + 24;
  }

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Scenario comparator', 48, y);
  y += 8;

  const scenBody = scenarios.map((s) => [
    s.label,
    fmtUsd(s.partsUsd),
    fmtUsd(s.blendedBaseUsd),
    fmtUsd(s.totalUsd),
    String(s.lineCount),
    s.trade ? `${s.trade.routeLabel} (${s.trade.tariffScore})` : '—',
    String(s.trade?.fxInsight || '—').slice(0, 42),
  ]);

  autoTable(doc, {
    startY: y + 10,
    head: [['Scenario', 'Quoted BOM', 'Platform', 'Total', 'Lines', 'Tariff', 'FX mix']],
    body: scenBody,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: 48, right: 48 },
  });

  let afterScen = doc.lastAutoTable?.finalY ?? y + 120;
  afterScen += 24;

  if (lastSimulation?.selectedLines?.length) {
    if (afterScen > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      afterScen = 48;
    }
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Quoted line items (last run)', 48, afterScen);
    afterScen += 8;

    const lineBody = lastSimulation.selectedLines.map((l) => [
      String(l.sku),
      String(l.name || '').slice(0, 36),
      String(l.supplierLabel || '').slice(0, 22),
      String(l.countryOfQuote || ''),
      fmtUsd(l.lineUsd),
    ]);

    autoTable(doc, {
      startY: afterScen + 10,
      head: [['SKU', 'Description', 'Supplier', 'Country', 'USD eq.']],
      body: lineBody,
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      margin: { left: 48, right: 48 },
    });
  }

  const slug = safeFileSlug(productIdForName);
  doc.save(`baseline_export_${slug}_${Date.now()}.pdf`);
}
