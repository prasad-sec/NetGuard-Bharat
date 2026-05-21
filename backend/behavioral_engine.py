import os
import time
import json
import requests
import threading

LOG_FILE = "network_baseline.log"
PROXY_SERVER_URL = "http://localhost:3002/api/alert"

def is_local_or_multicast(ip):
    """
    Returns True if the IP is a local network address, loopback, or multicast.
    """
    if not ip:
        return True
    
    prefixes = (
        "192.168.", 
        "10.", 
        "172.", # Simplified check for 172.16.x.x - 172.31.x.x
        "127.", 
        "224.", 
        "239.",
        "255.255.255.255"
    )
    return ip.startswith(prefixes)

def send_alert(telemetry):
    """
    Sends the anomalous telemetry to the Node.js Proxy Server.
    """
    try:
        # Create a formatted payload for the proxy server
        alert_payload = {
            "source_ip": telemetry.get("source_ip"),
            "destination_ip": telemetry.get("destination_ip"),
            "protocol": telemetry.get("protocol"),
            "payload_length": telemetry.get("payload_length"),
            "timestamp": telemetry.get("timestamp"),
            "severity": "CRITICAL",
            "message": f"Large payload exfiltration ({telemetry.get('payload_length')} bytes) detected!"
        }
        
        response = requests.post(PROXY_SERVER_URL, json=alert_payload, timeout=2)
        if response.status_code == 200:
            print(f"[!] SENT ALERT TO DASHBOARD -> {telemetry['destination_ip']} ({telemetry['payload_length']} bytes)")
        else:
            print(f"[-] Failed to send alert, proxy responded with {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Could not connect to Proxy Server at {PROXY_SERVER_URL}")

def tail_and_analyze(file_path):
    """
    Tails the log file in real-time and applies the heuristic anomaly detection.
    """
    print(f"[*] Behavioral Engine initialized. Monitoring {file_path}...")
    
    if not os.path.exists(file_path):
        print(f"[*] Waiting for {file_path} to be created...")
        while not os.path.exists(file_path):
            time.sleep(1)
            
    with open(file_path, "r") as f:
        # Go to the end of the file
        f.seek(0, os.SEEK_END)
        
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1) # Wait briefly for new data
                continue
                
            try:
                telemetry = json.loads(line.strip())
                
                # HEURISTIC 1: Payload size > 1000 bytes
                if telemetry.get("payload_length", 0) > 1000:
                    dest_ip = telemetry.get("destination_ip")
                    
                    # HEURISTIC 2: Ignore local and multicast traffic
                    if not is_local_or_multicast(dest_ip):
                        print(f"\n[ANOMALY DETECTED] Large outbound traffic to {dest_ip}")
                        
                        # Spin off a thread so we don't block the tailing process
                        threading.Thread(target=send_alert, args=(telemetry,)).start()
                        
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"[ERROR] Analysis failure: {e}")

if __name__ == "__main__":
    print("=================================================")
    print("🚀 DEEP PACKET AI - BEHAVIORAL ENGINE STARTED 🚀")
    print("=================================================")
    try:
        tail_and_analyze(LOG_FILE)
    except KeyboardInterrupt:
        print("\n[*] Behavioral Engine stopped.")
