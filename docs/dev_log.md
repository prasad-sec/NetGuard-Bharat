# 🛡️ NetGuard Bharat - Project Dev Log

This dev log tracks our system implementation steps, key technical decisions, refactors, and optimization details from the ground up.

---

## ⚙️ Technical Architecture Overview
The system consists of three main components:
1.  **Frontend Dashboard**: A React application built with Vite, utilizing Socket.IO-client, Tailwind CSS, Three.js (for the 3D Globe), and jsPDF (for threat reports).
2.  **Express Proxy Server**: A Node.js backend executing native system commands (`netstat`, `tasklist`) to passively collect active sockets, process PIDs, and application executable names, streaming them in real time to the frontend.
3.  **Python Sniffing Tap**: A raw packet sniffer (`enterprise_tap.py`) using Scapy and a behavioral alert parser (`behavioral_engine.py`) that monitors log anomalies and reports them to the Express API.

---

## 📅 Chronological Progress & Sprint Details

### 🚀 Phase 1: Core Setup & Sockets Pipeline
*   Bootstrapped the React client using Vite for rapid hot reload.
*   Setup the Express proxy server (`proxy-server/server.js`) to poll current network connections. To avoid massive CPU overhead under active traffic, we implemented a **5-second caching mechanism** that polls `tasklist /FO CSV` at intervals and uses this cache to map active socket PIDs to executable names.
*   Wrote the raw Python sniffer (`enterprise_tap.py`) with Scapy and the behavioral engine (`behavioral_engine.py`) to tail baseline network logs, watch for outbound payloads larger than 1000 bytes, and trigger critical threats via an Express API endpoint `/api/alert`.

### 🌍 Phase 2: WebGL 3D Globe
*   Built `GlobeMap.jsx` using Three.js to render a stylized 3D earth.
*   Plotted coordinates of active outbound connections leaving India and drawn glowing bezier curves to target endpoints.
*   *Performance Safeguard*: Capped the maximum rendering to 30 active curves at a time to prevent WebGL browser tabs from lagging or crashing.

### 🎨 Phase 3: Cockpit Interface & Live Filters
*   Integrated a slate dark-mode look using modern typography (`Share Tech Mono`) and blur backdrop glassmorphic boxes.
*   Added live filters: Stealth Mode (hides whitelisted applications), Noise Mode (exposes internal background OS calls), and Geofencing (flags all non-Indian connections as threats).
*   Added an interactive collapsible alert panel (collapsible accordion list of the 10 most recent threat alerts) displaying raw socket info, and a scrolling live JSON console showing raw network packets.
*   Added a quick mitigation modal that gives step-by-step instructions on firewalls, task manager, and revoking permissions.

### 📡 Phase 4: Tricolour Exporter & Real Pings
*   Swapped Native alerts with standard `react-hot-toast` notifications. Built a custom, manual dismiss button `toast.dismiss()` with resilient string fallbacks.
*   Built a professional PDF exporter using `jsPDF` and `jspdf-autotable`. Added Indian tricolour styling bars on top and bottom of each exported page, conditional row highlighting for active threats, and confindentail metadata labels.
*   Cleaned React reconciliation warning keys by building compound, unique bulletproof key strings for lists.
*   Optimized system memory by capping log arrays to 100 items on both the backend memory array and React state, solving client-side DOM bloat.
*   Wired the left-panel stats to cumulative connection/alert states that track lifetime sessions indefinitely and fully reset on clicking `Sweep`.
*   Replaced mock heartbeat loops with an authentic roundtrip WebSocket latency ping interval (firing every 3 seconds) with local network clamp `Math.max(1, timeDiff)` for accurate network state display.

### 🧹 Phase 5: Git Cleanup & Association
*   Added a root `.gitignore` ignoring common environment artifacts (`node_modules/`, `__pycache__/`, `.vscode/`, `.DS_Store`).
*   Untracked previously cached system files in Git cache, reducing source staging to 20 lightweight, structured files.
*   Configured remote origin association pointing to `https://github.com/prasad-sec/NetGuard-Bharat.git` and pushed main to remote.

### 🤖 Phase 6: Local AI Copilot Integration (Ollama)
*   Created `/api/copilot` Express POST bridge to integrate local Ollama instance running the `llama3.2:1b` model.
*   Compiled a prompt context feeding the model the 15 most recent network activity logs. Added robust status check and elegant error handling fallback messages in case the local Ollama instance is offline.
*   Built an interactive, scrollable chat panel in the right sidebar featuring auto-scroll to bottom.

### 🔒 Phase 7: Strict CORS & Alerts Muter Refactor
*   Hardlocked backend CORS security by defining a strict `corsOptions` object explicitly limiting request origin to our Vite frontend (`http://localhost:5173`) and allowing only `GET` and `POST` methods.
*   Resolved React closure bugs inside the Socket `useEffect` event loop by implementing a synchronized `isMuted` state and `muteRef`.
*   Placed a subtle, clickable bell button (`🔔`/`🔕`) next to the "NETGUARD BHARAT" main title in the header, keeping the left controls panel flexbox aligned and clean.
*   Wrapped the visual red pulses (`threat-pulse`), toast pop-ups, and audio siren pings inside `!muteRef.current` filters in the Socket listener, letting telemetry data arrays and UI statistics update silently without alert fatigue.
*   Engineered system chat prompt instructions inside `/api/copilot` to check for simple greetings (such as "hi" or "hello") and respond professionally without scanning or printing logs unnecessarily.

### 🧠 Phase 8: Cloud AI (Gemini) Integration & Architecture Stabilization
*   **Dual-Engine Architecture**: Integrated the `@google/generative-ai` SDK, establishing a seamless toggle between Local Edge AI (Ollama) and Cloud AI (Gemini Flash) inference pipelines directly from the frontend interface.
*   **Zero-Trust Data Sanitization**: Implemented a `sanitizeLogs` middleware function to intercept payload transmissions to the Cloud engine. This protocol securely scrubs raw IP routing data, substituting it with `[REDACTED_IP]` to enforce strict data privacy.
*   **Extended Context Window**: Expanded the AI's sliding context window to analyze the 50 most recent logs. System prompt instructions were refined to acknowledge data redactions and absent payload schema metrics, thereby mitigating model hallucination.
*   **Memory Leak Resolution**: Resolved an unbounded accumulation bug within the backend connection tracker. Migrated the stateless counter to a timestamp-driven `activeConnectionsMap`, and deployed a 5-second garbage collection cycle to prune socket data exceeding a 30-second TTL.
*   **CSS Stacking Context Fix**: Resolved an issue where the Copilot modal overlay was constrained by the parent container's `backdrop-filter`. The rendering logic was refactored to conditionally disable the filter during expansion, allowing the `position: fixed` architecture to correctly bind to the viewport.
*   **UI Hierarchy Scaling**: Executed a precision scaling pass on the Left Panel interface, reducing button dimensions and standardizing component gaps to achieve a compact, enterprise-grade aesthetic.

### 📈 Phase 9: Rich Text & Flowcharts in AI Chat
*   Brought in `react-markdown` and `remark-gfm` so the Copilot's responses actually look good with proper formatting, tables, and lists instead of just plain text blocks.
*   Added a custom `MermaidChart.jsx` component that catches any code blocks tagged with `mermaid` and renders them live as SVG diagrams using the `mermaid` library.
*   This lets the AI dynamically draw flowcharts to explain attack paths, break down networking concepts, or map out system architecture on the fly right inside the chat sidebar.
