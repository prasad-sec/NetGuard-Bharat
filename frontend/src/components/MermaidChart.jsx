import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', suppressErrorRendering: true });

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

  const downloadPNG = () => {
    const svgNode = containerRef.current.querySelector('svg');
    if (!svgNode) return;
    
    const svgData = new XMLSerializer().serializeToString(svgNode);
    const canvas = document.createElement('canvas');
    const svgSize = svgNode.getBoundingClientRect();
    canvas.width = svgSize.width * 2;
    canvas.height = svgSize.height * 2;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))));
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const a = document.createElement('a');
      a.download = `threat_diagram_${new Date().getTime()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
  };

  return (
    <div className="mermaid-wrapper" style={{ position: 'relative', backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px' }}>
      <div ref={containerRef} />
      <button 
        onClick={downloadPNG}
        className="action-btn text-[10px]"
        style={{ position: 'absolute', top: '4px', right: '4px', padding: '2px 6px', background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.3)', color: '#d8b4fe' }}
        title="Download Diagram as PNG"
      >
        ⬇ PNG
      </button>
    </div>
  );
});

export default MermaidChart;
