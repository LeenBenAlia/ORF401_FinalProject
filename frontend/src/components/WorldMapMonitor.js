import React, { useMemo } from 'react';

/* Stylized "world monitor" view: abstract map + route arcs. No third-party map deps. */

const DEFAULT_ROUTES = [
  { id: 'sea', label: 'Ocean freight', from: { x: 22, y: 42 }, to: { x: 78, y: 38 }, color: 'var(--route-sea)' },
  { id: 'air', label: 'Air cargo', from: { x: 30, y: 35 }, to: { x: 75, y: 32 }, color: 'var(--route-air)' },
  { id: 'land', label: 'Rail / truck', from: { x: 48, y: 30 }, to: { x: 55, y: 48 }, color: 'var(--route-land)' },
];

const DEFAULT_PORTS = [
  { x: 22, y: 42, label: 'Hamburg', type: 'port' },
  { x: 78, y: 38, label: 'Savannah', type: 'port' },
  { x: 30, y: 35, label: 'Paris', type: 'port' },
  { x: 55, y: 48, label: 'Rotterdam', type: 'port' },
];

function buildPath(from, to) {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 12;
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

function WorldMapMonitor({
  originLabel = 'Origin',
  destLabel = 'You',
  activeRoute = 'sea',
  routes = DEFAULT_ROUTES,
  ports = DEFAULT_PORTS,
  conflictZones = [],
}) {
  const visible = useMemo(
    () => new Set(routes.filter((r) => r.id === activeRoute).map((r) => r.id)),
    [activeRoute, routes]
  );

  return (
    <div className="world-monitor" role="img" aria-label="Supply route monitor">
      <div className="world-monitor__hud">
        <span className="hud-pill">Live view</span>
        <span className="hud-pill hud-pill--dim">{originLabel} → {destLabel}</span>
      </div>
      <svg className="world-monitor__svg" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ocean" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="60" fill="url(#ocean)" rx="1" />
        <ellipse cx="24" cy="38" rx="14" ry="9" fill="#1e3a4a" opacity="0.5" />
        <ellipse cx="78" cy="36" rx="12" ry="8" fill="#1e3a4a" opacity="0.45" />
        <ellipse cx="52" cy="28" rx="10" ry="6" fill="#1a3342" opacity="0.4" />
        {conflictZones.map((zone, index) => (
          <g key={`zone-${index}`}>
            <circle cx={zone.x} cy={zone.y} r="3.5" fill="rgba(250, 101, 101, 0.8)" />
            <circle cx={zone.x} cy={zone.y} r="1.2" fill="#fee2e2" />
          </g>
        ))}
        {routes.map((route) => {
          if (!visible.has(route.id)) return null;
          return (
            <path
              key={route.id}
              d={buildPath(route.from, route.to)}
              fill="none"
              stroke={route.color}
              strokeWidth="0.5"
              strokeLinecap="round"
              filter="url(#glow)"
              className="world-monitor__arc"
            />
          );
        })}
        {ports.map((port) => (
          <g key={`${port.label}-${port.x}-${port.y}`}>
            <circle cx={port.x} cy={port.y} r="1.6" fill={port.type === 'port' ? '#34d399' : '#38bdf8'} />
            <text x={port.x + 2.2} y={port.y + 0.8} fontSize="2.8" fill="#e2e8f0">{port.label}</text>
          </g>
        ))}
        <line x1="0" y1="52" x2="100" y2="52" stroke="#334155" strokeWidth="0.08" opacity="0.5" />
      </svg>
      <ul className="world-monitor__legend" aria-label="Route types and hotspots">
        {routes.map((r) => (
          <li key={r.id} className={r.id === activeRoute ? 'is-active' : undefined}>
            <span className="legend-swatch" style={{ background: r.color }} />
            {r.label}
          </li>
        ))}
        {conflictZones.length > 0 && (
          <li className="conflict-legend">
            <span className="legend-swatch" style={{ background: '#fb7185' }} />
            Conflict hotspot
          </li>
        )}
      </ul>
    </div>
  );
}

export default WorldMapMonitor;
