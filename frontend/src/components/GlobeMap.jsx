import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

const GlobeMap = ({ arcsData, focusPoint }) => {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Initial camera position & auto-rotation
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

  const uniqueLabels = [];
  const seenCountries = new Set();
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

  arcsData.forEach(d => {
    if (!seenCountries.has(d.country) && d.country !== 'Unknown') {
      seenCountries.add(d.country);
      let fullName = d.country;
      try {
        if (d.country.length === 2) {
          fullName = regionNames.of(d.country);
        }
      } catch (e) {}
      uniqueLabels.push({ lat: d.endLat, lng: d.endLng, text: fullName });
    }
  });

  // Inject host origin label
  uniqueLabels.push({ lat: 20.5937, lng: 78.9629, text: 'India' });

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
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.severity === 'THREAT' ? '#ef4444' : (d.severity === 'NOISE' ? '#64748b' : '#06b6d4')}
        arcAltitude={d => 0.1 + Math.random() * 0.2}
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
