import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../api";
import { useAuth } from "../auth";
import { buildTariffLinkFromUploadedQuote } from "../utils/baselineTradeSignals";
import { usesStaticGithubPagesDemo } from "../githubPagesDemo";
import {
  loadActiveDemoQuotes,
  getDemoGroupNames,
  addDemoExtraGroup,
  assignDemoQuotesToGroup,
  trashDemoQuote,
  getDemoProducts,
  assignDemoQuoteProduct,
} from "../demoQuoteStore";
import { quoteProductLabel } from "../utils/quoteProduct";

function QuoteLibrary() {
  const { company } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [groups, setGroups] = useState(["default"]);
  const [newGroup, setNewGroup] = useState("");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [targetGroup, setTargetGroup] = useState("default");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [draggingQuoteId, setDraggingQuoteId] = useState(null);
  const [productCatalog, setProductCatalog] = useState([]);

  const loadProducts = useCallback(async () => {
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setProductCatalog([]);
          return;
        }
        setProductCatalog(getDemoProducts(company.id));
        return;
      }
      const res = await api.get("/products");
      setProductCatalog(res.data.products || []);
    } catch {
      setProductCatalog([]);
    }
  }, [company?.id]);

  const load = useCallback(async () => {
    try {
      setError("");
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setQuotes([]);
          setGroups(["default"]);
          return;
        }
        setQuotes(loadActiveDemoQuotes(company.id));
        const nextGroups = getDemoGroupNames(company.id);
        setGroups(nextGroups.length ? nextGroups : ["default"]);
        setTargetGroup((prev) => (nextGroups.includes(prev) ? prev : nextGroups[0]));
        return;
      }
      const [q, g] = await Promise.all([api.get("/quotes"), api.get("/groups")]);
      setQuotes(q.data.quotes || []);
      const nextGroups = g.data.groups?.length ? g.data.groups : ["default"];
      setGroups(nextGroups);
      setTargetGroup((prev) => (nextGroups.includes(prev) ? prev : nextGroups[0]));
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [company?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const onQuotesChanged = () => load();
    window.addEventListener("quotes:changed", onQuotesChanged);
    return () => window.removeEventListener("quotes:changed", onQuotesChanged);
  }, [load]);

  useEffect(() => {
    const onProductsChanged = () => loadProducts();
    window.addEventListener("products:changed", onProductsChanged);
    return () => window.removeEventListener("products:changed", onProductsChanged);
  }, [loadProducts]);

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        addDemoExtraGroup(company.id, newGroup.trim());
        setNewGroup("");
        await load();
        window.dispatchEvent(new CustomEvent("quotes:changed"));
        return;
      }
      await api.post("/groups", { name: newGroup.trim() });
      setNewGroup("");
      await load();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const assignGroup = async () => {
    if (!selectedQuoteIds.length) return;
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        assignDemoQuotesToGroup(company.id, selectedQuoteIds, targetGroup);
        setSelectedQuoteIds([]);
        await load();
        window.dispatchEvent(new CustomEvent("quotes:changed"));
        return;
      }
      await api.post("/quotes/assign-group", {
        quote_ids: selectedQuoteIds,
        group_name: targetGroup,
      });
      setSelectedQuoteIds([]);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const trashQuote = async (quoteId) => {
    if (!window.confirm("Move this quote to Trash?")) return;
    try {
      setError("");
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        trashDemoQuote(company.id, quoteId);
        await load();
        window.dispatchEvent(new CustomEvent("quotes:changed"));
        return;
      }
      await api.post("/quotes/trash", { quote_ids: [quoteId] });
      await load();
      window.dispatchEvent(new CustomEvent("quotes:changed"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const assignQuoteProduct = async (quoteId, productName) => {
    try {
      setError("");
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        assignDemoQuoteProduct(company.id, [quoteId], productName);
        await load();
        window.dispatchEvent(new CustomEvent("quotes:changed"));
        return;
      }
      await api.post("/quotes/assign-product", {
        quote_ids: [quoteId],
        product_name: productName,
      });
      await load();
      window.dispatchEvent(new CustomEvent("quotes:changed"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const moveQuoteToFolder = async (quoteId, folderName) => {
    const q = quotes.find((x) => x.id === quoteId);
    if (!q || (q.group_key || "default") === folderName) return;
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) return;
        assignDemoQuotesToGroup(company.id, [quoteId], folderName);
        await load();
        window.dispatchEvent(new CustomEvent("quotes:changed"));
        return;
      }
      await api.post("/quotes/assign-group", {
        quote_ids: [quoteId],
        group_name: folderName,
      });
      await load();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const toggleQuote = (id) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const grouped = quotes.reduce((acc, quote) => {
    const key = quote.group_key || "default";
    if (!acc[key]) acc[key] = [];
    acc[key].push(quote);
    return acc;
  }, {});

  const matchesQuery = (q) => {
    if (!query.trim()) return true;
    const t = query.toLowerCase();
    return (q.filename || "").toLowerCase().includes(t);
  };

  const onFolderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onFolderDragEnter = (e, folderName) => {
    e.preventDefault();
    setDragOverGroup(folderName);
  };

  const onFolderDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverGroup(null);
    }
  };

  const onFolderDrop = async (e, folderName) => {
    e.preventDefault();
    setDragOverGroup(null);
    const raw = e.dataTransfer.getData("text/plain");
    const quoteId = parseInt(raw, 10);
    if (!Number.isFinite(quoteId)) return;
    try {
      await moveQuoteToFolder(quoteId, folderName);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <section className="panel quote-library">
      <h2>Past uploads and quote folders</h2>
      <p className="muted">
        Folders are columns below. <strong>Drag</strong> a quote onto another folder to move it, or select quotes and use the move row.
        Drop quote files on the upload page onto a folder tile to queue them there.
      </p>
      {usesStaticGithubPagesDemo() && (
        <p className="quote-library-api-note" role="note">
          <strong>GitHub Pages preview:</strong> quotes here are from your browser session (demo uploads). Real persistence needs the hosted API and{' '}
          <code className="quote-library-code">REACT_APP_API_BASE_URL</code>.
        </p>
      )}
      <p className="muted" style={{ marginTop: "0.35rem" }}>
        Product lines can be created on the <Link to="/">dashboard</Link>. Assign a quote to a product below (optional); otherwise the product shown follows extracted text.
      </p>
      {error && <p className="error-text">{error}</p>}

      <div className="upload-row">
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createGroup();
            }
          }}
          placeholder="New folder name"
        />
        <button type="button" onClick={createGroup}>
          Create folder
        </button>
      </div>

      <div className="upload-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by filename"
        />
        <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="button" onClick={assignGroup} disabled={!selectedQuoteIds.length}>
          Move selected to folder
        </button>
      </div>

      <div className="library-folder-board" role="list" aria-label="Quote folders">
        {groups.map((folderName) => {
          const items = (grouped[folderName] || []).filter(matchesQuery);
          const isTarget = dragOverGroup === folderName;
          return (
            <article
              key={folderName}
              className={`library-folder-column${isTarget ? " library-folder-column--drop" : ""}`}
              role="listitem"
              onDragEnter={(e) => onFolderDragEnter(e, folderName)}
              onDragOver={onFolderDragOver}
              onDragLeave={onFolderDragLeave}
              onDrop={(e) => onFolderDrop(e, folderName)}
            >
              <header className="library-folder-column__head">
                <h3 className="library-folder-column__title">{folderName}</h3>
                <span className="library-folder-column__count">{items.length}</span>
              </header>
              <ul className="library-folder-column__list">
                {items.length === 0 && (
                  <li className="library-folder-column__empty muted">Drop quotes here</li>
                )}
                {items.map((q) => (
                  <li
                    key={q.id}
                    className={`library-quote-chip${draggingQuoteId === q.id ? " library-quote-chip--dragging" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(q.id));
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingQuoteId(q.id);
                    }}
                    onDragEnd={() => {
                      setDraggingQuoteId(null);
                      setDragOverGroup(null);
                    }}
                  >
                    <div className="library-quote-chip__main">
                      <label className="library-quote-chip__label">
                        <input
                          type="checkbox"
                          checked={selectedQuoteIds.includes(q.id)}
                          onChange={() => toggleQuote(q.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="library-quote-chip__text" title={q.filename}>
                          #{q.id} · {q.filename}
                        </span>
                        <span className="library-quote-chip__hint" aria-hidden="true">
                          ⋮⋮
                        </span>
                      </label>
                      <Link
                        to={buildTariffLinkFromUploadedQuote(q)}
                        className="library-quote-chip__tariff"
                        title="Open tariff map using this quote’s origin heuristic"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Tariff route
                      </Link>
                      <button
                        type="button"
                        className="library-quote-chip__trash"
                        title="Move to Trash"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          trashQuote(q.id);
                        }}
                      >
                        Trash
                      </button>
                    </div>
                    <div className="library-quote-chip__product-row">
                      <label className="library-quote-chip__product-label">
                        <span className="library-quote-chip__product-caption">Product</span>
                        <select
                          className="library-quote-chip__product-select"
                          value={
                            typeof q.manual_product === "string" && q.manual_product.trim()
                              ? q.manual_product.trim()
                              : ""
                          }
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => assignQuoteProduct(q.id, e.target.value)}
                          aria-label={`Product line for quote ${q.id}`}
                        >
                          <option value="">
                            {(() => {
                              const x = { ...q };
                              delete x.manual_product;
                              const lab = quoteProductLabel(x);
                              const short = lab.length > 36 ? `${lab.slice(0, 34)}…` : lab;
                              return `From file (${short})`;
                            })()}
                          </option>
                          {productCatalog.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default QuoteLibrary;
