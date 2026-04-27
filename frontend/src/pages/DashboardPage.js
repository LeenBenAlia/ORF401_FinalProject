import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api, { formatApiError } from '../api';

function productLabel(q) {
  const sf = q.selected_fields || {};
  const ex = q.extracted || {};
  const raw = sf.product ?? ex.product ?? 'Unknown product';
  const s = String(raw).trim();
  return s || 'Unknown product';
}

function DashboardPage() {
  const { company, user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError('');
        const res = await api.get('/quotes');
        if (!cancelled) setQuotes(res.data.quotes || []);
      } catch (e) {
        if (!cancelled) setLoadError(formatApiError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const productFolderRows = useMemo(() => {
    const byProduct = new Map();
    for (const q of quotes) {
      const p = productLabel(q);
      if (!byProduct.has(p)) byProduct.set(p, new Map());
      const folderMap = byProduct.get(p);
      const g = q.group_key || 'default';
      folderMap.set(g, (folderMap.get(g) || 0) + 1);
    }
    return Array.from(byProduct.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [quotes]);

  const displayCompany = company?.company_name || user?.company || 'Your company';

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Welcome back</p>
        <h1>{displayCompany} dashboard</h1>
        <p className="lede lede--muted">
          Track digitized supplier quotes by product line and see which folders they live in. Uploads from the quote page appear here automatically.
        </p>
      </header>

      <section className="panel card-soft">
        <h2>Products &amp; folders</h2>
        <p className="muted">
          Each card is a product detected from your quote files. Folder badges show how many quotes for that product sit in each folder.
        </p>
        {loadError && <p className="error-text">{loadError}</p>}
        {productFolderRows.length === 0 && !loadError && (
          <p className="muted">
            No digitized quotes yet.{' '}
            <Link to="/quotes">Open Quote digitization</Link> to upload PDFs or spreadsheets and assign folders.
          </p>
        )}
        {productFolderRows.length > 0 && (
          <div className="dashboard-product-grid">
            {productFolderRows.map(([product, folderMap]) => (
              <article key={product} className="dashboard-product-card">
                <h3 className="dashboard-product-card__title">{product}</h3>
                <ul className="dashboard-folder-chips">
                  {Array.from(folderMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([folder, count]) => (
                      <li key={folder} className="dashboard-folder-chips__item">
                        <span className="folder-badge">{folder}</span>
                        <span className="muted">
                          {count} quote{count !== 1 ? 's' : ''}
                        </span>
                      </li>
                    ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <h2>All quotes (summary)</h2>
        <p className="muted">Latest filenames from your library.</p>
        {quotes.length === 0 ? (
          <p className="muted">Nothing uploaded yet.</p>
        ) : (
          <div className="company-quote-table-wrap">
            <table className="company-quote-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Folder</th>
                  <th>File</th>
                  <th>Product</th>
                </tr>
              </thead>
              <tbody>
                {quotes
                  .slice()
                  .sort((a, b) => b.id - a.id)
                  .slice(0, 12)
                  .map((q) => (
                    <tr key={q.id}>
                      <td>#{q.id}</td>
                      <td>{q.group_key || 'default'}</td>
                      <td>{q.filename}</td>
                      <td>{productLabel(q)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {quotes.length > 12 && (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Showing 12 of {quotes.length}. <Link to="/quotes">View full library</Link>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <h2>Next steps</h2>
        <ul className="list-check">
          <li>Drag quotes between folder columns on the quote library, or drop files onto folder tiles when uploading.</li>
          <li>Build product cost baselines using the Product baseline simulator.</li>
          <li>Review FX exposure for sourced currencies in the FX page.</li>
          <li>Analyze tariff risk with route and conflict context in the Tariff page.</li>
        </ul>
      </section>
    </main>
  );
}

export default DashboardPage;
