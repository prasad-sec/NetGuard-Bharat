import os
import json
import glob

history_paths = [
    r"C:\Users\PRASAD DABHEKAR\AppData\Roaming\Code\User\History",
    r"C:\Users\PRASAD DABHEKAR\AppData\Roaming\Antigravity IDE\User\History",
    r"C:\Users\PRASAD DABHEKAR\AppData\Roaming\Cursor\User\History"
]

for history_path in history_paths:
    if not os.path.exists(history_path):
        continue
    
    entries = glob.glob(os.path.join(history_path, "*", "entries.json"))
    for entry_file in entries:
        try:
            with open(entry_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                resource = data.get("resource", "")
                if "NetGuardBharat" in resource and "App.jsx" in resource:
                    print(f"Found history for {resource} in {os.path.dirname(entry_file)}")
        except Exception:
            pass
