#!/usr/bin/env python3
"""Notification hook — permission request pattern logging.

Runs as a Claude Code Notification hook. Reads the notification payload from
stdin, extracts the tool/command/path that triggered the user prompt, and
appends a JSONL record to a per-device log file. Used to identify recurring
permission prompts that should be added to settings.local.json allowlist.

Behavior:
  - Permission prompt detection: payload has tool_name + tool_input fields when
    Claude requests user permission for a deferred tool.
  - Other notification types (idle, etc.) are also logged for completeness.
  - Log location: $env:TEMP/aimv_permission_log.jsonl (Windows) or
    $TMPDIR/aimv_permission_log.jsonl (Unix). Per-device, not synced.
  - Failure mode: silent (don't break the prompt with hook errors).

Analysis workflow:
  1. Let log accumulate during normal sessions.
  2. Periodically run `/fewer-permission-prompts` skill OR manual JSONL parse.
  3. Add high-frequency patterns to .claude/settings.local.json permissions.allow.
  4. Verify reduced prompt rate.

Source: 2026-04-29 워커 자동 모드 검증 중 권한 prompt 다발 발견 →
사용자 데이터 수집 메커니즘 요구.
"""

import json
import os
import sys
import tempfile
from datetime import datetime, timezone


def log_path() -> str:
    base = os.environ.get("TEMP") or os.environ.get("TMPDIR") or tempfile.gettempdir()
    return os.path.join(base, "aimv_permission_log.jsonl")


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "session_id": payload.get("session_id"),
        "hook_event": payload.get("hook_event_name"),
        "tool_name": payload.get("tool_name"),
        "message": payload.get("message"),
    }

    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        if "command" in tool_input:
            record["command"] = tool_input.get("command")
        if "file_path" in tool_input:
            record["file_path"] = tool_input.get("file_path")
        if "url" in tool_input:
            record["url"] = tool_input.get("url")

    # Debug: capture top-level keys for future schema discovery
    record["_payload_keys"] = sorted(payload.keys())

    # Extract tool name from message text as fallback (e.g. "Claude needs your permission to use Bash")
    if not record.get("tool_name") and isinstance(record.get("message"), str):
        msg = record["message"]
        if "permission to use " in msg:
            record["tool_name_from_msg"] = msg.split("permission to use ")[-1].strip().rstrip(".")

    record = {k: v for k, v in record.items() if v is not None}

    try:
        with open(log_path(), "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
