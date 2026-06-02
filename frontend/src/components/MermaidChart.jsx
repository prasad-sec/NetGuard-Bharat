import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', suppressErrorRendering: true });

const sanitizeChartString = (rawChart) => {
  if (!rawChart) return '';
  
  // 1. Strip out markdown code block backticks
  let sanitized = rawChart
    .replace(/```mermaid/gi, '')
    .replace(/```/g, '')
    .trim();

  // 2. Enforce strict minimalist syntax for pie chart
  if (sanitized.toLowerCase().startsWith('pie') || sanitized.toLowerCase().includes('\npie')) {
    const lines = sanitized.split('\n');
    const parsedData = [];
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Skip pie or title lines
      if (trimmedLine.toLowerCase().startsWith('pie')) continue;
      if (trimmedLine.toLowerCase().startsWith('title')) continue;
      
      // Extract label and integer. E.g., "SAFE" : 35 or SAFE: 35 or "SAFE" 35
      const rowMatch = trimmedLine.match(/"?([^":\d]+)"?\s*:\s*(\d+)/) || trimmedLine.match(/"?([^"\s\d]+)"?\s+(\d+)/);
      if (rowMatch) {
        const label = rowMatch[1].trim().replace(/['"]/g, '');
        const value = parseInt(rowMatch[2], 10);
        parsedData.push(`"${label}" : ${value}`);
      }
    }
    
    if (parsedData.length === 0) {
      parsedData.push(`"SAFE" : 1`);
    }

    sanitized = `pie title Threat Distribution\n` + parsedData.join('\n');
  }

  return sanitized;
};

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
        const sanitizedChart = sanitizeChartString(chart);
        const { svg } = await mermaid.render(id, sanitizedChart);
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
