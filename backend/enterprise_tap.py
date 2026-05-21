import os
import sys
import json
import logging
import datetime
from scapy.all import sniff, IP, TCP, UDP, ICMP

# Configure logging for the baseline
logging.basicConfig(
    filename='network_baseline.log',
    level=logging.INFO,
    format='%(message)s'
)

def check_admin_privileges():
    """
    Admin Safeguards: Ensure the script is running with Administrative or root privileges.
    Scapy requires high privileges to capture packets promiscuously.
    """
    try:
        # Check for Windows
        if os.name == 'nt':
            import ctypes
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
            if not is_admin:
                raise PermissionError("Administrator privileges required on Windows.")
        # Check for Linux/macOS
        elif os.name == 'posix':
            if os.geteuid() != 0:
                raise PermissionError("Root privileges required on POSIX systems.")
        else:
            print("[WARNING] Unknown OS. Privilege check skipped.")
    except Exception as e:
        print(f"[CRITICAL ERROR] {e}")
        print("Please run this script as Administrator (Windows) or with sudo (Linux/macOS).")
        sys.exit(1)

def analyze_traffic_baseline(telemetry_data):
    """
    The ML Hook: Modular function to process extracted telemetry.
    For this initial version, formats the data as a JSON object and logs it.
    """
    try:
        # Format the data as a JSON object
        log_entry = json.dumps(telemetry_data)
        
        # Append to the network_baseline.log file
        logging.info(log_entry)
        
        # Also print to the console for real-time monitoring
        print(f"[BASELINE] {log_entry}")
    except Exception as e:
        print(f"[ERROR] Failed to process telemetry: {e}")

def packet_callback(packet):
    """
    The Extractor: Called for every captured packet.
    Extracts Timestamp, Source IP, Destination IP, Protocol, and Payload Length.
    Ignores raw payload data.
    """
    # We only process IP packets
    if IP in packet:
        # 1. Extract Timestamp (converted to ISO 8601 string for clean JSON parsing)
        timestamp = datetime.datetime.fromtimestamp(float(packet.time)).isoformat()
        
        # 2 & 3. Extract Source and Destination IP
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        
        # 4. Extract Protocol
        protocol = "UNKNOWN"
        if TCP in packet:
            protocol = "TCP"
        elif UDP in packet:
            protocol = "UDP"
        elif ICMP in packet:
            protocol = "ICMP"
        else:
            # Map other protocols by their IP protocol number if needed
            protocol = f"PROTO-{packet[IP].proto}"
            
        # 5. Extract Packet Payload Length
        # To maintain performance, we calculate length without deep packet inspection.
        # If transport layer payload exists, get its length.
        payload_length = 0
        if TCP in packet and packet[TCP].payload:
            payload_length = len(packet[TCP].payload)
        elif UDP in packet and packet[UDP].payload:
            payload_length = len(packet[UDP].payload)
        elif ICMP in packet and packet[ICMP].payload:
            payload_length = len(packet[ICMP].payload)
            
        # Assemble the extracted telemetry into a dictionary
        telemetry_data = {
            "timestamp": timestamp,
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "protocol": protocol,
            "payload_length": payload_length
        }
        
        # Pass the extracted telemetry into the ML Hook
        analyze_traffic_baseline(telemetry_data)

def start_enterprise_tap(interface=None):
    """
    The Collector: Core function that uses scapy.sniff() to capture live network 
    traffic continuously.
    """
    from scapy.all import conf, get_if_list, get_if_addr
    
    print("[*] Verifying system privileges...")
    check_admin_privileges()
    
    # --- SMART INTERFACE DETECTION ---
    if interface is None:
        print("[*] Auto-detecting active network interface...")
        # Look through all interfaces for one that has a valid local IP
        for iface in conf.ifaces.values():
            # Check if it has an IP and isn't a loopback or virtual adapter
            try:
                ip = iface.ip
                if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                    interface = iface
                    print(f"[*] Found active interface: {iface.name} ({ip})")
                    break
            except:
                continue
    
    # If still None, fallback to Scapy's default
    if interface is None:
        interface = conf.iface
        print(f"[*] Falling back to default interface: {interface}")
    else:
        print(f"[*] Enterprise Network Tap locked onto: {interface}")
        
    print("[*] Starting continuous packet capture. Press Ctrl+C to stop.")
        
    try:
        # sniff() is the core scapy function.
        # store=False is critical to prevent memory exhaustion.
        sniff(iface=interface, prn=packet_callback, store=False)
    except KeyboardInterrupt:
        print("\n[*] Packet capture stopped by user.")
    except Exception as e:
        print(f"[CRITICAL ERROR] Failed to start packet capture: {e}")
        print("\nTIP: If you get 'Error 123', try running the script without any arguments.")

if __name__ == "__main__":
    # Start the enterprise tap with automatic detection
    start_enterprise_tap()
