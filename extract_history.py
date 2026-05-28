import json
import os

log_path = r"C:\Users\PRASAD DABHEKAR\.gemini\antigravity-ide\brain\d5a20db2-9106-4ab1-b20f-af7c062007e3\.system_generated\logs\transcript.jsonl"
file_modifications = {}

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("type") == "PLANNER_RESPONSE" and "tool_calls" in entry:
                for tool in entry["tool_calls"]:
                    args = tool.get("args", {})
                    name = tool.get("name")
                    
                    if name in ["replace_file_content", "multi_replace_file_content", "write_to_file"]:
                        # Extract TargetFile without surrounding quotes if present
                        target_file = args.get("TargetFile", "").strip('"').strip("'")
                        if target_file:
                            if target_file not in file_modifications:
                                file_modifications[target_file] = 0
                            file_modifications[target_file] += 1
        except Exception as e:
            pass

print("Files modified by AI in this conversation:")
for file, count in file_modifications.items():
    print(f"- {file} ({count} modifications)")
