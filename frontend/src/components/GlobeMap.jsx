import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

// ── Authoritative coordinate map (declared first so it can be used everywhere) ──
const COUNTRY_COORDS = {
  'United States': [37.09, -95.71],
  'India': [20.59, 78.96],
  'China': [35.86, 104.19],
  'Russia': [61.52, 105.31],
  'United Kingdom': [55.37, -3.43],
  'Germany': [51.16, 10.45],
  'Singapore': [1.35, 103.81]
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
  seenCountries.add('India');
  uniqueLabels.push({ lat: COUNTRY_COORDS['India'][0], lng: COUNTRY_COORDS['India'][1], text: 'India' });

  arcsData.forEach(d => {
    const cc = d.country || d.Country;
    if (!cc || seenCountries.has(cc) || cc === 'Unknown') return;
    const coords = COUNTRY_COORDS[cc];
    if (!coords) return; // skip any code not in our map
    seenCountries.add(cc);
    let fullName = cc;
    try { if (cc.length === 2) fullName = regionNames.of(cc); } catch (e) {}
    uniqueLabels.push({ lat: coords[0], lng: coords[1], text: fullName });
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
        arcStartLat={() => COUNTRY_COORDS['India'][0]}
        arcStartLng={() => COUNTRY_COORDS['India'][1]}
        arcEndLat={d => {
          const cc = d.country || d.Country;
          const baseLat = COUNTRY_COORDS[cc] ? COUNTRY_COORDS[cc][0] : 0;
          return d.endLat || (baseLat + (Math.random() * 6 - 3));
        }}
        arcEndLng={d => {
          const cc = d.country || d.Country;
          const baseLng = COUNTRY_COORDS[cc] ? COUNTRY_COORDS[cc][1] : 0;
          return d.endLng || (baseLng + (Math.random() * 6 - 3));
        }}
        arcColor={d => {
          const sev = d.severity || d.Status || '';
          return (sev === 'THREAT' || sev === 'ALERT') ? '#ef4444' : '#06b6d4';
        }}
        arcAltitude={() => Math.random() * 0.4 + 0.1}
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
