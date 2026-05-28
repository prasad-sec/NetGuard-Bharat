import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidChart = React.memo(({ chart }) => {
  const containerRef = useRef(null);
  const hasRendered = useRef(false);

  useEffect(() => { 
    hasRendered.current = false; 
  }, [chart]);

  useEffect(() => {
    if (hasRendered.current) return;
    hasRendered.current = true;

    let isMounted = true;
    const renderGraph = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = '<span class="text-red-500 text-sm">Mermaid Syntax Error</span>';
        }
      }
    };
    
    renderGraph();
    
    return () => { isMounted = false; };
  }, [chart]);

  return <div ref={containerRef} className="mermaid-wrapper" />;
});

export default MermaidChart;
