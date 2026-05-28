import json
import os
import re

log_path = r'C:\Users\PRASAD DABHEKAR\.gemini\antigravity-ide\brain\d5a20db2-9106-4ab1-b20f-af7c062007e3\.system_generated\logs\transcript.jsonl'

out_dir = r'C:\Users\PRASAD DABHEKAR\OneDrive\Documents\NetGuardBharat\recovered_full'
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            # We want to find the exact CODE_ACTION where the user pasted the large file
            if entry.get("type") == "CODE_ACTION":
                content = entry.get("content", "")
                if "App.jsx" in content:
                    # Let's save this content to a file so we can inspect it
                    with open(os.path.join(out_dir, f"code_action_step_{entry.get('step_index')}.txt"), 'w', encoding='utf-8') as out:
                        out.write(content)
                        print(f"Saved CODE_ACTION from step {entry.get('step_index')} (Length: {len(content)})")
            
            # Also check if there's any VIEW_FILE result that is large
            if entry.get("type") == "TOOL_RESPONSE" or entry.get("type") == "VIEW_FILE":
                content = entry.get("content", "")
                if "App.jsx" in content or "server.js" in content or "index.css" in content:
                    with open(os.path.join(out_dir, f"view_file_step_{entry.get('step_index')}.txt"), 'w', encoding='utf-8') as out:
                        out.write(content)
                        print(f"Saved VIEW/TOOL output from step {entry.get('step_index')} (Length: {len(content)})")
                        
            # And USER_INPUT
            if entry.get("type") == "USER_INPUT":
                content = entry.get("content", "")
                if len(content) > 1000:
                    with open(os.path.join(out_dir, f"user_input_step_{entry.get('step_index')}.txt"), 'w', encoding='utf-8') as out:
                        out.write(content)
                        print(f"Saved USER_INPUT from step {entry.get('step_index')} (Length: {len(content)})")

        except Exception as e:
            pass
