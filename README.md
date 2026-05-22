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
*   Includes dark-styled tables, automated tricolour accent margins, and distinct rows highlighting active threats.

### 🐍 Packet Capture & Behavioral Analysis
*   `enterprise_tap.py`: A Python script using `scapy` to capture raw network packets in promiscuous mode (requires Administrator rights).
*   `behavioral_engine.py`: Scans the packet log file for anomalies (like payloads greater than 1000 bytes leaving the local network) and alerts the Node.js backend.
*   Detects the active network interface automatically on launch.

### 🤖 AI Copilot (Local Ollama)
*   **Local LLM Integration**: Uses a local Ollama instance running `llama3.2:1b` to act as an offline cybersecurity analyst.
*   **Express AI Bridge**: Has a `/api/copilot` POST route that feeds the 15 most recent network events as context to the model.
*   **Smart Greeting Directive**: Automatically catches simple greetings (like "hi" or "hello") to reply with a friendly, professional intro instead of dumping or analyzing the logs unnecessarily.

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

### 🧠 3. Local AI Copilot Setup
To enable the offline AI chatbot:
1. Install **[Ollama](https://ollama.com/)** on your system.
2. In your terminal, download and start the model:
   ```bash
   ollama run llama3.2:1b
   ```
3. Once the model is active, the dashboard will automatically connect and route chats through `http://localhost:11434`.

*Note: The frontend dashboard will run fine with just the Node backend (`server.js` using netstat polling). The Python Scapy Tap and Ollama are optional add-ons to unlock deeper packet metrics and interactive chats.*
