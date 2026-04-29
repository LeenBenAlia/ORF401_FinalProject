import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api, { formatApiError } from '../api';
import { usesStaticGithubPagesDemo } from '../githubPagesDemo';
import { loadActiveDemoQuotes, trashDemoQuote, getDemoProducts, addDemoProduct } from '../demoQuoteStore';
import { quoteProductLabel } from '../utils/quoteProduct';

function DashboardPage() {
  const { company, user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [filterId, setFilterId] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterParamKey, setFilterParamKey] = useState('');
  const [filterParamValue, setFilterParamValue] = useState('');

  const loadProductCatalog = useCallback(async () => {
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setCatalogProducts([]);
          return;
        }
        setCatalogProducts(getDemoProducts(company.id));
        return;
      }
      const res = await api.get('/products');
      setCatalogProducts(res.data.products || []);
    } catch {
      setCatalogProducts([]);
    }
  }, [company?.id]);

  useEffect(() => {
    loadProductCatalog();
  }, [loadProductCatalog]);

  useEffect(() => {
    const onProductsChanged = () => loadProductCatalog();
    window.addEventListener('products:changed', onProductsChanged);
    return () => window.removeEventListener('products:changed', onProductsChanged);
  }, [loadProductCatalog]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const name = newProductName.trim();
    if (!name) return;
    try {
      setProductSaving(true);
      setLoadError('');
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        addDemoProduct(company.id, name);
        setNewProductName('');
        await loadProductCatalog();
        window.dispatchEvent(new CustomEvent('products:changed'));
        return;
      }
      await api.post('/products', { name });
      setNewProductName('');
      await loadProductCatalog();
      window.dispatchEvent(new CustomEvent('products:changed'));
    } catch (err) {
      setLoadError(formatApiError(err));
    } finally {
      setProductSaving(false);
    }
  };

  const refreshQuotes = React.useCallback(async () => {
    try {
      setLoadError('');
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setQuotes([]);
          return;
        }
        setQuotes(loadActiveDemoQuotes(company.id));
        return;
      }
      const res = await api.get('/quotes');
      setQuotes(res.data.quotes || []);
    } catch (e) {
      setLoadError(formatApiError(e));
    }
  }, [company?.id]);

  useEffect(() => {
    refreshQuotes();
    const onQuotesChanged = () => refreshQuotes();
    window.addEventListener('quotes:changed', onQuotesChanged);
    return () => window.removeEventListener('quotes:changed', onQuotesChanged);
  }, [refreshQuotes]);

  const moveQuoteToTrash = async (quoteId, filename) => {
    if (!window.confirm(`Move “${filename}” to Trash?`)) return;
    try {
      setLoadError('');
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        trashDemoQuote(company.id, quoteId);
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
        window.dispatchEvent(new CustomEvent('quotes:changed'));
        return;
      }
      await api.post('/quotes/trash', { quote_ids: [quoteId] });
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      window.dispatchEvent(new CustomEvent('quotes:changed'));
    } catch (e) {
      setLoadError(formatApiError(e));
    }
  };

  const productFolderRows = useMemo(() => {
    const byProduct = new Map();
    catalogProducts.forEach((p) => {
      if (!byProduct.has(p)) byProduct.set(p, new Map());
    });
    for (const q of quotes) {
      const p = quoteProductLabel(q);
      if (!byProduct.has(p)) byProduct.set(p, new Map());
      const folderMap = byProduct.get(p);
      const g = q.group_key || 'default';
      folderMap.set(g, (folderMap.get(g) || 0) + 1);
    }
    return Array.from(byProduct.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [quotes, catalogProducts]);

  const filterOptions = useMemo(() => {
    const products = new Set();
    const folders = new Set();
    const materials = new Set();
    const countries = new Set();
    const paramKeys = new Set();
    quotes.forEach((q) => {
      products.add(quoteProductLabel(q));
      folders.add(q.group_key || 'default');
      const ex = q.extracted || {};
      const sf = q.selected_fields || {};
      const material = String(ex.material ?? sf.material ?? '').trim();
      const country = String(ex.country ?? sf.country ?? sf.country_of_origin ?? '').trim();
      if (material) materials.add(material);
      if (country) countries.add(country);
      Object.keys(ex || {}).forEach((k) => paramKeys.add(k));
      Object.keys(sf || {}).forEach((k) => paramKeys.add(k));
      paramKeys.add('id');
      paramKeys.add('filename');
      paramKeys.add('group_key');
      paramKeys.add('product');
    });
    return {
      products: Array.from(products).sort((a, b) => a.localeCompare(b)),
      folders: Array.from(folders).sort((a, b) => a.localeCompare(b)),
      materials: Array.from(materials).sort((a, b) => a.localeCompare(b)),
      countries: Array.from(countries).sort((a, b) => a.localeCompare(b)),
      paramKeys: Array.from(paramKeys).sort((a, b) => a.localeCompare(b)),
    };
  }, [quotes]);

  const resolveParamValue = useCallback((q, key) => {
    if (!key) return '';
    const ex = q.extracted || {};
    const sf = q.selected_fields || {};
    if (key === 'id') return String(q.id ?? '');
    if (key === 'filename') return String(q.filename ?? '');
    if (key === 'group_key') return String(q.group_key || 'default');
    if (key === 'product') return quoteProductLabel(q);
    if (sf[key] != null) return String(sf[key]);
    if (ex[key] != null) return String(ex[key]);
    return '';
  }, []);

  const filteredQuotes = useMemo(() => {
    const idTerm = filterId.trim().toLowerCase();
    const paramTerm = filterParamValue.trim().toLowerCase();
    return quotes.filter((q) => {
      const product = quoteProductLabel(q);
      const folder = q.group_key || 'default';
      const ex = q.extracted || {};
      const sf = q.selected_fields || {};
      const material = String(ex.material ?? sf.material ?? '').trim();
      const country = String(ex.country ?? sf.country ?? sf.country_of_origin ?? '').trim();

      if (idTerm && !String(q.id).toLowerCase().includes(idTerm)) return false;
      if (filterProduct && product !== filterProduct) return false;
      if (filterFolder && folder !== filterFolder) return false;
      if (filterMaterial && material !== filterMaterial) return false;
      if (filterCountry && country !== filterCountry) return false;
      if (filterParamKey && paramTerm) {
        const v = resolveParamValue(q, filterParamKey).toLowerCase();
        if (!v.includes(paramTerm)) return false;
      }
      return true;
    });
  }, [
    quotes,
    filterId,
    filterProduct,
    filterFolder,
    filterMaterial,
    filterCountry,
    filterParamKey,
    filterParamValue,
    resolveParamValue,
  ]);

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
          Create product lines here, then on <Link to="/quotes">Quote digitization</Link> choose a product tile or assign quotes in
          the library. Manual product assignments override text extracted from files.
        </p>
        <form className="dashboard-add-product" onSubmit={handleCreateProduct}>
          <label htmlFor="dashboard-new-product" className="sr-only">
            New product line name
          </label>
          <input
            id="dashboard-new-product"
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder="e.g. Battery module — Gen 4"
            className="dashboard-add-product__input"
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={productSaving || !newProductName.trim()}>
            Add product
          </button>
        </form>
        {loadError && <p className="error-text">{loadError}</p>}
        {productFolderRows.length === 0 && !loadError && (
          <p className="muted">
            No products yet — add one above, or{' '}
            <Link to="/quotes">open Quote digitization</Link> to upload PDFs or spreadsheets and assign folders.
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
        <p className="muted">Latest filenames from your library. Use filters below to slice by key attributes or your own parameter.</p>
        <div className="dashboard-filter-grid">
          <input
            type="text"
            className="dashboard-filter-input"
            placeholder="Filter by quote ID (e.g. 12)"
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
          />
          <select className="dashboard-filter-input" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
            <option value="">All product lines</option>
            {filterOptions.products.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select className="dashboard-filter-input" value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)}>
            <option value="">All folders</option>
            {filterOptions.folders.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select className="dashboard-filter-input" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)}>
            <option value="">All materials</option>
            {filterOptions.materials.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select className="dashboard-filter-input" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">All countries</option>
            {filterOptions.countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            list="dashboard-param-key-suggest"
            className="dashboard-filter-input"
            placeholder="Custom parameter key (e.g. supplier, currency)"
            value={filterParamKey}
            onChange={(e) => setFilterParamKey(e.target.value)}
          />
          <datalist id="dashboard-param-key-suggest">
            {filterOptions.paramKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          <input
            type="text"
            className="dashboard-filter-input"
            placeholder="Custom parameter value"
            value={filterParamValue}
            onChange={(e) => setFilterParamValue(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setFilterId('');
              setFilterProduct('');
              setFilterFolder('');
              setFilterMaterial('');
              setFilterCountry('');
              setFilterParamKey('');
              setFilterParamValue('');
            }}
          >
            Clear filters
          </button>
        </div>
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
                  <th scope="col" className="dashboard-actions-col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes
                  .slice()
                  .sort((a, b) => b.id - a.id)
                  .slice(0, 12)
                  .map((q) => (
                    <tr key={q.id}>
                      <td>#{q.id}</td>
                      <td>{q.group_key || 'default'}</td>
                      <td>{q.filename}</td>
                      <td>{quoteProductLabel(q)}</td>
                      <td className="dashboard-actions-col">
                        <button
                          type="button"
                          className="btn-quote-trash"
                          title="Move to Trash"
                          onClick={() => moveQuoteToTrash(q.id, q.filename)}
                        >
                          Trash
                        </button>
                      </td>
                    </tr>
                  ))}
                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">No quotes match the active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredQuotes.length > 12 && (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Showing 12 of {filteredQuotes.length} filtered quotes. <Link to="/quotes">View full library</Link>
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
