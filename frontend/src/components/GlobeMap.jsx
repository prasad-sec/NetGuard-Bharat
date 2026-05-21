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
        arcsTransitionDuration={0} // No transition for instantaneous lasers
      />
    </div>
  );
};

export default GlobeMap;
