import React, { useEffect, useState } from "react";
import api, { formatApiError } from "../api";

function QuoteLibrary() {
  const [quotes, setQuotes] = useState([]);
  const [groups, setGroups] = useState(["default"]);
  const [newGroup, setNewGroup] = useState("");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [targetGroup, setTargetGroup] = useState("default");
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      setError("");
      const [q, g] = await Promise.all([api.get("/quotes"), api.get("/groups")]);
      setQuotes(q.data.quotes || []);
      setGroups(g.data.groups || ["default"]);
      if ((g.data.groups || []).length) {
        setTargetGroup(g.data.groups[0]);
      }
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    await api.post("/groups", { name: newGroup.trim() });
    setNewGroup("");
    await load();
  };

  const assignGroup = async () => {
    if (!selectedQuoteIds.length) return;
    await api.post("/quotes/assign-group", {
      quote_ids: selectedQuoteIds,
      group_name: targetGroup,
    });
    setSelectedQuoteIds([]);
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

  const filteredGrouped = Object.entries(grouped).reduce((acc, [groupName, items]) => {
    if (activeGroup !== "all" && groupName !== activeGroup) {
      return acc;
    }
    const filtered = items.filter((q) => q.filename.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length) {
      acc[groupName] = filtered;
    }
    return acc;
  }, {});

  return (
    <section className="panel quote-library">
      <h2>Past uploads and quote folders</h2>
      <p className="muted">Create subfolder-like groups and move old quotes between them.</p>
      {error && <p className="error-text">{error}</p>}

      <div className="upload-row">
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New folder name"
        />
        <button type="button" onClick={createGroup}>Create folder</button>
      </div>

      <div className="upload-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search filename"
        />
        <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button type="button" onClick={assignGroup} disabled={!selectedQuoteIds.length}>
          Move selected quotes
        </button>
      </div>

      <div className="group-filter-row">
        <button
          type="button"
          className={activeGroup === "all" ? "chip chip--active" : "chip"}
          onClick={() => setActiveGroup("all")}
        >
          All ({quotes.length})
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            className={activeGroup === g ? "chip chip--active" : "chip"}
            onClick={() => setActiveGroup(g)}
          >
            {g} ({grouped[g]?.length || 0})
          </button>
        ))}
      </div>

      <div className="library-groups">
        {Object.keys(filteredGrouped).length === 0 && <p className="muted">No matching uploaded quotes.</p>}
        {Object.entries(filteredGrouped).map(([group, items]) => (
          <article key={group} className="group-folder">
            <h3>{group}</h3>
            <ul>
              {items.map((q) => (
                <li key={q.id}>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedQuoteIds.includes(q.id)}
                      onChange={() => toggleQuote(q.id)}
                    />
                    #{q.id} {q.filename} ({q.source_type || "file"})
                  </label>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default QuoteLibrary;
