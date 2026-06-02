import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

// ── Authoritative coordinate map (declared first so it can be used everywhere) ──
const COUNTRY_COORDS = {
  US: { lat: 37.0902, lng: -95.7129 },
  IN: { lat: 20.5937, lng: 78.9629 },
  GB: { lat: 55.3781, lng: -3.4360 },
  DE: { lat: 51.1657, lng: 10.4515 },
  SG: { lat: 1.3521,  lng: 103.8198 },
  RU: { lat: 61.5240, lng: 105.3188 },
  CN: { lat: 35.8617, lng: 104.1954 },
  JP: { lat: 36.2048, lng: 138.2529 },
  AU: { lat: -25.2744, lng: 133.7751 },
  BR: { lat: -14.2350, lng: -51.9253 },
};

const GlobeMap = ({ arcsData, focusPoint }) => {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 20, lng: 78, altitude: 2.2 }, 3000);
    }
  }, []);

  useEffect(() => {
    if (focusPoint && globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({ lat: focusPoint.lat, lng: focusPoint.lng, altitude: 1.5 }, 1000);
      setTimeout(() => {
        if (globeEl.current) globeEl.current.controls().autoRotate = true;
      }, 5000);
    }
  }, [focusPoint]);

  // ── Build geographic labels from countryCoords (already declared above) ──
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const uniqueLabels = [];
  const seenCountries = new Set();

  // Always seed India as the host origin
  seenCountries.add('IN');
  uniqueLabels.push({ lat: COUNTRY_COORDS.IN.lat, lng: COUNTRY_COORDS.IN.lng, text: 'India' });

  arcsData.forEach(d => {
    const cc = d.country || d.Country;
    if (!cc || seenCountries.has(cc) || cc === 'Unknown') return;
    const coords = COUNTRY_COORDS[cc];
    if (!coords) return; // skip any code not in our map
    seenCountries.add(cc);
    let fullName = cc;
    try { if (cc.length === 2) fullName = regionNames.of(cc); } catch (e) {}
    uniqueLabels.push({ lat: coords.lat, lng: coords.lng, text: fullName });
  });

  return (
    <div className="globe-container">
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        arcsData={arcsData}
        arcStartLat={() => COUNTRY_COORDS.IN.lat}
        arcStartLng={() => COUNTRY_COORDS.IN.lng}
        arcEndLat={d => {
          const cc = d.country || d.Country;
          return d.endLat || (COUNTRY_COORDS[cc] ? COUNTRY_COORDS[cc].lat : 0);
        }}
        arcEndLng={d => {
          const cc = d.country || d.Country;
          return d.endLng || (COUNTRY_COORDS[cc] ? COUNTRY_COORDS[cc].lng : 0);
        }}
        arcColor={d => {
          const sev = d.severity || d.Status || '';
          return (sev === 'THREAT' || sev === 'ALERT') ? '#ef4444' : '#06b6d4';
        }}
        arcAltitude={0.2}
        arcDashLength={0.5}
        arcDashGap={1}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={2000}
        arcsTransitionDuration={0}

        labelsData={uniqueLabels}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={d => d.text}
        labelSize={1.2}
        labelDotRadius={0.5}
        labelColor={() => 'white'}
        labelResolution={2}
      />
    </div>
  );
};

export default GlobeMap;
