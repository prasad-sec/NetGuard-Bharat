const { exec } = require('child_process');
const geoip = require('geoip-lite');
const { Server } = require('socket.io');
const express = require('express');
const http = require('http');

const SOCKET_PORT = 3002;

const app = express();
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

const INDIA_CA = { lat: 21.0, lng: 78.0 }; // Default origin point for India

// --- ENTERPRISE AI INTEGRATION ENDPOINT ---
app.post('/api/alert', (req, res) => {
  const telemetry = req.body;
  if (!telemetry || !telemetry.destination_ip) {
    return res.status(400).send({ error: "Invalid telemetry data" });
  }

  const remoteIp = telemetry.destination_ip;
  const geo = geoip.lookup(remoteIp);
  const country = geo ? geo.country : 'Unknown';
  
  const endLat = geo ? geo.ll[0] : 0;
  const endLng = geo ? geo.ll[1] : 0;

  // Emit critical threat event directly to the frontend Dashboard
  const event = {
    id: `anomaly-${Date.now()}-${Math.random()}`,
    appName: "Deep Packet AI", // Specific app name to stand out in the UI
    dataType: `${remoteIp} (${country})`,
    country: country,
    severity: telemetry.severity || "CRITICAL",
    isWhitelisted: false,
    isThreat: true,
    startLat: INDIA_CA.lat + (Math.random() - 0.5) * 5, 
    startLng: INDIA_CA.lng + (Math.random() - 0.5) * 5,
    endLat: endLat,
    endLng: endLng,
    timestamp: telemetry.timestamp || new Date().toISOString(),
    message: telemetry.message
  };

  addLogToHistory(event);
  io.emit('leak_event', event);
  console.log(`\n[🚨 AI THREAT DETECTED] Deep Packet AI flagged anomaly to ${remoteIp} (${country})`);
  
  res.status(200).send({ success: true, message: "Alert processed and broadcasted." });
});

server.listen(SOCKET_PORT, () => {
  console.log(`[+] Express API & WebSockets running for Dashboard on port ${SOCKET_PORT}`);
});

let isMonitoring = true;

const connectedSockets = new Set();
io.on('connection', (s) => {
  connectedSockets.add(s);
  
  // Hydrate client with existing log history on connection
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
let activeConnectionsCache = new Map(); // To avoid spamming the same connection
let totalActive = 0;

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
    totalActive = lines.length;

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return;
      
      const localAddr = parts[1];
      const remoteAddr = parts[2];
      const pid = parts[4];

      // Ensure remoteAddr exists and is not local loopback
      if (!remoteAddr || remoteAddr.startsWith('127.0.0.') || remoteAddr.startsWith('192.168.') || remoteAddr.startsWith('[::1]')) return;
      
      const remoteIp = remoteAddr.split(':')[0]; // remove port
      if (!remoteIp || remoteIp === '0.0.0.0') return;

      const connectionKey = `${pid}-${localAddr}-${remoteAddr}`;
      
      if (!activeConnectionsCache.has(connectionKey)) {
        // INSTANT LOOKUP from Cache
        const appName = processMap[pid] || 'Unknown Process';
        const geo = geoip.lookup(remoteIp);

        if (geo) {
          const endLat = geo.ll[0];
          const endLng = geo.ll[1];

          let severity = 'THREAT';
          const lowerApp = appName.toLowerCase().replace(/[\[\]]/g, '');
          
          // 1. Professional Heuristic Whitelist
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
            // Hardware & OEM
            'hp.hpx.exe', 'hpprinterhealthmonitor.exe',
            // Media & Gaming
            'spotify.exe', 'vlc.exe', 'steam.exe', 'epicgameslauncher.exe', 'gamingservices.exe',
            // Generic/Unidentified 
            'system', 'unknown process'
          ];
          
          let isThreat = true; // Default to true [Rule 3]

          // RULE 1: Trusted Whitelist Check (Green/Silent)
          const isWhitelisted = SYSTEM_WHITELIST.includes(lowerApp);
          if (isWhitelisted) isThreat = false;

          // RULE 2: Domestic Traffic Check (Green/Silent)
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

          // EMIT ALL EVENTS (Let the frontend UI filters handle visibility)
          addLogToHistory(event);
          io.emit('leak_event', event);
          if (isThreat) console.log(`[ALERT] ${appName} -> ${remoteIp} (${geo.country})`);
          
          activeConnectionsCache.set(connectionKey, true);
        }
      }
    });

    io.emit('active_count', totalActive);
    
    // FAST REFRESH: Clear cache every 10 seconds to keep the globe "Live"
    // This ensures recurring connections are re-emitted and visualized.
    if (!global.cacheClearTimer) {
      global.cacheClearTimer = setInterval(() => {
        activeConnectionsCache.clear();
        console.log('[SYSTEM] Connection cache flushed for real-time visualization.');
      }, 10000);
    }
  });
}

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

