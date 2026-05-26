#!/usr/bin/env python3
"""Block Write/Edit creating files whose basename is a Windows reserved name.

Runs as a Claude Code PreToolUse hook for the Write|Edit matcher. Reads the
pending tool invocation from stdin as JSON, inspects `tool_input.file_path`,
and emits a `deny` decision when the basename (stem, case-insensitive) matches
NUL / CON / AUX / PRN / COM1-9 / LPT1-9, including extension variants
(`nul.txt`, `aux.json`).

Rationale (2026-04-21 incident, AIMindVaults):
  Bash `2>nul` produced 41,440+ literal `nul` files. R069~R072 added Bash and
  shell-layer defenses, but Write/Edit tool calls that directly create such a
  filename were uncovered. Once created, these files require `\\\\?\\` UNC
  prefix + `[System.IO.File]::Delete()` to remove — plain `rm` fails.

Source: shell-redirect-safety.md § 9; companion to block_nul_redirection.py.
"""

import json
import re
import sys
from pathlib import Path

RESERVED_PATTERN = re.compile(
    r"^(NUL|CON|AUX|PRN|COM[1-9]|LPT[1-9])(\..+)?$",
    re.IGNORECASE,
)


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        print("{}")
        return 0

    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        print("{}")
        return 0

    fp = payload.get("tool_input", {}).get("file_path", "")
    if not fp:
        print("{}")
        return 0

    basename = Path(fp).name
    if RESERVED_PATTERN.match(basename):
        reason = (
            f"파일명 '{basename}' 이 Windows 예약 이름. "
            f"NUL/CON/AUX/PRN/COM1-9/LPT1-9 (확장자 변형 포함) 생성 금지. "
            f"shell-redirect-safety.md § 9 룰 위반 — 일반 `rm` 으로 삭제 불가, "
            f"`\\\\?\\` UNC prefix 필요."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        }, ensure_ascii=False))
        sys.stderr.write(reason + "\n")
        return 2

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
