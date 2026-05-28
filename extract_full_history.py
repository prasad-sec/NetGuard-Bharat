import json
import re
import os

log_paths = [
    r'C:\Users\PRASAD DABHEKAR\.gemini\antigravity-ide\brain\46a2e5f6-a291-41df-9db2-e76263e965a4\.system_generated\logs\transcript.jsonl',
    r'C:\Users\PRASAD DABHEKAR\.gemini\antigravity-ide\brain\d5a20db2-9106-4ab1-b20f-af7c062007e3\.system_generated\logs\transcript.jsonl'
]
targets = ['App.jsx', 'index.css', 'GlobeMap.jsx', 'server.js', 'ExportConfigModal.jsx']

out_dir = r'C:\Users\PRASAD DABHEKAR\OneDrive\Documents\NetGuardBharat\recovered_yesterday'
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

recovered = {t: "" for t in targets}

for log_path in log_paths:
    if not os.path.exists(log_path):
        continue
        
    print(f"Scanning {log_path}...")
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                entry = json.loads(line)
                content = entry.get('content', '')
                
                # Check VIEW_FILE or TOOL_RESPONSE
                if 'The following code has been modified to include a line number' in content:
                    for t in targets:
                        # Extract the filename from the File Path line
                        file_path_match = re.search(r'File Path: `(.*?)`', content)
                        if file_path_match and file_path_match.group(1).endswith(t):
                            lines = content.split('\n')
                            code_lines = []
                            is_code = False
                            for l in lines:
                                if re.match(r'^\d+: ', l):
                                    is_code = True
                                if is_code:
                                    match = re.match(r'^\d+: (.*)', l)
                                    if match:
                                        code_lines.append(match.group(1))
                                    else:
                                        break # End of code block
                            if code_lines:
                                # We only store if it's the full file, OR if it's larger than what we have
                                code_str = '\n'.join(code_lines)
                                if len(code_str) > len(recovered[t]):
                                    recovered[t] = code_str
                                    print(f"  [+] Found view_file content for {t} ({len(code_str)} chars)")

                # Check write_to_file
                if entry.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in entry:
                    for tool in entry['tool_calls']:
                        if tool.get('name') == 'write_to_file':
                            args = tool.get('args', {})
                            target_file = args.get('TargetFile', '')
                            for t in targets:
                                if target_file.endswith(t):
                                    code_str = args.get('CodeContent', '')
                                    if len(code_str) > len(recovered[t]):
                                        recovered[t] = code_str
                                        print(f"  [+] Found write_to_file content for {t} ({len(code_str)} chars)")
            except Exception as e:
                pass

for t, code in recovered.items():
    if code:
        out_path = os.path.join(out_dir, t)
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write(code)
        print(f"Saved {t} to recovered_yesterday/{t}")
