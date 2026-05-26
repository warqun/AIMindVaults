#!/usr/bin/env python3
"""Block file creation/edit when basename contains URI-reserved characters.

Runs as a Claude Code PreToolUse hook for the Write|Edit matcher. Reads the
pending tool invocation from stdin as JSON, inspects `tool_input.file_path`
basename, and emits a `deny` decision when the filename contains any of
`#`, `%`, `&`, `?`, `+` — the URI-reserved characters that break Obsidian URI
opening (`obsidian://open?vault=...&file=...`).

Rule reference: `.claude/rules/core/_essentials.md § 6` ("URI 예약문자 금지").

Examples of correct substitutions:
  C#  -> CSharp
  C++ -> CPP
  Q&A -> QnA
"""

import json
import sys
from pathlib import Path

RESERVED = set("#%&?+")


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
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
    found = sorted({c for c in basename if c in RESERVED})
    if found:
        reason = (
            f"파일명 '{basename}' 에 URI 예약문자 포함: {' '.join(found)}. "
            "_essentials.md § 6 룰 위반 — 대체: C# → CSharp, Q&A → QnA"
        )
        print(json.dumps({"decision": "deny", "reason": reason}, ensure_ascii=False))
        return 0

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
