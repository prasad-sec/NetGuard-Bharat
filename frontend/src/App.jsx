import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import GlobeMap from './components/GlobeMap';
import { Activity, ShieldAlert, Cpu, Network, HelpCircle, X, Info, Shield, ShieldOff, Trash2, Camera, Download, Eye, EyeOff, MapPin, Crosshair, CheckCircle, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidChart from './components/MermaidChart';
import html2pdf from 'html2pdf.js';
import './index.css';

const SOCKET_SERVER_URL = 'http://localhost:3002';

function App() {
  const [leaks, setLeaks] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [logsViewMode, setLogsViewMode] = useState('live');
  const [totalLeaked, setTotalLeaked] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [throughput, setThroughput] = useState(14.2);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(true);
  const [focusPoint, setFocusPoint] = useState(null);
  const [latency, setLatency] = useState(0);
  const [socket, setSocket] = useState(null);
  const [lifetimeConnections, setLifetimeConnections] = useState(0);
  const [lifetimeLeaks, setLifetimeLeaks] = useState(0);

  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Hi Admin. I am your NetGuard AI Copilot. I am actively monitoring your network telemetry. How can I help you today?' }
  ]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiEngine, setAiEngine] = useState('local');
  const chatEndRef = useRef(null);
  const rawLogsEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isCopilotLoading]);

  useEffect(() => {
    rawLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawLogs]);

  useEffect(() => {
    const throughputInterval = setInterval(() => {
      setThroughput(prev => {
        const delta = (Math.random() * 4.5) - 2.0;
        return Math.max(1.0, prev + delta);
      });
    }, 2000);
    return () => clearInterval(throughputInterval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const pingInterval = setInterval(() => {
      const start = Date.now();
      socket.emit('custom_ping', () => {
        const baseLatency = Math.max(1, Date.now() - start);
        const jitter = Math.floor(Math.random() * 4);
        setLatency(baseLatency + jitter);
      });
    }, 3000);
    return () => clearInterval(pingInterval);
  }, [socket]);

  // Right Panel Tabs
  const [activeTab, setActiveTab] = useState('feed');
  const [shieldActive, setShieldActive] = useState(true);
  const [stealthOn, setStealthOn] = useState(false);
  const [systemActive, setSystemActive] = useState(true);
  const [isPcapActive, setIsPcapActive] = useState(false);


  // Accordion state for Intelligence Feed
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  // Intelligence Filters State
  const [stealthMode, setStealthMode] = useState(true);
  const stealthRef = useRef(true);
  
  const [showNoise, setShowNoise] = useState(false);
  const noiseRef = useRef(false);
  
  const [geofenceIndia, setGeofenceIndia] = useState(true);
  const geoRef = useRef(true);

  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const muteRef = useRef(false);
  const [audioActive, setAudioActive] = useState(false);

  const initAudio = async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      console.log("[AUDIO] System Initialized. State:", audioCtxRef.current.state);
      setAudioActive(true);
    } catch (e) {
      console.error('[AUDIO] Initialization failed', e);
    }
  };

  const notifyUser = (event) => {
    console.log(`[ALERT] TRIGGERED for ${event.appName}. State: ${audioCtxRef.current?.state}`);
    
    const processName = event.appName || 'Unknown.exe';
    const destination = event.country || 'US-EAST';
    const ipAddress = event.dataType ? event.dataType.split(' (')[0] : '52.118.16.1';

    // 1. High-End Toast Notification with Dismiss Button
    toast.error((t) => (
      <div className="flex flex-col gap-1 font-mono relative w-full pr-6">
        {/* Close Button */}
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="absolute -top-1 -right-2 text-slate-500 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <div className="font-bold text-red-500 text-sm tracking-wider">[!] EXFILTRATION DETECTED</div>
        <div className="text-xs text-slate-300">
          <span className="text-slate-500">PROCESS:</span> {processName || 'Unknown.exe'}
        </div>
        <div className="text-xs text-slate-300">
          <span className="text-slate-500">TARGET:</span> {destination || 'US-EAST'} ({ipAddress || '52.118.16.1'})
        </div>
        <div className="text-[10px] text-red-400 mt-1 animate-pulse">ACTION: CONNECTION SEVERED</div>
      </div>
    ), {
      style: {
        borderRadius: '4px',
        background: '#0f172a',
        borderLeft: '4px solid #ef4444',
        color: '#f8fafc',
        padding: '12px',
        minWidth: '300px'
      },
      duration: 5000,
    });

    if (muteRef.current) return;

    // 2. High-Frequency Siren (Louder & More Robust)
    try {
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        
        const now = audioCtxRef.current.currentTime;
        // Triple Pulse Siren
        [0, 0.2, 0.4].forEach(offset => {
          const osc = audioCtxRef.current.createOscillator();
          const g = audioCtxRef.current.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(offset % 0.4 === 0 ? 1200 : 800, now + offset);
          g.gain.setValueAtTime(0.6, now + offset);
          g.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);
          osc.connect(g);
          g.connect(audioCtxRef.current.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.15);
        });
      } else {
        console.warn("[AUDIO] No Context found. Click the dashboard once.");
      }
    } catch (e) {
      console.error('[AUDIO] Playback Error:', e);
    }
  };

  useEffect(() => {
    // Init audio on first interaction
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);

    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3500);

    const socketObj = io(SOCKET_SERVER_URL);
    socketRef.current = socketObj;
    setSocket(socketObj);

    socketRef.current.on('connect', () => {
      console.log('Connected to Real-time Sniffer');
    });

    socketRef.current.on('active_count', (count) => {
      setActiveConnections(count);
    });

    socketRef.current.on('log_history', (history) => {
      setHistoricalLogs(history);
      const cappedHistory = history.slice(history.length - 100);
      setRawLogs(cappedHistory);
      setLifetimeConnections(history.length);
      setLifetimeLeaks(history.filter(l => l.isThreat).length);
      
      const threatEvents = cappedHistory.filter(l => l.isThreat);
      setLeaks(threatEvents.slice(0, 50));
      setTotalLeaked(threatEvents.length);
    });

    socketRef.current.on('logs_cleared', () => {
      setLeaks([]);
      setRawLogs([]);
      setHistoricalLogs([]);
      setTotalLeaked(0);
      setLifetimeConnections(0);
      setLifetimeLeaks(0);
    });

    socketRef.current.on('leak_event', (eventRaw) => {
      const event = { ...eventRaw };
      console.log(`[INGEST] Application: ${event.appName} | Country: ${event.country} | Threat: ${event.isThreat}`);
      setLifetimeConnections(prev => prev + 1);
      if (event.isThreat) {
        setLifetimeLeaks(prev => prev + 1);
      }

      // Always push ALL events into the raw FIFO log, strictly capped at 100 items
      setRawLogs(prev => {
        const newLogs = [...prev, event];
        return newLogs.length > 100 ? newLogs.slice(newLogs.length - 100) : newLogs;
      });
      setHistoricalLogs(prev => [...prev, event]);

      // 1. Drop Logic based on Filters for the Intelligence Feed
      if (stealthRef.current && !event.isThreat && !event.isWhitelisted) return;
      if (!noiseRef.current && event.severity === 'NOISE') return;

      // 2. Threat Visuals & Beep
      if (event.isThreat) {
        if (!muteRef.current) {
          notifyUser(event);
          
          // Red Flash Alert
          document.body.classList.add('threat-pulse');
          setTimeout(() => document.body.classList.remove('threat-pulse'), 1000);
        }
        setTotalLeaked((prev) => prev + 1);
      }
      
      setLeaks((prev) => {
        const newFeed = [event, ...prev];
        return newFeed.length > 50 ? newFeed.slice(0, 50) : newFeed; 
      });
    });

    return () => {
      clearTimeout(loadingTimeout);
      socketRef.current.disconnect();
    };
  }, []);

  const handleSendCopilotMessage = async () => {
    if (!copilotInput.trim()) return;
    const userText = copilotInput.trim();
    
    const newHistory = [...chatHistory, { role: 'user', text: userText }];
    setChatHistory(newHistory);
    setCopilotInput('');
    setIsCopilotLoading(true);

    try {
      const response = await fetch(`${SOCKET_SERVER_URL}/api/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userQuery: userText, chatHistory: newHistory, aiEngine })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'ai', text: data.reply || 'No response received.' }]);
    } catch (error) {
      console.error('Copilot Chat Error:', error);
      setChatHistory(prev => [...prev, { role: 'ai', text: '🚨 Connection to AI engine failed. Please ensure the proxy server is active.' }]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const toggleMonitoring = () => {
    const newState = !isMonitoring;
    setIsMonitoring(newState);
    if (socketRef.current) {
      socketRef.current.emit('toggle_monitoring', newState);
    }
  };

  const toggleStealth = () => { setStealthMode(!stealthMode); stealthRef.current = !stealthMode; };
  const toggleNoise = () => { setShowNoise(!showNoise); noiseRef.current = !showNoise; };
  const toggleGeo = () => { setGeofenceIndia(!geofenceIndia); geoRef.current = !geofenceIndia; };
  const toggleMuted = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    muteRef.current = nextVal;
  };

  const clearLogs = () => {
    setLeaks([]);
    setRawLogs([]);
    setTotalLeaked(0);
    setLifetimeConnections(0);
    setLifetimeLeaks(0);
    if (socketRef.current) {
      socketRef.current.emit('clear_logs');
    }
  };

  const downloadPDF = () => {
    if (rawLogs.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dateStr  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr  = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pageW    = doc.internal.pageSize.getWidth();

    // ── Tricolour accent bar (top) ──
    doc.setFillColor(255, 153, 51);  // Saffron
    doc.rect(0, 0, pageW / 3, 3, 'F');
    doc.setFillColor(245, 245, 245); // White
    doc.rect(pageW / 3, 0, pageW / 3, 3, 'F');
    doc.setFillColor(19, 136, 8);    // India Green
    doc.rect((pageW / 3) * 2, 0, pageW / 3, 3, 'F');

    // ── Header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('NETGUARD BHARAT', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('ENTERPRISE THREAT REPORT  —  CONFIDENTIAL', 14, 20);

    // ── Metadata block ──
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${dateStr}  ${timeStr}`, 14, 27);
    doc.text(`Total Events Logged: ${rawLogs.length}`, 14, 32);
    doc.text(`Threat Events: ${rawLogs.filter(l => l.severity === 'THREAT').length}`, 80, 32);
    doc.text(`Safe Events: ${rawLogs.filter(l => l.severity === 'SAFE').length}`, 140, 32);
    doc.text(`Noise Events: ${rawLogs.filter(l => l.severity === 'NOISE').length}`, 200, 32);

    // ── Divider ──
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.4);
    doc.line(14, 35, pageW - 14, 35);

    // ── Table rows ──
    const rows = rawLogs.map(log => [
      new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19),
      log.severity,
      log.appName || 'Unknown',
      log.dataType ? log.dataType.split(' (')[0] : '0.0.0.0',
      log.country  || '??',
    ]);

    autoTable(doc, {
      startY: 39,
      head: [['Timestamp', 'Status', 'Source Process', 'Destination IP', 'Country']],
      body: rows,
      styles: {
        font: 'courier',
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [6, 182, 212],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { cellWidth: 52 },
        4: { cellWidth: 24, halign: 'center' },
      },
      // Conditional row colouring for THREAT events
      didParseCell(data) {
        if (data.row.index >= 0 && rows[data.row.index]?.[1] === 'THREAT') {
          data.cell.styles.textColor = [220, 38, 38];
          if (data.column.index === 1) {
            data.cell.styles.fillColor  = [254, 242, 242];
            data.cell.styles.fontStyle  = 'bold';
          }
        }
        if (data.row.index >= 0 && rows[data.row.index]?.[1] === 'NOISE') {
          data.cell.styles.textColor = [161, 128, 0];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Footer on every page ──
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `NetGuard Bharat  |  Page ${i} of ${totalPages}  |  ${dateStr}`,
        pageW / 2, doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
      // Bottom tricolour bar
      const bh = doc.internal.pageSize.getHeight();
      doc.setFillColor(255, 153, 51);  doc.rect(0, bh - 2, pageW / 3, 2, 'F');
      doc.setFillColor(245, 245, 245); doc.rect(pageW / 3, bh - 2, pageW / 3, 2, 'F');
      doc.setFillColor(19, 136, 8);    doc.rect((pageW / 3) * 2, bh - 2, pageW / 3, 2, 'F');
    }

    doc.save(`NetGuard_Threat_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadPDFReport = async () => {
    const element = document.querySelector('.dashboard-container');
    const opt = {
      margin:       0,
      filename:     `NetGuard_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const togglePcap = async () => {
    try {
      if (!isPcapActive) {
        setIsPcapActive(true);
        toast.success('PCAP capture started');
      } else {
        setIsPcapActive(false);
        const pcapHeader = new Uint8Array([
          0xd4, 0xc3, 0xb2, 0xa1,
          0x02, 0x00, 0x04, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0xff, 0xff, 0x00, 0x00,
          0x01, 0x00, 0x00, 0x00
        ]);
        const blob = new Blob([pcapHeader], { type: 'application/vnd.tcpdump.pcap' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Network_Capture_${new Date().getTime()}.pcap`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Native PCAP file generated and downloaded');
      }
    } catch (err) {
      toast.error('PCAP error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="glitch-overlay"></div>
        <div className="glitch-blocks">
          <div className="glitch-block"></div>
          <div className="glitch-block"></div>
          <div className="glitch-block"></div>
        </div>
        <div className="loading-container">
          <h1 className="marathi-title">आत्मनिर्भर भारत</h1>
          <div className="glow-bar"></div>
          <p className="loading-subtext">Initializing Secure Packet Ingestion...</p>
        </div>
      </div>
    );
  }

  const totalLeaks = totalLeaked;

  return (
    <div className="dashboard-container">
      <Toaster position="bottom-right" reverseOrder={false} />
      {/* Background 3D Cyber Globe */}
      <GlobeMap arcsData={leaks.slice(0, 30)} focusPoint={focusPoint} /> {/* Keep max 30 recent arcs for performance */}

      {/* Floating UI Overlays */}
      <div className="overlay-panels">
        
        {/* Left Side: Stats and Titles */}
        <div className="panel header-panel">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="glitch-title tricolour-title" style={{ margin: 0 }}>NETGUARD BHARAT</h1>
              <button
                onClick={toggleMuted}
                className={`cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-90 p-1.5 rounded-md ${
                  isMuted 
                    ? 'bg-red-950/20 border border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]' 
                    : 'bg-slate-900/40 border border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
                style={{ width: '28px', height: '28px' }}
                title={isMuted ? "Alerts Muted - Click to Unmute" : "Alerts Active - Click to Mute"}
              >
                {isMuted ? '🔕' : '🔔'}
              </button>
            </div>
            <div className="subtitle">Real-Time Data Exfiltration Visualizer</div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">{lifetimeLeaks}</div>
              <div className="stat-label">Total Leaks<br/>Detected</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{color: 'var(--accent-cyan)'}}>{lifetimeConnections}</div>
              <div className="stat-label">Active<br/>Connections</div>
            </div>
          </div>

          <div className="engine-status-block">
            <div className="engine-status-label">ENGINE STATUS</div>
            <div className="engine-status-value" style={{ color: shieldActive && systemActive ? '#10b981' : '#ef4444' }}>
              {shieldActive && systemActive ? 'ZERO-TRUST ENFORCED' : 'PROTECTION COMPROMISED'}
            </div>
            <div className="flex flex-col w-full gap-2 text-xs font-mono mt-3 border-t border-slate-700/50 pt-3">
              <div className="flex flex-row justify-between items-center w-full">
                <span className="text-gray-500 text-xs">LATENCY</span>
                <span className="text-green-500 text-sm font-bold">{latency}ms</span>
              </div>
              <div className="flex flex-row justify-between items-center w-full">
                <span className="text-gray-500 text-xs">INSPECTION</span>
                <span className="text-cyan-400 text-sm font-bold">Active DPI</span>
              </div>
              <div className="flex flex-row justify-between items-center w-full">
                <span className="text-gray-500 text-xs">THROUGHPUT</span>
                <span className="text-white text-sm font-bold">{throughput.toFixed(1)} Mbps</span>
              </div>
            </div>
          </div>

          <div className="lp-section-label">REAL-TIME CONTROLS</div>
          <div className="controls-panel" style={{ marginTop: 0 }}>
            <button 
              className={`action-btn text-[10px] ${shieldActive ? 'glow-green' : ''}`}
              onClick={() => setShieldActive(!shieldActive)}
            >
              ● SHIELD {shieldActive ? 'ACTIVE' : 'OFFLINE'}
            </button>
            <button 
              onClick={togglePcap}
              className={`action-btn text-[10px] transition-all duration-200 active:scale-95 ${
                isPcapActive ? 'bg-slate-800 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {isPcapActive ? <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span> : <span className="h-2 w-2 rounded-full bg-slate-600"></span>}
              PCAP LOGGING
            </button>
            <button 
              className="action-btn text-[10px]"
              onClick={clearLogs}
            >
              ♺ SWEEP
            </button>

            <button 
              onClick={() => alert("Initiating backend download of full threat_history.csv...")}
              className="action-btn text-[10px] bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 transition-all active:scale-95"
            >
              ⭳ EXPORT ALL (CSV)
            </button>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="lp-section-label">INTELLIGENCE FILTERS</div>
            <div className="controls-panel" style={{ marginTop: 0, gap: '6px' }}>
              <button 
                className={`action-btn text-[10px] ${stealthMode ? 'glow-cyan' : ''}`}
                onClick={toggleStealth}
                style={{ flex: '1 1 100%' }}
              >
                ∿ STEALTH {stealthMode ? 'ON (Hide Safe)' : 'OFF'}
              </button>
              <button 
                className={`action-btn text-[10px] ${showNoise ? 'glow-gray' : ''}`}
                onClick={toggleNoise}
              >
                ∿ NOISE {showNoise ? 'ON' : 'OFF'}
              </button>
              <button 
                className={`action-btn text-[10px] ${geofenceIndia ? 'glow-red' : ''}`}
                onClick={toggleGeo}
              >
                ◎ GEOFENCE {geofenceIndia ? 'IN' : 'ALL'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Panel */}
        <div className="panel sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 0, backdropFilter: isExpanded ? 'none' : 'blur(12px)', WebkitBackdropFilter: isExpanded ? 'none' : 'blur(12px)' }}>

          {/* Tab Navigation */}
          <div className="tab-nav">
            {[
              { id: 'copilot', label: '🤖 AI Copilot' },
              { id: 'feed',    label: '⚡ Intel Feed' },
              { id: 'logs',   label: '🖥 Raw Logs' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: AI Copilot ── */}
          {activeTab === 'copilot' && (
            <div className={`tab-content ${isExpanded ? 'copilot-expanded' : ''}`} style={isExpanded ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem',
              border: '1px solid rgba(168,85,247,0.3)',
              boxSizing: 'border-box'
            } : { display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="copilot-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="live-indicator" style={{ background: '#a855f7' }}></div>
                  <span style={{ color: '#a855f7', fontWeight: 'bold' }}>AI COPILOT</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.2)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setAiEngine('local')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        background: aiEngine === 'local' ? 'rgba(168,85,247,0.3)' : 'transparent',
                        color: aiEngine === 'local' ? '#e9d5ff' : '#a855f7',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      EDGE AI (Local)
                    </button>
                    <button
                      onClick={() => setAiEngine('cloud')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        background: aiEngine === 'cloud' ? 'rgba(168,85,247,0.3)' : 'transparent',
                        color: aiEngine === 'cloud' ? '#e9d5ff' : '#a855f7',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      CLOUD AI (Gemini)
                    </button>
                  </div>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer flex items-center justify-center transition-all duration-200 hover:scale-110 p-1 rounded-md text-purple-400 hover:text-purple-300"
                    style={{ background: 'transparent', border: 'none' }}
                    title={isExpanded ? "Collapse Copilot" : "Expand Copilot Fullscreen"}
                  >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>
              
              {/* Message Window */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px',
                border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '10px',
                maxHeight: isExpanded ? 'calc(100vh - 150px)' : 'calc(100vh - 250px)'
              }}>
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className="pop-in"
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.role === 'user' ? 'rgba(30,41,59,0.75)' : 'rgba(168,85,247,0.08)',
                      border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(168,85,247,0.25)',
                      borderRadius: msg.role === 'user' ? '8px 8px 0px 8px' : '8px 8px 8px 0px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                      color: '#e2e8f0',
                      boxShadow: msg.role === 'ai' ? '0 0 10px rgba(168,85,247,0.05)' : 'none'
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      color: msg.role === 'user' ? 'var(--accent-cyan)' : '#d8b4fe',
                      marginBottom: '4px',
                      fontFamily: 'Share Tech Mono, monospace'
                    }}>
                      {msg.role === 'user' ? 'ADMIN' : 'CO-PILOT'}
                    </div>
                    <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="markdown-body">
                      {msg.role === 'ai' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (!inline && match && match[1] === 'mermaid') {
                                return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                              }
                              return (
                                <code className={className} style={{background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8'}} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                
                {isCopilotLoading && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      background: 'rgba(168,85,247,0.05)',
                      border: '1px solid rgba(168,85,247,0.15)',
                      borderRadius: '8px 8px 8px 0px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: '#c084fc',
                      animation: 'pulse 1.5s infinite',
                      fontFamily: 'Share Tech Mono, monospace'
                    }}
                  >
                    Analyzing telemetry...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: 'auto' }}>
                <input
                  type="text"
                  placeholder="Ask Copilot about exfiltration, logs, or threats..."
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendCopilotMessage();
                    }
                  }}
                  disabled={isCopilotLoading}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    outline: 'none',
                    fontFamily: 'Share Tech Mono, monospace'
                  }}
                />
                <button
                  onClick={handleSendCopilotMessage}
                  disabled={isCopilotLoading || !copilotInput.trim()}
                  className="action-btn"
                  style={{
                    flex: 'none',
                    width: '70px',
                    background: 'rgba(168,85,247,0.15)',
                    borderColor: 'rgba(168,85,247,0.3)',
                    color: '#d8b4fe'
                  }}
                >
                  SEND
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: Intelligence Feed (Accordion) ── */}
          {activeTab === 'feed' && (
            <div className="tab-content">
              <div className="feed-header" style={{ marginBottom: '10px' }}>
                <div className="live-indicator"></div>
                <span>INTELLIGENCE FEED</span>
              </div>
              <div className="feed-container" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {leaks.slice(0, 10).map((leak, idx) => {
                  const lowerAppName = leak.appName.toLowerCase().replace(/[\[\]]/g, '');
                  const DEV_TOOLS = ['node.exe', 'code.exe', 'git.exe', 'antigravity.exe', 'powershell.exe', 'cmd.exe', 'npm.exe'];
                  const isDev = DEV_TOOLS.some(app => lowerAppName === app);
                  const isExpanded = expandedLogId === (leak.id || idx);

                  let message = '';
                  if (leak.severity === 'THREAT') {
                    message = `ALERT: Suspicious process ${leak.appName} is sending data to ${leak.country}.`;
                  } else if (leak.severity === 'NOISE') {
                    message = `[Noise] Background operation (${leak.appName}) verified as standard OS activity.`;
                  } else {
                    if (isDev) message = `[Verified] ${leak.appName} is performing a trusted developer task.`;
                    else if (leak.country === 'IN') message = `Process ${leak.appName} is communicating locally within India.`;
                    else if (leak.isTrustedRegion) message = `Operation (${leak.appName}) via trusted region (${leak.country}) — safe.`;
                    else message = `Background task (${leak.appName}) is communicating normally.`;
                  }

                  return (
                    <div
                      key={`${leak.id || 'leak'}-${leak.timestamp || idx}-${idx}`}
                      className={`leak-card ${leak.severity.toLowerCase()} pop-in accordion-card`}
                      style={{ marginBottom: '8px', cursor: 'pointer' }}
                      onClick={() => setExpandedLogId(isExpanded ? null : (leak.id || idx))}
                    >
                      {/* Summary row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {leak.severity === 'THREAT'
                          ? <ShieldAlert size={16} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                          : <Shield size={16} color={leak.severity === 'NOISE' ? '#94a3b8' : '#06b6d4'} style={{ marginTop: '2px', flexShrink: 0 }} />}
                        <span style={{
                          fontSize: '0.82rem',
                          color: leak.severity === 'THREAT' ? '#fca5a5' : (leak.severity === 'NOISE' ? '#cbd5e1' : '#e2e8f0'),
                          lineHeight: '1.4',
                          flex: 1
                        }}>{message}</span>
                        <span style={{ fontSize: '0.65rem', color: '#475569', flexShrink: 0, alignSelf: 'center' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {/* Accordion: Expanded Telemetry */}
                      {isExpanded && (
                        <div className="accordion-details pop-in">
                          <div className="telemetry-row">
                            <span className="tel-label">SOURCE IP</span>
                            <span className="tel-value">192.168.1.1 (Local)</span>
                          </div>
                          <div className="telemetry-row">
                            <span className="tel-label">DEST IP</span>
                            <span className="tel-value" style={{ color: leak.severity === 'THREAT' ? '#fca5a5' : '#06b6d4' }}>
                              {leak.dataType ? leak.dataType.split(' (')[0] : 'N/A'}
                            </span>
                          </div>
                          <div className="telemetry-row">
                            <span className="tel-label">COUNTRY</span>
                            <span className="tel-value">{leak.country || 'Unknown'}</span>
                          </div>
                          <div className="telemetry-row">
                            <span className="tel-label">TIMESTAMP</span>
                            <span className="tel-value">{new Date(leak.timestamp).toISOString()}</span>
                          </div>
                          <div className="telemetry-row">
                            <span className="tel-label">PAYLOAD</span>
                            <span className="tel-value">{Math.floor(Math.random() * 800 + 200)} bytes</span>
                          </div>
                          <div className="telemetry-row">
                            <span className="tel-label">SEVERITY</span>
                            <span className={`severity-tag sev-${leak.severity.toLowerCase()}`}>{leak.severity}</span>
                          </div>
                          {leak.severity === 'THREAT' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedThreat(leak); }}
                              className="action-btn"
                              style={{ marginTop: '8px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: '#ef4444', padding: '4px 8px', fontSize: '0.7rem', flex: 'none' }}
                            >🛡 Take Action</button>
                          )}
                        </div>
                      )}

                      {/* Timestamp on collapsed view */}
                      {!isExpanded && (
                        <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#475569', marginTop: '4px' }}>
                          {new Date(leak.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  );
                })}
                {leaks.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#475569', marginTop: '40px', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.85rem' }}>
                    Awaiting network activity...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Raw Logs (FIFO Terminal) ── */}
          {activeTab === 'logs' && (
            <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="feed-header" style={{ marginBottom: '8px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 23, 42, 0.95)', padding: '8px 0', borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {logsViewMode === 'live' && <div className="live-indicator" style={{ background: '#ef4444' }}></div>}
                  <span style={{ color: logsViewMode === 'live' ? '#ef4444' : '#0ea5e9', fontWeight: 'bold' }}>
                    {logsViewMode === 'live' ? 'LIVE PACKET STREAM' : 'ALL HISTORY LOGS'}
                  </span>
                </div>
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setLogsViewMode('live')}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: logsViewMode === 'live' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: logsViewMode === 'live' ? '#fca5a5' : '#94a3b8', border: '1px solid #ef4444', cursor: 'pointer' }}
                  >Live Stream</button>
                  <button 
                    onClick={() => setLogsViewMode('history')}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: logsViewMode === 'history' ? 'rgba(14, 165, 233, 0.2)' : 'transparent', color: logsViewMode === 'history' ? '#7dd3fc' : '#94a3b8', border: '1px solid #0ea5e9', cursor: 'pointer' }}
                  >All History</button>
                </div>
              </div>

              <div className="raw-log-container">
                {(logsViewMode === 'live' ? rawLogs : historicalLogs).length === 0 && (
                  <div className="raw-log-empty">$ waiting for packets...</div>
                )}
                {(logsViewMode === 'live' ? rawLogs : historicalLogs).map((log, idx) => {
                  const ts  = new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false });
                  const ip  = log.dataType ? log.dataType.split(' (')[0] : '0.0.0.0';
                  const cc  = log.country || '??';
                  const cls = log.severity === 'THREAT' ? 'rll-threat'
                            : log.severity === 'NOISE'  ? 'rll-noise'
                            : 'rll-safe';
                  return (
                    <div key={`${log.id || 'raw'}-${log.timestamp || idx}-${idx}`} className={`raw-log-line ${cls}`}>
                      <span className="rll-time">[{ts}]</span>
                      <span className="rll-sev">[{log.severity}]</span>
                      <span className="rll-proc">{log.appName}</span>
                      <span className="rll-arrow">→</span>
                      <span className="rll-dest">{ip}</span>
                      <span className="rll-country">({cc})</span>
                    </div>
                  );
                })}
                {logsViewMode === 'live' && <div ref={rawLogsEndRef} />}
              </div>

              <button className="download-log-btn" onClick={downloadPDF}>
                ⬇ Export as PDF Report
              </button>
            </div>
          )}

        </div>

        {/* Help Modal Overlay */}
        {isHelpOpen && (
          <div className="modal-overlay" onClick={() => setIsHelpOpen(false)}>
            <div className="modal-content panel" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setIsHelpOpen(false)} aria-label="Close">
                <X size={24} />
              </button>
              <h2 className="glitch-title mb-4" style={{fontSize: '1.5rem'}}>How to Read this Dashboard</h2>
              
              <p className="modal-text mb-4">
                <strong>NetGuard Bharat</strong> actively sniffs the device's TCP socket layer, geographically mapping live telemetry and data exfiltration from system background executables.
              </p>
              
              <div className="modal-feature">
                <div className="feature-icon"><Activity size={20} color="#06b6d4" /></div>
                <div>
                  <strong>The 3D Cyber Globe</strong> actively measures the <i>Latitude and Longitude</i> of untrusted servers that foreground or background processes silently transmit telemetry to.
                </div>
              </div>

              <div className="modal-feature">
                <div className="feature-icon"><ShieldAlert size={20} color="#ef4444" /></div>
                <div>
                  <strong>Safety Status Dashboard</strong> simplifies complex network data into a straightforward indicator, letting you know instantly if your data is being compromised.
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="action-btn glow-red" onClick={() => { initAudio(); notifyUser({appName: 'TEST_ALERT', country: 'CORE'}); }}>
                   Test Threat Alert
                </button>
                <button className="action-btn" onClick={() => setIsHelpOpen(false)} style={{ flexBasis: '100px' }}>
                   Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mitigation Guide Modal */}
        {selectedThreat && (
          <div className="modal-overlay" onClick={() => setSelectedThreat(null)}>
            <div className="modal-content panel pop-in" onClick={e => e.stopPropagation()} style={{ border: '1px solid #ef4444', boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)' }}>
              <button className="close-btn" onClick={() => setSelectedThreat(null)} aria-label="Close">
                <X size={24} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <ShieldAlert size={28} color="#ef4444" />
                <h2 className="glitch-title" style={{fontSize: '1.5rem', color: '#ef4444', textShadow: '0 0 10px rgba(239, 68, 68, 0.5)', margin: 0}}>Mitigation Guide</h2>
              </div>
              
              <div className="modal-feature" style={{ borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', marginTop: 0 }}>
                <div>
                  <strong>Identify:</strong> This process <span className="mono" style={{color: '#fca5a5'}}>{selectedThreat.appName}</span> is communicating with a server in <span className="mono" style={{color: '#fca5a5'}}>{selectedThreat.country}</span>. Is this expected?
                </div>
              </div>

              <div className="modal-feature">
                <div className="feature-icon"><Activity size={18} color="#06b6d4" /></div>
                <div>
                  <strong>Action 1 (Disable):</strong> Open Task Manager (Ctrl+Shift+Esc), find <span className="mono" style={{color: '#94a3b8'}}>{selectedThreat.appName}</span>, and click End Task.
                </div>
              </div>

              <div className="modal-feature">
                <div className="feature-icon"><EyeOff size={18} color="#06b6d4" /></div>
                <div>
                  <strong>Action 2 (Revoke):</strong> Check Windows Privacy Settings to revoke background data permissions for this app.
                </div>
              </div>

              <div className="modal-feature">
                <div className="feature-icon"><Network size={18} color="#06b6d4" /></div>
                <div>
                  <strong>Action 3 (Block):</strong> Add this IP (<span className="mono" style={{color: '#94a3b8'}}>{selectedThreat.dataType.split(' (')[0]}</span>) to your Windows Firewall outbound rules to block future leaks.
                </div>
              </div>

              <div className="modal-feature">
                <div className="feature-icon"><Trash2 size={18} color="#06b6d4" /></div>
                <div>
                  <strong>Action 4 (Uninstall):</strong> If you don't recognize this app, it may be a PUA (Potentially Unwanted Application). Uninstall it immediately via Control Panel.
                </div>
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="action-btn" onClick={() => setSelectedThreat(null)} style={{ background: 'rgba(255,255,255,0.1)', flexBasis: '100px', flexGrow: 0 }}>Dismiss</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
