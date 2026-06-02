# 🛡️ NetGuard Bharat

NetGuard Bharat is a real-time network monitoring dashboard and data exfiltration visualizer. It monitors outbound socket connections, runs a passive packet-sniffing tap in the background, and maps network traffic dynamically onto an interactive 3D globe. 

The project is built to help identify anomalous outbound traffic, track where local processes are sending data, and provide threat mitigation guides.

---



## 🚀 Key Features

### 🌍 Interactive 3D Globe
*   Built with React, Vite, and Three.js.
*   Plots active outbound connections as glowing lines connecting India to target countries based on their destination IPs.
*   Includes automatic performance capping (rendering a maximum of 30 active arcs at a time) to avoid browser lag.

### 📡 Real-Time Socket Monitoring & Express Backend
*   A lightweight Node.js server that polls current socket connections using native OS tools (`netstat` and `tasklist`).
*   Maps active connection PIDs to executable application names, using a 5-second process name cache to minimize CPU usage.
*   Streams socket data in real time via Socket.IO to the client dashboard.
*   Exposes an `/api/alert` POST route to receive and display behavioral flags from external network taps.

### 🎨 UI Aesthetics & Custom Filters
*   **Indian Tricolour Header**: Designed with a glowing gradient matching the Indian flag.
*   **System Status HUD**: Displays active protection status, real roundtrip WebSocket latency, and cumulative connection/leak counters.
*   **Traffic Filters**: Left-panel buttons to toggle Stealth Mode (hides safe/known traffic), Noise Mode (shows internal OS chatter), and Geofencing (highlights non-Indian traffic as alerts).
*   **Silence Alerts Toggle**: A bell button (`🔔`/`🔕`) in the header next to the title. When clicked, it silences all audio sirens, red visual pulses, and pop-up toast alerts, while still feeding the real-time logs and statistics in the background.

### 📊 Live Logs & Mitigation Actions
*   **Intel Feed**: An accordion-based list of the 10 most recent threat alerts. Click any card to see payload sizes, process names, and timestamps.
*   **Live JSON Terminal**: A terminal-style scrolling console that displays raw connection packets color-coded by severity (red for threats, cyan for safe, yellow for noise).
*   **Take Action Panel**: A quick-mitigation pop-up that guides you through closing malicious processes, blocking outbound IPs via firewall rules, and revoking privacy permissions.

### 📄 Threat Report Exporter
*   Generates clean, professional PDF reports on-demand using `jsPDF` and `jspdf-autotable`.
*   Includes a soft-white readable background with premium dark slate text, mapped full country names, automated tricolour accent margins, and styled dynamic row badges highlighting active threats.
*   Enforces accurate, localized timestamps and strict reverse-chronological sorting to guarantee complete log fidelity.

### 🐍 Packet Capture & Behavioral Analysis
*   `enterprise_tap.py`: A Python script using `scapy` to capture raw network packets in promiscuous mode (requires Administrator rights).
*   `behavioral_engine.py`: Scans the packet log file for anomalies (like payloads greater than 1000 bytes leaving the local network) and alerts the Node.js backend.
*   Detects the active network interface automatically on launch.

### 🤖 AI Copilot (Dual-Engine: Edge + Cloud)
*   **Local Edge AI (Ollama)**: Deploys a local `llama3.2:1b` model for offline, private cybersecurity analysis, ensuring zero external data transmission.
*   **Cloud AI (Gemini)**: Integrates the `@google/generative-ai` API utilizing the `gemini-2.5-flash` model for high-speed, comprehensive threat inference.
*   **Data Privacy Middleware**: Actively intercepts and scrubs raw IP address telemetry, substituting it with `[REDACTED_IP]` on the backend prior to any cloud transmission.
*   **Dynamic Prompting**: Seamlessly switches inference pipelines, identifies conversational greetings to bypass log analysis, and evaluates threats using a 50-log sliding context window.
*   **Rich Chat Visualization**: The chat interface formats responses with full Markdown (tables, lists) and renders Mermaid.js diagrams on the fly, allowing the AI to visually map out attack paths or explain network concepts right in the conversation.

---

## 🛠️ Getting Started

### 💻 1. Run the Dashboard & Express Backend
You need two terminals:
```bash
# Terminal 1: Run the backend
cd proxy-server
node server.js
```

```bash
# Terminal 2: Run the React app
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### ⚙️ 2. Run the Packet Sniffer (Python)
Because the Python script sniffs raw network packets in promiscuous mode, **you must run it with Administrator privileges**:
1. Open PowerShell or Command Prompt as **Administrator**.
2. Navigate to the backend folder:
   ```cmd
   cd backend
   ```
3. Start the tap:
   ```cmd
   python enterprise_tap.py
   ```
4. (Optional) Run the analyzer engine in another terminal to forward alerts to the dashboard:
   ```cmd
   python behavioral_engine.py
   ```

### 🧠 3. AI Copilot Setup (Local & Cloud)
To enable the interactive chatbot, you may configure the Local engine, the Cloud engine, or both.

**For Local Edge Inference (Ollama):**
1. Install **[Ollama](https://ollama.com/)** on your host system.
2. Download and initialize the local model:
   ```bash
   ollama run llama3.2:1b
   ```

**For Cloud Inference (Gemini):**
1. Generate a Gemini API Key via Google AI Studio.
2. Create a `.env` configuration file within the `proxy-server` directory.
3. Define the environment variable as follows:
   ```env
   GEMINI_API_KEY="your-api-key-here"
   ```

*Note: The frontend dashboard operates independently with the Node backend (`server.js`). The Python packet tap and AI inference engines are modular extensions designed for advanced behavioral analysis.*
