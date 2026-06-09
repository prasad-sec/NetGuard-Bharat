require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const { exec } = require('child_process');
const geoip = require('geoip-lite');
const { Server } = require('socket.io');
const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Ensure exports directory exists
const exportsDir = path.join(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir);
}

let isPcapRecording = false;
let pcapStream = null;
let currentPcapFilename = null;

const sqlite3 = require('sqlite3').verbose();
const SOCKET_PORT = 3002;

const app = express();

const db = new sqlite3.Database('./netguard_telemetry.db', (err) => {
  if (err) console.error("SQLite connection error:", err);
  else {
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      process TEXT,
      target_ip TEXT,
      country TEXT,
      severity TEXT,
      threat TEXT
    )`, () => {
      const pruneDatabase = () => {
        db.run(`DELETE FROM logs WHERE timestamp < datetime('now', '-7 days')`, function(err) {
          if (err) console.error("[DB] Pruning error:", err);
          else console.log(`[DB] Pruned ${this.changes} old logs from SQLite to enforce 7-day edge retention.`);
        });
      };
      pruneDatabase();
      setInterval(pruneDatabase, 24 * 60 * 60 * 1000);
    });
  }
});
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON bodies

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const logHistory = [];

function addLogToHistory(event) {
  logHistory.push(event);
  if (logHistory.length > 100) {
    logHistory.shift();
  }
}

function broadcastAndStoreLog(event) {
  addLogToHistory(event);
  io.emit('leak_event', event);
  
  db.run(
    `INSERT INTO logs (timestamp, process, target_ip, country, severity, threat) VALUES (?, ?, ?, ?, ?, ?)`,
    [event.timestamp, event.appName, event.dataType, event.country, event.severity, event.isThreat ? 'Yes' : 'No']
  );
}

const INDIA_CA = { lat: 21.0, lng: 78.0 }; // Default origin point for India

// --- AUTHENTICATION ENDPOINT ---
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_SECRET) {
    return res.status(200).json({ success: true, message: "AUTH_GRANTED" });
  }
  return res.status(401).json({ success: false, error: "INVALID SECURITY TOKEN" });
});

// --- HISTORICAL EXPORT ENDPOINT ---
app.post('/api/export/history', (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing dates' });
  
  const start = new Date(startDate);
  start.setHours(0,0,0,0);
  const end = new Date(endDate);
  end.setHours(23,59,59,999);
  
  db.all(
    `SELECT * FROM logs WHERE timestamp BETWEEN ? AND ?`, 
    [start.toISOString(), end.toISOString()], 
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// --- PCAP SYNTHESIS API ---
app.post('/api/pcap/toggle', (req, res) => {
  const { action } = req.body;
  if (action === 'start') {
    if (isPcapRecording) return res.json({ status: 'already_recording' });
    
    currentPcapFilename = `netguard_capture_${Date.now()}.pcap`;
    const filepath = path.join(exportsDir, currentPcapFilename);
    pcapStream = fs.createWriteStream(filepath);
    
    // Write 24-byte PCAP Global Header
    // Magic (4), Major(2), Minor(2), TimeZone(4), SigFigs(4), SnapLen(4), LinkType(4)
    const globalHeader = Buffer.alloc(24);
    globalHeader.writeUInt32LE(0xa1b2c3d4, 0); // Magic number
    globalHeader.writeUInt16LE(2, 4); // Major version
    globalHeader.writeUInt16LE(4, 6); // Minor version
    globalHeader.writeInt32LE(0, 8); // GMT to local timezone correction
    globalHeader.writeUInt32LE(0, 12); // Accuracy of timestamps
    globalHeader.writeUInt32LE(65535, 16); // Max length of captured packets
    globalHeader.writeUInt32LE(1, 20); // Data link type (1 = Ethernet)
    
    pcapStream.write(globalHeader);
    isPcapRecording = true;
    console.log(`[PCAP] Started synthetic capture: ${currentPcapFilename}`);
    return res.json({ status: 'started' });
    
  } else if (action === 'stop') {
    if (!isPcapRecording) return res.json({ status: 'not_recording' });
    
    isPcapRecording = false;
    if (pcapStream) {
      pcapStream.end();
      pcapStream = null;
    }
    const finalFilename = currentPcapFilename;
    currentPcapFilename = null;
    console.log(`[PCAP] Stopped capture: ${finalFilename}`);
    return res.json({ status: 'stopped', downloadUrl: `/api/pcap/download/${finalFilename}` });
  }
  return res.status(400).json({ error: 'Invalid action' });
});

app.get('/api/pcap/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(exportsDir, filename);
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});


// --- AI COPILOT ENDPOINT ---
app.post('/api/copilot', async (req, res) => {
  try {
    // TODO: Update the Python network_baseline/enterprise_tap script later to include a payload_size_bytes metric so the AI can analyze data exfiltration volume.
    const { userQuery, aiEngine = 'local' } = req.body || {};
    
    // Action 2 & 3: Database Context Fetch and CSV Compression
    const fetchRecentContext = () => {
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT timestamp, process, target_ip, severity, threat FROM logs WHERE timestamp >= datetime('now', '-5 minutes')`,
          [],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
          }
        );
      });
    };

    const recentLogs = await fetchRecentContext();
    
    function sanitizeLogs(logsArray) {
      return logsArray.map(log => {
        const scrubbed = { ...log };
        if (scrubbed.dataType) {
          scrubbed.dataType = '[REDACTED_IP]';
        }
        return scrubbed;
      });
    }

    const buildPrompt = (logsToUse, isCloud) => {
      // Compress logs into dense CSV format to save token context window
      const logsContext = ['Timestamp,Process,Target_IP,Severity,Threat'].concat(
        logsToUse.map(log => `${log.timestamp},${log.process || 'Unknown'},${isCloud ? '[REDACTED_IP]' : (log.target_ip || 'Unknown')},${log.severity || 'Unknown'},${log.threat || 'Unknown'}`)
      ).join('\n');

      let prompt = `You are NetGuard Copilot, an elite Tier-3 Cybersecurity Analyst AI. Your tone is professional, analytical, and highly competent. If the user greets you casually, acknowledge it politely but immediately pivot to offering network security insights, threat analysis, or PCAP reviews based on the current dashboard telemetry.

CRITICAL CAPABILITY AWARENESS: You are integrated into the NetGuard Bharat Enterprise UI. The frontend has a native Markdown-to-PDF conversion engine. If the user asks you to 'generate a PDF', 'export a report', or 'make a document', DO NOT say that you cannot create files. Instead, you MUST immediately write a highly detailed, professional markdown report analyzing the requested logs, and conclude your message by saying: 'I have compiled the requested intelligence. You may download the PDF report using the export button below.'

CRITICAL DIRECTIVES:
1. Only analyze the network logs and discuss telemetry or threats if the user explicitly asks a question about the system, logs, anomalies, network activity, or security threats.
2. Analyze the following telemetry data (Last 5 Minutes). Do not mention the CSV format. Output your intelligence report directly. If the user asks for data that is not present in the provided JSON schema (such as payload sizes), explicitly state that the telemetry tap is not currently capturing that specific metric, but analyze the remaining available metrics (like IPs, Ports, and Severity).

REPORTING PROTOCOL: When asked to generate a report or analyze a time window, you MUST use rich Markdown formatting to create a visually striking document. You must adhere to the following structure:
Use an H2 (##) for 'Executive Summary' and provide a high-level impact assessment.
Use a Markdown Table (|---|---|) to display 'Event Statistics' (e.g., Total Logs, Severity Breakdown, Top Targeted Countries). Do not use plain text lists for stats.
Use an H2 (##) for 'Threat Hypothesis' where you explain why this specific traffic pattern is dangerous (e.g., explaining why a 1440-byte MTU payload indicates data exfiltration). Use blockquotes (>) for critical warnings.
Bold (**text**) all IP addresses, process names, and severity levels.
When visualizing network topologies, you MUST use Mermaid.js. You are strictly forbidden from outputting raw Mermaid text. You MUST wrap the entire graph in \`\`\`mermaid backticks.
When adding text labels to arrows, you MUST wrap the label strictly in pipe characters |.
When generating Mermaid.js charts, you must use strict, error-free syntax. Only use 'graph TD' or 'pie' chart types. Do not use special characters, unescaped brackets, or complex subgraphs. Wrap the syntax cleanly in a standard markdown code block labeled 'mermaid'. Keep node names simple and alphanumeric.

CORRECT FORMAT Example:
\`\`\`mermaid
graph TD;

A[Attacker] -->|Injects SQL| B(Web App);

B -->|Queries| C[(Database)];
\`\`\`

INCORRECT FORMAT (DO NOT USE): A --> Injects SQL B
Conclude with the exact phrase: 'I have compiled the requested intelligence. You may download the PDF report using the export button below.'`;

      if (isCloud) {
        prompt += `\n5. Security Notice: Specific IP addresses have been deliberately scrubbed from these logs and replaced with placeholders to enforce Zero-Trust privacy protocols. Do not flag missing IPs as an error. Focus your analysis purely on application behavior, geographic routing, and severity flags.`;
      }

      prompt += `\n\nRecent Network Logs:\n${logsContext || 'No logs recorded yet.'}`;
      if (userQuery) {
        prompt += `\n\nUser Query: ${userQuery}`;
      }
      return prompt;
    };

    if (aiEngine === 'cloud') {
      console.log("[☁️ CLOUD ENGINE] Routing request to Gemini (Sanitized Data)...");
      const scrubbedLogs = sanitizeLogs(recentLogs);
      const cloudPrompt = buildPrompt(scrubbedLogs, true);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log("[☁️ CLOUD ENGINE] Waiting for Gemini API to generate content...");
      const result = await model.generateContent(cloudPrompt);
      const response = await result.response;
      const text = response.text();
      console.log("[☁️ CLOUD ENGINE] Successfully generated response of length:", text.length);
      return res.status(200).json({ reply: text });
    } else {
      // Call Ollama API
      const localPrompt = buildPrompt(recentLogs, false);
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3.2:1b',
          prompt: localPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama responded with status: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json({ reply: data.response });
    }
  } catch (error) {
    console.error("AI FETCH ERROR:", error.message || error);
    console.error('Error in AI Copilot endpoint:', error);
    res.status(500).json({ 
      reply: 'Sorry, I encountered an error. Please ensure the requested AI engine is active and configured correctly.' 
    });
  }
});

server.listen(SOCKET_PORT, () => {
  console.log(`[+] Express API & WebSockets running for Dashboard on port ${SOCKET_PORT}`);
});

let isMonitoring = true;

const connectedSockets = new Set();
io.on('connection', (s) => {
  connectedSockets.add(s);
  s.emit('log_history', logHistory);
  
  s.on('custom_ping', (callback) => {
    if (typeof callback === 'function') callback();
  });

  s.on('clear_logs', () => {
    logHistory.length = 0;
    console.log('[SYSTEM] Log history cleared via Sweep.');
    io.emit('logs_cleared');
  });

  s.on('toggle_monitoring', (state) => {
    isMonitoring = !!state;
    console.log(`[STATUS] Sniffer Monitoring switched to: ${isMonitoring}`);
    if (!isMonitoring) {
      totalActive = 0;
      io.emit('active_count', 0);
    }
  });
  
  s.on('disconnect', () => connectedSockets.delete(s));
});

let processMap = {}; // Global cache for PID -> AppName mapping
let activeConnectionsMap = new Map(); // Use Source/Destination IP as key, timestamp as value
const knownSessions = new Map(); // Use Process-Destination IP as key for stateful diffing

// In-memory RAM set — tracks unique local source IPs (never written to disk directly)
const activeEndpoints = new Set();

// 1. Separate Process Cache Refresher (Runs every 5 seconds)
function refreshProcessCache() {
  exec('tasklist /FO CSV', (err, stdout) => {
    if (err) return;
    const lines = stdout.split('\n');
    const newMap = {};
    for (let line of lines) {
      if (!line) continue;
      const parts = line.split('","');
      if (parts.length >= 2) {
        const exeName = parts[0].replace(/"/g, '').trim();
        const pid = parts[1].replace(/"/g, '').trim();
        if (exeName && pid) newMap[pid] = exeName;
      }
    }
    processMap = newMap;
    // console.log(`[SYSTEM] Process cache updated (${Object.keys(processMap).length} entries)`);
  });
}

// Initial run
refreshProcessCache();
setInterval(refreshProcessCache, 5000);

// 2. High-Frequency Connection Poller (Runs every 1 second)
function pollNetwork() {
  if (connectedSockets.size === 0 || !isMonitoring) return;

  // Faster command to get current socket state
  exec('netstat -ano | findstr ESTABLISHED', (errNet, stdoutNet) => {
    if (errNet) return;

    const lines = stdoutNet.split('\n');

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return;
      
      const localAddr  = parts[1];
      const remoteAddr = parts[2];
      const pid        = parts[4];

      // Track unique local source IPs — exclude loopback, only accept LAN addresses
      if (localAddr) {
        const localIp = localAddr.split(':')[0];
        if (
          localIp &&
          !localIp.startsWith('127.') &&
          !localIp.startsWith('[::') &&
          localIp !== '0.0.0.0' &&
          (localIp.startsWith('192.168.') || localIp.startsWith('10.') || localIp.startsWith('172.'))
        ) {
          activeEndpoints.add(localIp);
        }
      }

      // Action 2: PCAP Packet Synthesis in Polling Loop
      if (isPcapRecording && pcapStream && localAddr && remoteAddr) {
        try {
          const localIp = localAddr.split(':')[0];
          const localPort = parseInt(localAddr.split(':')[1]) || 0;
          const remoteIp = remoteAddr.split(':')[0];
          const remotePort = parseInt(remoteAddr.split(':')[1]) || 0;
          
          if (localIp && remoteIp && localIp !== '0.0.0.0' && remoteIp !== '0.0.0.0' && !remoteIp.startsWith('127.') && !remoteIp.includes('[')) {
            const ipToBytes = (ip) => {
              const parts = ip.split('.');
              if (parts.length !== 4) return Buffer.from([0,0,0,0]);
              return Buffer.from(parts.map(p => parseInt(p, 10)));
            };

            const pkt = Buffer.alloc(70);
            
            // 1. PCAP Packet Header (16 bytes)
            const tsSec = Math.floor(Date.now() / 1000);
            const tsUsec = (Date.now() % 1000) * 1000;
            pkt.writeUInt32LE(tsSec, 0);
            pkt.writeUInt32LE(tsUsec, 4);
            pkt.writeUInt32LE(54, 8); // incl_len
            pkt.writeUInt32LE(54, 12); // orig_len
            
            // 2. Ethernet Header (14 bytes) [Offset 16]
            Buffer.from([0x00,0x11,0x22,0x33,0x44,0x55]).copy(pkt, 16); // Dst MAC
            Buffer.from([0x66,0x77,0x88,0x99,0xaa,0xbb]).copy(pkt, 22); // Src MAC
            pkt.writeUInt16BE(0x0800, 28); // EtherType: IPv4
            
            // 3. IPv4 Header (20 bytes) [Offset 30]
            pkt.writeUInt8(0x45, 30); // Version (4) + IHL (5)
            pkt.writeUInt8(0x00, 31); // DSCP/ECN
            pkt.writeUInt16BE(40, 32); // Total Length (20 IP + 20 TCP)
            pkt.writeUInt16BE(0, 34); // Identification
            pkt.writeUInt16BE(0x4000, 36); // Flags + Fragment Offset (Don't fragment)
            pkt.writeUInt8(64, 38); // TTL
            pkt.writeUInt8(6, 39); // Protocol (TCP)
            pkt.writeUInt16BE(0, 40); // Header Checksum (Dummy)
            ipToBytes(localIp).copy(pkt, 42); // Src IP
            ipToBytes(remoteIp).copy(pkt, 46); // Dst IP
            
            // 4. TCP Header (20 bytes) [Offset 50]
            pkt.writeUInt16BE(localPort, 50); // Src Port
            pkt.writeUInt16BE(remotePort, 52); // Dst Port
            pkt.writeUInt32BE(Math.floor(Math.random() * 0xffffffff), 54); // Seq Num
            pkt.writeUInt32BE(Math.floor(Math.random() * 0xffffffff), 58); // Ack Num
            pkt.writeUInt8(0x50, 62); // Data Offset (5) + Reserved
            pkt.writeUInt8(0x18, 63); // Flags (PSH, ACK)
            pkt.writeUInt16BE(8192, 64); // Window Size
            pkt.writeUInt16BE(0, 66); // Checksum (Dummy)
            pkt.writeUInt16BE(0, 68); // Urgent Pointer
            
            pcapStream.write(pkt);
          }
        } catch(e) {
          console.error('[PCAP] Error generating synthetic packet', e);
        }
      }

      // Ensure remoteAddr exists and is not local loopback
      if (!remoteAddr || remoteAddr.startsWith('127.0.0.') || remoteAddr.startsWith('192.168.') || remoteAddr.startsWith('[::1]')) return;
      
      const remoteIp = remoteAddr.split(':')[0]; // remove port
      if (!remoteIp || remoteIp === '0.0.0.0') return;

      const connectionKey = `${localAddr}-${remoteAddr}`;
      const isNewConnection = !activeConnectionsMap.has(connectionKey);
      
      // Update the Map with the current timestamp
      activeConnectionsMap.set(connectionKey, Date.now());
      
      if (isNewConnection) {
        // INSTANT LOOKUP from Cache
        const appName = processMap[pid] || 'Unknown Process';
        const geo = geoip.lookup(remoteIp);

        if (geo) {
          const endLat = geo.ll[0];
          const endLng = geo.ll[1];

          let severity = 'THREAT';
          const lowerApp = appName.toLowerCase().replace(/[\[\]]/g, '');
          
          // 1. Comprehensive Professional Heuristic Whitelist
          const SYSTEM_WHITELIST = [
            // Browsers
            'chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe', 'iexplore.exe',
            // System & Core Services
            'svchost.exe', 'explorer.exe', 'runtimebroker.exe', 'searchhost.exe', 'systemsettings.exe', 
            'mpdefendercoreservice.exe', 'taskhostw.exe', 'lsass.exe', 'csrss.exe', 'services.exe', 
            'wininit.exe', 'smss.exe', 'spoolsv.exe', 'ctfmon.exe', 'conhost.exe', 'dwm.exe', 
            'sihost.exe', 'fontdrvhost.exe', 'dllhost.exe', 'rundll32.exe', 'backgroundtaskhost.exe', 
            'applicationframehost.exe', 'securityhealthservice.exe', 'wmiadap.exe', 'wmiprvse.exe', 
            'smartscreen.exe', 'dashost.exe', 'wlanext.exe', 'audiodg.exe', 'msmpeng.exe', 'nissrv.exe',
            // Office & Productivity
            'onedrive.exe', 'winword.exe', 'excel.exe', 'powerpnt.exe', 'outlook.exe', 'filecoauth.exe',
            // Communication & Messengers
            'teams.exe', 'msteams.exe', 'discord.exe', 'zoom.exe', 'slack.exe', 'webex.exe', 
            'skype.exe', 'whatsapp.exe', 'telegram.exe', 'signal.exe', 'chatgpt.exe',
            // Development & Tools
            'antigravity.exe', 'node.exe', 'code.exe', 'python.exe', 'java.exe', 'javaw.exe', 
            'docker.exe', 'docker-desktop.exe', 'git.exe', 'language_server_windows_x64.exe',
            'behavioral_engine.exe',
            // Hardware & OEM
            'hp.hpx.exe', 'hpprinterhealthmonitor.exe',
            // Media & Gaming
            'spotify.exe', 'vlc.exe', 'steam.exe', 'epicgameslauncher.exe', 'gamingservices.exe',
            // Generic/Unidentified 
            'system', 'unknown process'
          ];
          
          let isThreat = true; // Default to true

          // RULE 1: Trusted Whitelist Check
          const isWhitelisted = SYSTEM_WHITELIST.includes(lowerApp);
          if (isWhitelisted) isThreat = false;

          // RULE 2: Domestic Traffic Check
          if (geo.country === 'IN') isThreat = false;

          // RULE 3: Flag as Threat if it fails BOTH
          const event = {
             id: connectionKey,
             appName: appName.replace(/[\[\]]/g, ''),
             dataType: `${remoteIp} (${geo.country})`,
             country: geo.country,
             severity: isThreat ? 'THREAT' : (isWhitelisted ? 'SAFE' : 'NOISE'),
             isWhitelisted: isWhitelisted,
             isThreat: isThreat,
             startLat: INDIA_CA.lat + (Math.random() - 0.5) * 5, 
             startLng: INDIA_CA.lng + (Math.random() - 0.5) * 5,
             endLat: endLat,
             endLng: endLng,
             timestamp: new Date().toISOString()
          };

          // Action 2 & 3: Generate a unique session signature and gate the event to prevent UI scrolling spam
          const cleanAppName = appName.replace(/[\[\]]/g, '');
          const sessionKey = `${cleanAppName}-${remoteIp}`;
          
          if (!knownSessions.has(sessionKey)) {
            knownSessions.set(sessionKey, Date.now());
            // EMIT ALL EVENTS (Let the frontend UI filters handle visibility)
            broadcastAndStoreLog(event);
            if (isThreat) console.log(`[ALERT] ${appName} -> ${remoteIp} (${geo.country})`);
          } else {
            // Keep the session alive so it doesn't get pruned while still active
            knownSessions.set(sessionKey, Date.now());
          }
        }
      }
    });
  });
}

// Memory Leak Fix: Prune old connections from the Map every 5 seconds
setInterval(() => {
  const now = Date.now();
  for (let [key, timestamp] of activeConnectionsMap.entries()) {
    if (now - timestamp > 30000) { // Older than 30 seconds
      activeConnectionsMap.delete(key);
    }
  }
  
  // Action 4: Session Pruning for knownSessions (60 second TTL)
  for (let [key, timestamp] of knownSessions.entries()) {
    if (now - timestamp > 60000) {
      knownSessions.delete(key);
    }
  }
  // Emit updated map size to the UI
  io.emit('active_count', activeConnectionsMap.size);
}, 5000);

// Throttled endpoint broadcast — fires exactly once per second to prevent WebSocket thread flooding
setInterval(() => {
  // If no LAN IPs detected, default to 1 (the local machine itself is always protected)
  const count = activeEndpoints.size > 0 ? activeEndpoints.size : 1;
  io.emit('endpoint_count', count);
}, 1000);

console.log(`\n=================================================`);
console.log(`🚀 NetGuard OPTIMIZED LIVE SNIFFER STARTED 🚀`);
console.log(`=================================================`);
console.log(`[!] Passively scanning system network activity...`);
console.log(`[!] Optimized: Process caching (5s) enabled for real-time feed.`);

// Poll connections every 1 second
setInterval(pollNetwork, 1000);

// We still disable any leftover old registry proxy on start just in case it was there
try {
  const { execSync } = require('child_process');
  execSync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f');
  console.log('[+] Verified: All experimental Windows proxy intercepts are cleaned/removed.');
} catch(e) {}
