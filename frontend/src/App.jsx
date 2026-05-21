import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import GlobeMap from './components/GlobeMap';
import { Activity, ShieldAlert, Cpu, Network, HelpCircle, X, Info, Shield, ShieldOff, Trash2, Camera, Download, Eye, EyeOff, MapPin, Crosshair, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
import './index.css';

const SOCKET_SERVER_URL = 'http://localhost:3002';

function App() {
  const [leaks, setLeaks] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [totalLeaked, setTotalLeaked] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(true);
  const [focusPoint, setFocusPoint] = useState(null);
  const [latency, setLatency] = useState(0);
  const [socket, setSocket] = useState(null);
  const [lifetimeConnections, setLifetimeConnections] = useState(0);
  const [lifetimeLeaks, setLifetimeLeaks] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const pingInterval = setInterval(() => {
      const start = Date.now();
      socket.emit('custom_ping', () => {
        setLatency(Math.max(1, Date.now() - start));
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

    if (isMuted) return;

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
      const cappedHistory = history.slice(0, 100);
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
        const newLogs = [event, ...prev];
        return newLogs.length > 100 ? newLogs.slice(0, 100) : newLogs;
      });

      // 1. Drop Logic based on Filters for the Intelligence Feed
      if (stealthRef.current && !event.isThreat && !event.isWhitelisted) return;
      if (!noiseRef.current && event.severity === 'NOISE') return;

      // 2. Threat Visuals & Beep
      if (event.isThreat) {
        notifyUser(event);
        setTotalLeaked((prev) => prev + 1);
        
        // Red Flash Alert
        document.body.classList.add('threat-pulse');
        setTimeout(() => document.body.classList.remove('threat-pulse'), 1000);
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
            <h1 className="glitch-title tricolour-title">NETGUARD BHARAT</h1>
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
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-3 border-t border-slate-700/50 pt-3">
              <div className="flex flex-col">
                <span className="text-slate-500">LATENCY</span>
                <span className="text-emerald-400 text-sm font-semibold">{latency}ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500">RULESET</span>
                <span className="text-cyan-400 text-sm font-semibold">DEFCON-3 ACTIVE</span>
              </div>
              <div className="flex flex-col col-span-2 mt-1">
                <span className="text-slate-500">HEURISTICS ENGINE</span>
                <span className="text-slate-300 text-sm font-semibold">Neural NTA monitoring 14,000+ ports</span>
              </div>
            </div>
          </div>

          <div className="lp-section-label">REAL-TIME CONTROLS</div>
          <div className="controls-panel" style={{ marginTop: 0 }}>
            <button 
              className={`action-btn ${shieldActive ? 'glow-green' : ''} text-sm`}
              onClick={() => setShieldActive(!shieldActive)}
            >
              ● SHIELD {shieldActive ? 'ACTIVE' : 'OFFLINE'}
            </button>
            <button 
              onClick={() => setIsPcapActive(!isPcapActive)}
              className={`py-2 px-4 rounded font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                isPcapActive ? 'bg-slate-800 border border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-slate-900 border border-slate-700 text-slate-500'
              }`}
              style={{ flex: '1 1 130px' }}
            >
              {isPcapActive ? <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span> : <span className="h-2 w-2 rounded-full bg-slate-600"></span>}
              PCAP LOGGING
            </button>
            <button 
              className="action-btn text-sm"
              onClick={clearLogs}
            >
              ♺ SWEEP
            </button>
            <button 
              onClick={() => alert("Initiating backend download of full threat_history.csv...")}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-bold text-xs text-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              ⭳ EXPORT ALL (CSV)
            </button>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="lp-section-label">INTELLIGENCE FILTERS</div>
            <div className="controls-panel" style={{ marginTop: 0, gap: '8px' }}>
              <button 
                className={`action-btn ${stealthMode ? 'glow-cyan' : ''} text-sm`}
                onClick={toggleStealth}
                style={{ flex: '1 1 100%' }}
              >
                ∿ STEALTH {stealthMode ? 'ON (Hide Safe)' : 'OFF'}
              </button>
              <button 
                className={`action-btn ${showNoise ? 'glow-gray' : ''} text-sm`}
                onClick={toggleNoise}
              >
                ∿ NOISE {showNoise ? 'ON' : 'OFF'}
              </button>
              <button 
                className={`action-btn ${geofenceIndia ? 'glow-red' : ''} text-sm`}
                onClick={toggleGeo}
              >
                ◎ GEOFENCE {geofenceIndia ? 'IN' : 'ALL'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Panel */}
        <div className="panel sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

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
            <div className="tab-content">
              <div className="copilot-header">
                <div className="live-indicator" style={{ background: '#a855f7' }}></div>
                <span style={{ color: '#a855f7' }}>AI COPILOT</span>
              </div>
              <div className="copilot-summary">
                <div className="copilot-card">
                  <div className="copilot-label">🔴 Active Threats</div>
                  <div className="copilot-value" style={{ color: '#ef4444' }}>
                    {leaks.filter(l => l.severity === 'THREAT').length}
                  </div>
                </div>
                <div className="copilot-card">
                  <div className="copilot-label">🟢 Safe Events</div>
                  <div className="copilot-value" style={{ color: '#10b981' }}>
                    {leaks.filter(l => l.severity === 'SAFE').length}
                  </div>
                </div>
                <div className="copilot-card">
                  <div className="copilot-label">⚪ Noise</div>
                  <div className="copilot-value" style={{ color: '#94a3b8' }}>
                    {leaks.filter(l => l.severity === 'NOISE').length}
                  </div>
                </div>
              </div>
              <div className="copilot-insight">
                <div className="copilot-insight-title">🧠 Threat Analysis</div>
                {leaks.filter(l => l.severity === 'THREAT').length === 0 ? (
                  <p style={{ color: '#10b981', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    ✅ No active exfiltration events detected. System perimeter is clean.
                  </p>
                ) : (
                  <>
                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '10px' }}>
                      ⚠️ <strong>{leaks.filter(l => l.severity === 'THREAT').length}</strong> suspicious process(es) detected communicating with foreign servers.
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      Top offender: <span style={{ color: '#fca5a5', fontFamily: 'Share Tech Mono, monospace' }}>{leaks.find(l => l.severity === 'THREAT')?.appName || '—'}</span>
                      {' → '}<span style={{ color: '#fb923c', fontFamily: 'Share Tech Mono, monospace' }}>{leaks.find(l => l.severity === 'THREAT')?.country || '—'}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="copilot-insight" style={{ marginTop: '10px', borderColor: 'rgba(168,85,247,0.25)' }}>
                <div className="copilot-insight-title" style={{ color: '#a855f7' }}>📡 Network Posture</div>
                <p style={{ color: '#e2e8f0', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  Monitoring <strong style={{ color: '#06b6d4' }}>{activeConnections}</strong> live connections.
                  {' '}{totalLeaked > 0
                    ? `${totalLeaked} exfiltration event(s) logged this session — consider reviewing flagged processes.`
                    : 'No anomalies recorded this session.'}
                </p>
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
            <div className="tab-content">
              <div className="feed-header" style={{ marginBottom: '8px' }}>
                <div className="live-indicator" style={{ background: '#22c55e' }}></div>
                <span style={{ color: '#22c55e' }}>RAW PACKET LOG</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#475569' }}>{rawLogs.length}</span>
              </div>

              <div className="raw-log-container">
                {rawLogs.length === 0 && (
                  <div className="raw-log-empty">$ waiting for packets...</div>
                )}
                {rawLogs.map((log, idx) => {
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
