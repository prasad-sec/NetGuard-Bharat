# Development Log - NetGuard Bharat

This file documents the chronological implementation details, design decisions, and system modifications from the absolute beginning (scratch/bootstrap) of the development cycle.

---

## 🎯 Executive Project Goal
**NetGuard Bharat** was envisioned as an enterprise-grade, real-time data exfiltration visualizer and Zero-Trust network monitoring dashboard. It passively intercepts outbound socket connections, performs deep packet inspection via behavioral heuristics, and maps telemetry data dynamically onto an interactive 3D globe.

---

## 📅 Chronological Development History

### Phase 1: Project Bootstrapping & Core Architecture
*Goal: Initialize the client, server, and packet tapping systems from a blank canvas.*

1. **Frontend Bootstrapping**:
   - Initialized a React application using **Vite** for optimized building and rapid Hot Module Replacement (HMR).
   - Integrated package dependencies including **Three.js** (for 3D rendering), **Socket.io-client** (for real-time streaming), **Lucide-react** (for icons), and **jsPDF** with **jspdf-autotable** (for threat reports).
2. **Backend Proxy Server Creation**:
   - Initialized the `proxy-server` directory with Express and Socket.IO.
   - Developed `server.js` to continuously poll local socket states using Windows `netstat` and match active PIDs to application names using `tasklist` with a **5-second caching mechanism** to prevent CPU spikes.
3. **Deep Packet AI (Python Enterprise Tap)**:
   - Authored `enterprise_tap.py` using `scapy` to intercept low-level raw network packets promiscuously (requiring Admin rights).
   - Created a modular ML/heuristic hook to output structured logs to `network_baseline.log`.
   - Developed `behavioral_engine.py` to tail the baseline logs, analyze for data exfiltration patterns (e.g., payloads > 1000 bytes leaving the local network), and flag anomalous activities to the Node.js API endpoint `/api/alert`.

---

### Phase 2: 3D Visualization Layer
*Goal: Construct an immersive 3D visualization to track global exfiltration paths.*

1. **Globe Architecture (`GlobeMap.jsx`)**:
   - Developed a responsive 3D WebGL cyber globe using custom rendering logic.
   - Mapped geographic coordinate datasets to project active outbound connections.
2. **Telemetry Arcs**:
   - Coded glowing bezier curves that originate from India and land precisely on the destination country's latitude and longitude.
   - **Performance Safeguard**: Implemented strict rendering limits capping visible active arcs to `30` at any time to prevent browser freezes.

---

### Phase 3: Premium UI & Glassmorphism Aesthetics
*Goal: Overhaul the visual interface with a dark cyber-defense cockpit theme.*

1. **Custom Styling System (`index.css`)**:
   - Authored a custom styling suite utilizing a modern glassmorphism structure (blur backdrops, glowing borders, slate dark theme).
   - Styled text typography utilizing modern fonts (`Share Tech Mono` and `Inter`) imported from Google Fonts.
2. **Animated Tricolour Branding**:
   - Implemented an animated Indian tricolour CSS gradient header for `NETGUARD BHARAT` (Saffron, White, and India Green) with glowing dropshadow keyframe animations.
3. **Controls and Intelligence Filters**:
   - Integrated real-time controls including a Zero-Trust `SHIELD` toggle and a live `PCAP LOGGING` indicator.
   - Added user toggles for **Stealth Mode** (hides whitelisted/safe traffic), **Noise Mode** (includes background OS chatter), and **Geofencing** (flags non-Indian connections as threats).
4. **AI Copilot**:
   - Built a summary card reporting active threats, safe events, and background noise to the user at a glance.

---

### Phase 4: Threat Intelligence Feed & Reporting
*Goal: Enable interactive threat mitigation and formal security reports.*

1. **Accordion Feed**:
   - Created an expandable accordion-style Intelligence Feed listing the 10 most recent events. Expanded cards reveal exact IP metrics, timestamp, country, and payload size.
2. **Raw Scrolling Terminal**:
   - Designed a FIFO terminal log listing pure JSON stream packets. Color-coded log lines by severity: red (`[THREAT]`), cyan (`[SAFE]`), yellow (`[NOISE]`).
3. **Mitigation Action Guide**:
   - Added a "Take Action" modal that guides administrators through ELI5 resolution steps (terminating tasks, revoking network permissions, adding outbound IP block rules).
4. **Tricolour PDF Exporter**:
   - Integrated `jsPDF` to generate Confidentially-labeled threat reports (`NetGuard_Threat_Report_*.pdf`).
   - Decorated reports with top/bottom tricolour bars, dark-mode tables, and conditional red highlighting for flagged connections.

---

### Phase 5: Notification UX & Typography Overhaul
*Goal: Improve legibility, reduce alert fatigue, and refine interface responsiveness.*

1. **Typography Scaling**:
   - Changed the custom `.action-btn` class inside `index.css` to scale base font-size from `0.75rem` (12px) to `0.875rem` (14px, `text-sm`) to increase control button legibility.
   - Explicitly assigned Tailwind's `text-sm` class to all dashboard controls and intelligence filter buttons.
   - Refined the Telemetry Grid wrapper class to a clean `text-xs` with data values highlighted in bold `text-sm font-semibold`.
2. **Terminal-Style Toast Alerts**:
   - Replaced native browser alerts with custom `react-hot-toast` error notifications.
   - Styled toasts using custom borders (`borderLeft: '4px solid #ef4444'`) and a dark palette (`background: '#0f172a'`, `color: '#f8fafc'`).
3. **Manual Dismissal Button**:
   - Passed the toast context reference `(t)` and integrated a functional close button (`✕`) executing `toast.dismiss(t.id)` dynamically.
   - Added robust string fallbacks (`Unknown.exe`, `US-EAST`, `52.118.16.1`) for all notification parameters.

---

### Phase 6: React Key Optimization & Stateful Capping
*Goal: Resolve React rendering bugs and prevent client/server memory leaks.*

1. **React Reconciliation Keys**:
   - Fixed standard key duplicate console warnings. Implemented composite, bulletproof key signatures for feed arrays:
     - Intel Feed: ``key={`${leak.id || 'leak'}-${leak.timestamp || idx}-${idx}}``
     - Raw Packet Logs: ``key={`${log.id || 'raw'}-${log.timestamp || idx}-${idx}}``
2. **Stateful 1000-Log Capped Backend Buffer**:
   - Modified `server.js` to store a `logHistory` memory array capped strictly at `1000` items using a FIFO `shift()` operation to avoid memory leaks.
3. **Log Synchronization**:
   - Added socket event listener `log_history` to instantly hydrate frontend clients with full history when connecting.
   - Implemented a corresponding strict `1000` array cap on the frontend React state.
4. **Wired Sweep Sync**:
   - Rebuilt `clearLogs` to emit a `clear_logs` instruction to the proxy server, which resets the server buffer and broadcasts `logs_cleared` to synchronize all active frontend client displays.

### Phase 7: Live HUD Statistics & Latency Heartbeat
*Goal: Wire Left Panel HUD counters to live state arrays and simulate active telemetry pings.*

1. **Dynamic Left Panel Counters**:
   - Connected the "Total Leaks Detected" stat box directly to the dynamic length of the active threat/leaks array: `{leaks.length || 0}`.
   - Connected the "Active Connections" stat box directly to the dynamic length of the raw logs array: `{rawLogs.length || 0}`.
2. **Fluctuating Latency Heartbeat**:
   - Implemented an inline state `latency` and a `setInterval` loop executing every 3 seconds to randomly fluctuate latency between `8ms` and `25ms` to simulate active system heartbeat/pings.
   - Wired the dynamic `{latency}ms` value into the Telemetry Grid under the `LATENCY` indicator.

### Phase 8: Performance Optimization & DOM Bloat Fix
*Goal: Prevent DOM bloat and optimize rendering performance alongside the WebGL 3D Globe.*

1. **Stateful Cap Reduction**:
   - Reduced the maximum network event log buffer retention from `1000` items to `100` items on both the backend proxy (`server.js`) and the React client state (`App.jsx`).
   - Prevents memory leaks and maintains high-performance rendering under prolonged monitoring sessions.

### Phase 9: Real WebSocket Latency, Lifetime Counter & Export Hook
*Goal: Overhaul visual systems to measure authentic system metrics and enable data exports.*

1. **Independent Connections & Leak Counters**:
   - Decoupled active connection metrics and leak tracking from frontend display array sizes. Introduced independent cumulative states `lifetimeConnections` (tracks all packet events) and `lifetimeLeaks` (tracks threat alerts specifically) that increment indefinitely regardless of array limits.
   - Synchronized these counters with the **Sweep Logs** function so that triggering a sweep resets both values back to `0`.
2. **Real Roundtrip Latency Ping**:
   - Swapped fake randomized telemetry heartbeat loops with an authentic real-time WebSocket roundtrip ping.
   - The React client emits a `custom_ping` signal every 3 seconds, and the Node Express proxy measures the roundtrip milliseconds using an immediate execution callback hook.
   - Implemented a local network clamp `Math.max(1, timeDiff)` on the client to guarantee a minimum `1ms` value on local/localhost environments.
3. **CSV Export Trigger**:
   - Replaced the redundant "Test Alert" button in the Left Panel controls with a direct CSV export trigger (`⭳ EXPORT ALL (CSV)`) to download complete historical event logs.

### Phase 10: Pristine Environment & Service Restart
*Goal: Remove legacy workspace clutter and execute a clean startup sequence for all core services.*

1. **Workspace De-Cluttering**:
   - Cleaned the repository root, removing the temporary helper script `findOldApp.js`.
   - Deleted the editor-specific `.vscode` directory to ensure a fully clean environment.
2. **Server Life Cycle Restart**:
   - Successfully terminated the existing proxy and frontend processes.
   - Cleanly restarted the **Express Proxy Server** (`node server.js` on Port `3002`) and the **Vite Dev Server** (`npm run dev` on Port `5173`) with live WebSocket synchronization.

### Phase 11: Git Optimization & Index Cache Reset
*Goal: Prevent tracking of non-project dependencies and clean Git index cache.*

1. **Root Gitignore Implementation**:
   - Created a root-level `.gitignore` inside `NetGuardBharat/` ignoring Node modules (`node_modules/`, debug logs), Python caches (`__pycache__/`, `.pyc`, environments like `venv/` or `env/`), and OS meta files (`.DS_Store`, `Thumbs.db`).
2. **Index Cache Re-indexing**:
   - Ran standard Git cache clearing commands to untrack all previously staged files and staged only the target source code. Staged files reduced to 20 core configuration and source files.

### Phase 12: Controlled Server Shutdown
*Goal: Suspend local development servers safely.*

1. **Service De-activation**:
   - Cleanly stopped all active background developer instances: the **Express Proxy Server** (Port `3002`) and the **Vite Dev Server** (Port `5173`).
   - Verified clean process termination.

### Phase 13: GitHub Remote Publish
*Goal: Securely publish the pristine repository to GitHub.*

1. **Remote Association**:
   - Associated the local repository with the remote URL: `https://github.com/prasad-sec/NetGuard-Bharat.git`.
2. **Push to GitHub**:
   - Renamed default branch to `main`.
   - Successfully pushed the optimized repository history directly to GitHub.

### Phase 14: Backend Local AI Integration (Ollama Copilot)
*Goal: Integrate a local Ollama instance running the 'llama3.2:1b' model as our AI Copilot by creating a bridge endpoint in the Express server.*

1. **AI Copilot Endpoint (`/api/copilot`)**:
   - Created a new POST route at `/api/copilot` in `server.js` that accepts a JSON body containing an optional `userQuery` string.
2. **Context Gathering & Prompting**:
   - Safely extracted up to the 15 most recent network telemetry items from the existing `logHistory` memory array to serve as context.
   - Constructed a professional cybersecurity analyst persona ("You are NetGuard Copilot...") and compiled the logs dynamically, appending any custom user queries at the end.
3. **Local Ollama Integration**:
   - Configured native asynchronous `fetch` requests targeting the local Ollama generator at `http://localhost:11434/api/generate` with model `llama3.2:1b` and `stream: false`.
   - Handled success paths by parsing the generated `response` text and returning `{ reply: ... }` with a 200 status code, and integrated robust error handling that returns a 500 status code with a safe fallback error message if the Ollama service is offline.

### Phase 15: Frontend AI Copilot UI Integration
*Goal: Integrate the interactive AI Copilot chat window into the right-hand panel of the dashboard.*

1. **State Management**:
   - Added `chatHistory` state initialized with a default system greeting.
   - Added `isCopilotLoading` to display a blinking indicator when the model is processing.
   - Added `copilotInput` to bind the text field.
2. **Interactive UI**:
   - Created a dynamic tab panel on the right sidebar containing an "AI Copilot" tab.
   - Designed a scrollable chat thread matching the premium cyber-defense cockpit theme.
   - Integrated automatic scroll-to-bottom on new messages.

### Phase 16: Zero-Trust CORS Lockdown & Notification Mute Toggle
*Goal: Enforce strict backend security policies and introduce a premium glassmorphic alert mute switch.*

1. **Strict CORS (Backend)**:
   - Replaced wildcard CORS with a strict configuration in `server.js` allowing only `http://localhost:5173` with allowed `GET` and `POST` methods and `Content-Type` headers.
2. **Notification Mute State (`isMuted` & `muteRef`)**:
   - Declared a boolean state `isMuted` (default false) and a matching `muteRef` to feed changes dynamically to the high-frequency Socket.io event loop bypassing closures.
3. **Glassmorphic Toggle Button**:
   - Added a "Mute Toggle" button in the Left Panel controls.
   - Styled using custom cyber-red styling (`glow-red`, `bg-red-950/20`, etc.) when `isMuted` is active to alert administrators.
4. **Conditional Trigger Suppression**:
   - Wrapped threat visual/audio executions (toasts, siren pings, body red pulses) inside an `if (!muteRef.current)` block inside the connection socket stream, keeping cumulative metrics and logs silent but fully functional.
### Phase 17: UI Refactoring & LLM Prompt Optimization
*Goal: Restructured layout alignment, moved alerts switch to Header, and engineered conversational logic.*

1. **Header-Level Mute Switch (Action 1 & 2)**:
   - Restored original Left Panel flexbox/grid layout and removed the large button to recover pixel-perfect sidebar sizing.
   - Designed a responsive, elegant 28x28px toggle button placed next to the "NETGUARD BHARAT" main title.
   - Wired standard `🔔` (Alerts Active) and slashed `🔕` (Alerts Muted) emojis/icons dynamically with the `isMuted` and `muteRef` hooks.
2. **Explicit CORS options (Action 3)**:
   - Configured `server.js` using a explicit `corsOptions` strict configuration object to secure HTTP endpoint requests.
3. **Greeting Directives for Local AI (Action 4)**:
   - Refined system instructions inside `/api/copilot` in `server.js`.
   - Added specific rules ensuring the AI responds professionally to basic greetings (like "hi" or "hello") without dump-analyzing telemetry logs, reserving context scanning only for explicit user inquiries.

---

## 🛠️ Port Layout & Service Infrastructure

- **Vite Frontend Server**: `http://localhost:5173/` (HMR enabled)
- **Node.js Express Proxy API**: Port `3002` (WebSocket stream active)
- **Python Packets Collector**: Passive Promiscuous Sniffer listening locally

---

*Development log maintained continuously from scratch by the pair-programming team.*


