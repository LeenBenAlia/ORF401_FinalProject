import React, { useCallback, useId, useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  Sphere,
  ZoomableGroup,
} from 'react-simple-maps';
import { geoInterpolate } from 'd3-geo';

/* Natural Earth 110m countries — real geography outlines (similar spirit to World Monitor flat map). */

const GEOGRAPHY_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const DEFAULT_ROUTES = [
  {
    id: 'sea',
    label: 'Ocean freight',
    from: { lng: 9.9937, lat: 53.5511 },
    to: { lng: -81.09, lat: 32.0809 },
    color: 'var(--route-sea)',
  },
  {
    id: 'air',
    label: 'Air cargo',
    from: { lng: 2.3522, lat: 48.8566 },
    to: { lng: -73.7781, lat: 40.6413 },
    color: 'var(--route-air)',
  },
  {
    id: 'land',
    label: 'Rail / truck',
    from: { lng: 21.0122, lat: 52.2297 },
    to: { lng: 4.4777, lat: 51.9244 },
    color: 'var(--route-land)',
  },
];

const DEFAULT_PORTS = [
  { lng: 9.9937, lat: 53.5511, label: 'Hamburg', type: 'port' },
  { lng: -81.09, lat: 32.0809, label: 'Savannah', type: 'port' },
  { lng: 2.3522, lat: 48.8566, label: 'Paris', type: 'port' },
  { lng: 126.978, lat: 37.5665, label: 'Seoul', type: 'port' },
];

const PROJECTIONS = [
  { id: 'geoEqualEarth', label: 'Equal Earth' },
  { id: 'geoNaturalEarth1', label: 'Natural Earth' },
  { id: 'geoMercator', label: 'Mercator' },
];

function greatCircleLineString(from, to, segments = 56) {
  const interpolate = geoInterpolate([from.lng, from.lat], [to.lng, to.lat]);
  return Array.from({ length: segments }, (_, i) => interpolate(i / (segments - 1)));
}

function WorldMapMonitor({
  originLabel = 'Origin',
  destLabel = 'You',
  activeRoute = 'sea',
  routes = DEFAULT_ROUTES,
  ports = DEFAULT_PORTS,
  conflictZones = [],
}) {
  const clipId = useId().replace(/:/g, '');
  const [layers, setLayers] = useState({
    countries: true,
    graticule: true,
    lanes: true,
    alerts: true,
    ports: true,
    labels: true,
  });
  const [projection, setProjection] = useState('geoEqualEarth');
  const [viewKey, setViewKey] = useState(0);

  const visibleRouteIds = useMemo(
    () => new Set(routes.filter((r) => r.id === activeRoute).map((r) => r.id)),
    [activeRoute, routes]
  );

  const routeArcs = useMemo(() => {
    return routes
      .filter((r) => visibleRouteIds.has(r.id))
      .map((r) => ({
        id: r.id,
        color: r.color,
        coordinates: greatCircleLineString(r.from, r.to),
      }));
  }, [routes, visibleRouteIds]);

  const toggleLayer = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const projectionConfig = useMemo(() => {
    const base = { center: [0, 12] };
    if (projection === 'geoMercator') {
      return { ...base, scale: 140 };
    }
    if (projection === 'geoNaturalEarth1') {
      return { ...base, scale: 200 };
    }
    return { ...base, scale: 200 };
  }, [projection]);

  return (
    <div className="world-monitor" role="region" aria-label="Supply route geographic map">
      <div className="world-monitor__hud">
        <span className="hud-pill">Live view</span>
        <span className="hud-pill hud-pill--dim">
          {originLabel} → {destLabel}
        </span>
        <span className="hud-pill hud-pill--hint">Scroll to zoom · drag to pan</span>
      </div>

      <div className="world-monitor__toolbar" role="toolbar" aria-label="Map display options">
        <span className="world-monitor__toolbar-label">Layers</span>
        {[
          { key: 'countries', label: 'Countries' },
          { key: 'graticule', label: 'Grid' },
          { key: 'lanes', label: 'Lanes' },
          { key: 'alerts', label: 'Alerts' },
          { key: 'ports', label: 'Ports' },
          { key: 'labels', label: 'Labels' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`world-monitor__toggle ${layers[key] ? 'is-on' : ''}`}
            aria-pressed={layers[key]}
            onClick={() => toggleLayer(key)}
          >
            {label}
          </button>
        ))}
        <span className="world-monitor__toolbar-divider" aria-hidden />
        <span className="world-monitor__toolbar-label">Projection</span>
        {PROJECTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`world-monitor__toggle world-monitor__toggle--proj ${projection === p.id ? 'is-on' : ''}`}
            aria-pressed={projection === p.id}
            onClick={() => setProjection(p.id)}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="world-monitor__reset" onClick={() => setViewKey((k) => k + 1)}>
          Reset view
        </button>
      </div>

      <div className="world-monitor__map-frame">
        <ComposableMap
          key={`${projection}-${viewKey}`}
          projection={projection}
          projectionConfig={projectionConfig}
          width={960}
          height={500}
          className="world-monitor__map-svg"
        >
          <ZoomableGroup center={[0, 12]} zoom={1} minZoom={0.65} maxZoom={10}>
            <Sphere id={clipId} fill="#020617" stroke="#1e293b" strokeWidth={0.6} />
            <g clipPath={`url(#${clipId})`}>
              {layers.graticule && (
                <Graticule
                  stroke="rgba(148, 163, 184, 0.22)"
                  strokeWidth={0.35}
                  step={[20, 20]}
                />
              )}
              <Geographies geography={GEOGRAPHY_URL}>
                {({ geographies }) =>
                  layers.countries
                    ? geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          className="world-monitor__land"
                          style={{
                            default: {
                              fill: 'rgba(15, 23, 42, 0.92)',
                              stroke: 'rgba(71, 85, 105, 0.85)',
                              strokeWidth: 0.35,
                              outline: 'none',
                            },
                            hover: {
                              fill: 'rgba(30, 58, 95, 0.95)',
                              stroke: 'rgba(94, 234, 212, 0.45)',
                              strokeWidth: 0.5,
                              outline: 'none',
                            },
                            pressed: {
                              fill: 'rgba(30, 41, 59, 0.95)',
                              stroke: 'rgba(148, 163, 184, 0.9)',
                              outline: 'none',
                            },
                          }}
                        />
                      ))
                    : null
                }
              </Geographies>
              {layers.lanes &&
                routeArcs.map((arc) => (
                  <Line
                    key={arc.id}
                    coordinates={arc.coordinates}
                    stroke={arc.color}
                    strokeWidth={1.35}
                    strokeLinecap="round"
                    fill="transparent"
                    className="world-monitor__lane"
                  />
                ))}
              {layers.alerts &&
                conflictZones.map((zone, index) => (
                  <Marker key={`zone-${zone.label}-${index}`} coordinates={[zone.lng, zone.lat]}>
                    <g className="world-monitor__alert">
                      <title>{zone.label}</title>
                      <circle r={7} fill="rgba(251, 113, 133, 0.35)" className="world-monitor__alert-pulse" />
                      <circle r={3.2} fill="rgba(251, 113, 133, 0.95)" />
                      <circle r={1.1} fill="#fff7ed" />
                    </g>
                    {layers.labels && (
                      <text
                        textAnchor="middle"
                        y={-11}
                        className="world-monitor__marker-label world-monitor__marker-label--alert"
                      >
                        {zone.label}
                      </text>
                    )}
                  </Marker>
                ))}
              {layers.ports &&
                ports.map((port) => (
                  <Marker key={`${port.label}-${port.lng}`} coordinates={[port.lng, port.lat]}>
                    <circle r={3.2} fill={port.type === 'port' ? '#34d399' : '#38bdf8'} stroke="#0f172a" strokeWidth={0.6} />
                    {layers.labels && (
                      <text x={5} y={3} className="world-monitor__marker-label">
                        {port.label}
                      </text>
                    )}
                  </Marker>
                ))}
            </g>
          </ZoomableGroup>
        </ComposableMap>
      </div>

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
