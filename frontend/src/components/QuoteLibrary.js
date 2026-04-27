import React, { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../api";

function QuoteLibrary() {
  const [quotes, setQuotes] = useState([]);
  const [groups, setGroups] = useState(["default"]);
  const [newGroup, setNewGroup] = useState("");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [targetGroup, setTargetGroup] = useState("default");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [draggingQuoteId, setDraggingQuoteId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [q, g] = await Promise.all([api.get("/quotes"), api.get("/groups")]);
      setQuotes(q.data.quotes || []);
      const nextGroups = g.data.groups?.length ? g.data.groups : ["default"];
      setGroups(nextGroups);
      setTargetGroup((prev) => (nextGroups.includes(prev) ? prev : nextGroups[0]));
    } catch (err) {
      setError(formatApiError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    try {
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

  const moveQuoteToFolder = async (quoteId, folderName) => {
    const q = quotes.find((x) => x.id === quoteId);
    if (!q || (q.group_key || "default") === folderName) return;
    await api.post("/quotes/assign-group", {
      quote_ids: [quoteId],
      group_name: folderName,
    });
    await load();
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
                    </label>
                    <span className="library-quote-chip__hint" aria-hidden="true">
                      ⋮⋮
                    </span>
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
