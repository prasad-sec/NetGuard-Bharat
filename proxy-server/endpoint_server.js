const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());

app.get('/api/endpoints', (req, res) => {
  const endpoints = [
    { ip: '127.0.0.1 (Localhost)', mac: 'System-Host-Adapter', status: 'SECURED (HP Victus Gateway)' }
  ];

  exec('arp -a', (error, stdout, stderr) => {
    if (error) {
      return res.json(endpoints);
    }

    const lines = stdout.split('\n');
    const ipRegex = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      
      if (parts.length >= 3) {
        const ip = parts[0];
        const mac = parts[1];

        if (ip.startsWith('224.') || ip.startsWith('239.') || ip.endsWith('.255') || ip === '255.255.255.255') {
          continue;
        }

        if (ipRegex.test(ip)) {
          if (ip === '192.168.0.1' || ip === '192.168.1.1') {
            endpoints.push({ ip, mac: mac.toUpperCase(), status: 'INFRASTRUCTURE (Router)' });
          } else if (ip !== '127.0.0.1' && ip !== '192.168.137.1') {
            endpoints.push({ ip, mac: mac.toUpperCase(), status: 'SECURED (Active Node)' });
          }
        }
      }
    }

    res.json(endpoints);
  });
});

app.listen(3001, () => {
  console.log('Local Network Scanner API listening on port 3001');
});
