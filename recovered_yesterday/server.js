        prompt += `\n\nUser Query: ${userQuery}`;
      }
      return prompt;
    };

    if (aiEngine === 'cloud') {
      console.log("[☁️ CLOUD ENGINE] Routing request to Gemini (Sanitized Data)...");
      const scrubbedLogs = sanitizeLogs(recentLogs);
      const cloudPrompt = buildPrompt(scrubbedLogs, true);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(cloudPrompt);
      const response = await result.response;
      const text = response.text();
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