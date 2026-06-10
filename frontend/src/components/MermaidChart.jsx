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

  useEffect(() => {
    try {
      mermaid.contentLoaded();
    } catch (err) {
      console.error("Mermaid contentLoaded error:", err);
    }
  }, [chart]);

  const sanitizedChart = sanitizeChartString(chart);

  return (
    <div className="mermaid-wrapper" style={{ position: 'relative', backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px' }}>
      <pre className="mermaid" ref={containerRef}>
        {sanitizedChart}
      </pre>
    </div>
  );
});

export default MermaidChart;
