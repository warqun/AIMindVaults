#!/usr/bin/env python3
"""Block Windows CMD-style NUL redirection (`2>nul`, `>nul`) in Bash tool calls.

Runs as a Claude Code PreToolUse hook for the Bash matcher. Reads the pending
tool invocation from stdin as JSON, inspects the command string, and emits a
`deny` decision when it contains Windows CMD null-device redirection that would
create a literal `nul` file under Git Bash / MSYS2 / WSL.

Rationale (2026-04-21 incident, AIMindVaults):
  Bash on Windows (Git Bash/MSYS2/Cygwin) resolves bare `nul` as a relative
  filename rather than the NUL device, creating empty `nul` files scattered
  across the working tree. CMD treats `2>nul` as NUL device; Bash does not.
  Use `/dev/null` in Bash, `$null` in PowerShell, `nul` only under `cmd.exe`.

This hook is a deterministic guardrail — LLM prompt rules alone are advisory.

Source: deep research 2026-04-21 (`20260421_nul_파일_누적_생성_이슈_리서치.md`).
"""

import json
import re
import sys

DANGEROUS = re.compile(
    r'(?i)(^|[\s;|&])(?:1?>|2>|>>|1>>|2>>|&>)[ \t]*nul(?:[ \t;&|]|$)'
)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        return 0

    cmd = payload.get("tool_input", {}).get("command", "")

    if DANGEROUS.search(cmd):
        reason = (
            "Windows-style NUL redirection is blocked in bash/MSYS2. "
            "Bash resolves `nul` as a relative filename (not the NUL "
            "device) and creates an empty `nul` file in CWD. Use "
            "`/dev/null` in bash, `$null` in PowerShell, or `cmd /c` "
            "if you intentionally need the Windows NUL device. "
            "Reference: .claude/rules/core/shell-redirect-safety.md"
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        }))
        sys.stderr.write(reason + "\n")
        return 2

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
