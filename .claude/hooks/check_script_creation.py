#!/usr/bin/env python3
"""Advisory hook for script file creation (PreToolUse · Write matcher).

Detects new script file creation (`.ps1`, `.py`, `.bat`, `.sh`, `.cmd`, `.psm1`,
`.zsh`, `.fish`) via the Write tool and emits a stderr advisory reminding the
agent of the `script-creation-approval.md` rule (user pre-approval required).

Rationale:
  The rule alone is advisory — agents have violated it. This hook adds a
  deterministic stderr advisory at the moment of attempt so the agent
  re-checks user approval before proceeding. Does NOT block (exit 0) so
  approved flows (e.g. /delegate-task queues) proceed without friction.

Exempt paths (infrastructure tooling, governed by separate rules):
  - .claude/hooks/**
  - _tools/cli-node/**
  - .sync/_tools/**

Reference: .claude/rules/core/script-creation-approval.md,
           .claude/rules/core/script-management.md
"""

import json
import sys
from pathlib import Path

SCRIPT_EXTS = {".ps1", ".py", ".bat", ".sh", ".cmd", ".psm1", ".zsh", ".fish"}
EXEMPT_PREFIXES = (
    ".claude/hooks/",
    "_tools/cli-node/",
    ".sync/_tools/",
)


def main() -> int:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        print("{}")
        return 0

    tool_name = payload.get("tool_name", "")
    if tool_name != "Write":
        print("{}")
        return 0

    fp = payload.get("tool_input", {}).get("file_path", "")
    if not fp:
        print("{}")
        return 0

    p = Path(fp)
    if p.suffix.lower() not in SCRIPT_EXTS:
        print("{}")
        return 0

    fp_norm = fp.replace("\\", "/")
    if any(prefix in fp_norm for prefix in EXEMPT_PREFIXES):
        print("{}")
        return 0

    if p.exists():
        sys.stderr.write(f"[advisory] 기존 스크립트 덮어쓰기: {fp}\n")
        sys.stderr.write("  script-management.md 룰 — Script_Registry.md 변경 기록 필수\n")
    else:
        sys.stderr.write(f"[advisory] 스크립트 신규 생성 시도: {fp}\n")
        sys.stderr.write("  script-creation-approval.md 룰 — 사용자 보고 + 승인 필수:\n")
        sys.stderr.write("    1) 목적 (왜 필요한가)\n")
        sys.stderr.write("    2) 경로\n")
        sys.stderr.write("    3) 영향 범위\n")
        sys.stderr.write("    4) 일회성/영구\n")
        sys.stderr.write("  Script_Registry.md 중복 확인 병행\n")
    sys.stderr.flush()

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
