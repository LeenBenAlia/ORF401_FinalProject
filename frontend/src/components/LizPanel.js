import React, { useState, useRef, useEffect } from 'react';

const DEMO_REPLY = (product, material, country) => {
  const p = product || 'This line item';
  const m = material || 'material';
  const c = country || 'origin';
  return (
    `${p} — ${m} from ${c}.\n\n` +
    '• Export read: align HS / origin docs with your baseline.\n' +
    '• Material: confirm grade, purity, and spec gaps vs. internal std.\n' +
    '• Logistics: ocean is usually $/kg best; use air for time-critical only.\n\n' +
    'BlaiseAI Liz — demo summary. Wire live RAG for your documents.'
  );
};

function LizPanel({ product, material, country }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'liz', text: 'Select a part from your digitized quotes. I can summarize export and material context in plain language.' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const pushSummary = () => {
    setMessages((m) => [...m, { role: 'liz', text: DEMO_REPLY(product, material, country) }]);
  };

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'liz', text: DEMO_REPLY(product, material, country) }]);
    }, 500);
  };

  if (!open) {
    return (
      <button type="button" className="liz-fab" onClick={() => setOpen(true)} aria-label="Open Liz">
        Liz
      </button>
    );
  }

  return (
    <aside className="liz-panel" aria-label="Liz AI assistant">
      <div className="liz-panel__head">
        <div>
          <span className="liz-panel__name">Liz</span>
          <span className="liz-panel__sub">BlaiseAI · import &amp; material context</span>
        </div>
        <button type="button" className="liz-panel__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>
      <div className="liz-panel__chips">
        <button type="button" className="chip" onClick={pushSummary}>Summarize selection</button>
        <button type="button" className="chip" onClick={() => setMessages((m) => [...m, { role: 'liz', text: 'Tip: open tariff report links below, then ask me to interpret a score in one sentence.' }])}>
          How to read tariff score
        </button>
      </div>
      <div className="liz-panel__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`liz-msg liz-msg--${msg.role}`}>
            {msg.text.split('\n').map((line, j) => (
              line ? <p key={j}>{line}</p> : <br key={j} />
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="liz-panel__input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask Liz about the product, route, or tariffs…"
        />
        <button type="button" className="btn btn--primary" onClick={send}>Send</button>
      </div>
    </aside>
  );
}

export default LizPanel;
