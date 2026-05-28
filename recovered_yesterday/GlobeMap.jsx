import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

const GlobeMap = ({ arcsData, labelsData = [], focusPoint }) => {
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
        // ── Arc layer ──
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
        // ── Permanent aggregated destination labels ──
        labelsData={labelsData}
        labelLat={d => d.target_lat}
        labelLng={d => d.target_lng}
        labelText={d => d.country_name ? d.country_name.toUpperCase() : d.country_code}
        labelSize={(d) => d.isOrigin ? 1.3 : 1.1}
        labelDotRadius={0.4}
        labelColor={(d) => d.isOrigin ? 'rgba(255, 255, 255, 0.95)' : (d.severity === 'THREAT' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(6, 182, 212, 0.7)')}
        labelResolution={3}
        labelAltitude={0.01}
      />
    </div>
  );
};

export default React.memo(GlobeMap, (prevProps, nextProps) => {
  // Only re-render the WebGL globe if arc count, label count, or focus changes.
  return (
    prevProps.arcsData.length === nextProps.arcsData.length &&
    prevProps.labelsData.length === nextProps.labelsData.length &&
    prevProps.focusPoint === nextProps.focusPoint
  );
});
