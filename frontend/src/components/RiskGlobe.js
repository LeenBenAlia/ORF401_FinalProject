import React, { useEffect, useMemo, useRef } from "react";
import Globe from "react-globe.gl";

const COUNTRY_COORDS = {
  Germany: { lat: 51.1657, lng: 10.4515 },
  China: { lat: 35.8617, lng: 104.1954 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  USA: { lat: 39.8283, lng: -98.5795 },
};

function RiskGlobe({ originCountry = "Germany", destinationCountry = "USA", routeType = "sea" }) {
  const globeRef = useRef();
  const origin = COUNTRY_COORDS[originCountry] || COUNTRY_COORDS.Germany;
  const destination = COUNTRY_COORDS[destinationCountry] || COUNTRY_COORDS.USA;

  const arcs = useMemo(
    () => [
      {
        startLat: origin.lat,
        startLng: origin.lng,
        endLat: destination.lat,
        endLng: destination.lng,
        color: routeType === "air" ? ["#5eead4", "#2dd4bf"] : routeType === "land" ? ["#a78bfa", "#8b5cf6"] : ["#38bdf8", "#0ea5e9"],
      },
    ],
    [origin, destination, routeType]
  );

  const points = useMemo(
    () => [
      { ...origin, size: 0.45, color: "#34d399", label: `Origin: ${originCountry}` },
      { ...destination, size: 0.45, color: "#60a5fa", label: `Destination: ${destinationCountry}` },
    ],
    [origin, destination, originCountry, destinationCountry]
  );

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = true;
    controls.minDistance = 160;
    controls.maxDistance = 350;
    globeRef.current.pointOfView({ lat: 18, lng: -20, altitude: 2.1 }, 900);
  }, []);

  return (
    <div className="risk-globe-wrap">
      <Globe
        ref={globeRef}
        width={900}
        height={420}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="rgba(0,0,0,0)"
        arcsData={arcs}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.1}
        arcDashAnimateTime={2200}
        arcStroke={0.8}
        arcAltitude={0.25}
        pointsData={points}
        pointAltitude={0.03}
        pointRadius="size"
        pointColor="color"
        pointLabel="label"
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.12}
      />
    </div>
  );
}

export default RiskGlobe;
