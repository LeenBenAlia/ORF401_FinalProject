import React, { useCallback, useEffect, useState } from 'react';
import api, { formatApiError } from '../api';
import { usesStaticGithubPagesDemo } from '../githubPagesDemo';

function QuoteTrashPanel() {
  const [trashed, setTrashed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (usesStaticGithubPagesDemo()) {
        setTrashed([]);
        return;
      }
      const res = await api.get('/quotes/trash');
      setTrashed(res.data.quotes || []);
    } catch (err) {
      setError(formatApiError(err));
      setTrashed([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onQuotesChanged = () => load();
    window.addEventListener('quotes:changed', onQuotesChanged);
    return () => window.removeEventListener('quotes:changed', onQuotesChanged);
  }, [load]);

  const restore = async (quoteId) => {
    try {
      setBusyId(quoteId);
      setError('');
      await api.post('/quotes/restore', { quote_ids: [quoteId] });
      await load();
      window.dispatchEvent(new CustomEvent('quotes:changed'));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel quote-trash-panel card-soft" aria-labelledby="quote-trash-heading">
      <header className="quote-trash-panel__head">
        <div>
          <h2 id="quote-trash-heading">Trash</h2>
          <p className="muted">
            Quotes moved here stay until you restore them. They stay out of your library, dashboard summary, and export.
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm quote-trash-refresh" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </header>
      {usesStaticGithubPagesDemo() && (
        <p className="quote-library-api-note" role="note">
          <strong>Preview:</strong> Trash sync uses the API — unavailable on static GitHub Pages without a hosted backend.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {!loading && trashed.length === 0 && (
        <p className="muted">Trash is empty.</p>
      )}
      {!loading && trashed.length > 0 && (
        <div className="company-quote-table-wrap">
          <table className="company-quote-table quote-trash-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Previously in folder</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...trashed]
                .sort((a, b) => b.id - a.id)
                .map((q) => (
                  <tr key={q.id}>
                    <td>#{q.id}</td>
                    <td>{q.filename}</td>
                    <td className="muted">{q.previous_group_key ?? '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        disabled={busyId === q.id}
                        onClick={() => restore(q.id)}
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default QuoteTrashPanel;
