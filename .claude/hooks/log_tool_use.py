#!/usr/bin/env python3
"""PreToolUse hook — log all tool invocations to JSONL (no blocking).

Captures every tool call for matching against Notification log to identify
which specific commands trigger permission prompts. Pure logging — always
returns exit 0 + empty JSON (pass-through).

Log location: $env:TEMP/aimv_tool_use_log.jsonl (per-device, git untracked).

Pairing with log_permission_request.py:
  - PreToolUse fires before EVERY tool call (whether prompt or not)
  - Notification fires when Claude requests user input/permission
  - Match by session_id + ts proximity to identify "which command triggered
    a permission prompt"

Source: 2026-04-29 보강 — Notification payload 가 message 만 포함 →
어떤 명령이 prompt 받았는지 역추적 필요.
"""

import json
import os
import sys
import tempfile
from datetime import datetime, timezone


def log_path() -> str:
    base = os.environ.get("TEMP") or os.environ.get("TMPDIR") or tempfile.gettempdir()
    return os.path.join(base, "aimv_tool_use_log.jsonl")


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        return 0

    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "session_id": payload.get("session_id"),
        "hook_event": payload.get("hook_event_name"),
        "tool_name": payload.get("tool_name"),
    }

    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        for key in ("command", "file_path", "url", "pattern", "path", "edits", "content"):
            if key in tool_input:
                value = tool_input.get(key)
                if isinstance(value, str) and len(value) > 500:
                    value = value[:500] + "...[truncated]"
                record[key] = value

    record = {k: v for k, v in record.items() if v is not None}

    try:
        with open(log_path(), "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
