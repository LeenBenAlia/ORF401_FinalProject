import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

const COUNTRY_COORDS = {
  Germany: { lat: 51.1657, lng: 10.4515 },
  China: { lat: 35.8617, lng: 104.1954 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  USA: { lat: 39.8283, lng: -98.5795 },
};

function RiskGlobe({ originCountry = "Germany", destinationCountry = "USA", routeType = "sea" }) {
  const globeRef = useRef();
  const cloudsRef = useRef();
  const rafRef = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const origin = COUNTRY_COORDS[originCountry] || COUNTRY_COORDS.Germany;
  const destination = COUNTRY_COORDS[destinationCountry] || COUNTRY_COORDS.USA;

  const arcs = useMemo(
    () => {
      const activeColor =
        routeType === "air"
          ? ["#99f6e4", "#14b8a6"]
          : routeType === "land"
            ? ["#c4b5fd", "#8b5cf6"]
            : ["#7dd3fc", "#0ea5e9"];
      return [
        {
          startLat: origin.lat,
          startLng: origin.lng,
          endLat: destination.lat,
          endLng: destination.lng,
          color: activeColor,
          altitude: 0.28,
          stroke: 1.1,
        },
        {
          startLat: origin.lat + 2.5,
          startLng: origin.lng - 3.0,
          endLat: destination.lat - 1.8,
          endLng: destination.lng + 4.0,
          color: ["rgba(148, 163, 184, 0.45)", "rgba(59, 130, 246, 0.35)"],
          altitude: 0.2,
          stroke: 0.55,
        },
      ];
    },
    [origin, destination, routeType]
  );

  const points = useMemo(
    () => [
      { ...origin, size: 0.45, color: "#34d399", label: `Origin: ${originCountry}` },
      { ...destination, size: 0.45, color: "#60a5fa", label: `Destination: ${destinationCountry}` },
    ],
    [origin, destination, originCountry, destinationCountry]
  );

  const labels = useMemo(
    () => [
      { lat: origin.lat, lng: origin.lng, text: `Origin · ${originCountry}` },
      { lat: destination.lat, lng: destination.lng, text: `Destination · ${destinationCountry}` },
    ],
    [origin, destination, originCountry, destinationCountry]
  );

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((res) => res.json())
      .then(setCountries)
      .catch(() => setCountries({ features: [] }));
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 175;
    controls.maxDistance = 340;
    globeRef.current.pointOfView({ lat: 20, lng: -25, altitude: 2.05 }, 900);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    const globeRadius = globeRef.current.getGlobeRadius();

    const cloudsGeometry = new THREE.SphereGeometry(globeRadius * 1.01, 75, 75);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load("//unpkg.com/three-globe/example/img/earth-clouds.png"),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    cloudsRef.current = cloudsMesh;
    scene.add(cloudsMesh);

    const animate = () => {
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += 0.00055;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cloudsRef.current) {
        scene.remove(cloudsRef.current);
        cloudsRef.current.geometry.dispose();
        cloudsRef.current.material.dispose();
        cloudsRef.current = null;
      }
    };
  }, []);

  return (
    <div className="risk-globe-wrap">
      <div className="risk-globe-hud">
        <span className="risk-globe-hud__badge">World monitor</span>
        <span className="risk-globe-hud__route">{originCountry} to {destinationCountry}</span>
      </div>
      <Globe
        ref={globeRef}
        width={900}
        height={420}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="rgba(0,0,0,0)"
        polygonsData={countries.features}
        polygonCapColor={() => "rgba(56, 189, 248, 0.12)"}
        polygonSideColor={() => "rgba(30, 41, 59, 0.2)"}
        polygonStrokeColor={() => "rgba(148, 163, 184, 0.25)"}
        polygonsTransitionDuration={300}
        arcsData={arcs}
        arcColor="color"
        arcAltitude={(d) => d.altitude}
        arcStroke={(d) => d.stroke}
        arcDashLength={0.35}
        arcDashGap={0.22}
        arcDashAnimateTime={2200}
        pointsData={points}
        pointAltitude={0.03}
        pointRadius="size"
        pointColor="color"
        pointLabel="label"
        labelsData={labels}
        labelText="text"
        labelSize={1.6}
        labelDotRadius={0.26}
        labelColor={() => "#dbeafe"}
        labelResolution={2}
        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.16}
      />
    </div>
  );
}

export default RiskGlobe;
