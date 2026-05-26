#!/usr/bin/env python3
"""Advisory: Stop hook that warns when session ends with file changes but
no _STATUS.md / _SESSION_HANDOFF_*.md update, and when _AGENT_COMMS queues
have in-progress / stale resolved entries.

Runs as a Claude Code Stop hook. Reads the stop event payload from stdin,
checks `git diff --name-only HEAD` for modified files, scans
`_AGENT_COMMS/to_claude/` frontmatter, and emits advisories to stderr.

Behavior:
  - git diff:
    - No git changes -> silent pass for git advisory.
    - Changes include _STATUS.md or _SESSION_HANDOFF_*.md -> silent pass.
    - Changes but no status/handoff update -> stderr warning.
  - _AGENT_COMMS scan (always runs after JSON parse):
    - in-progress queues -> stderr advisory (count + first 3 names).
    - resolved queues older than 7 days -> stderr advisory (count + first 3).
    - 7일 기준 날짜: resolved → updated → created 순으로 fallback.
  - 모든 advisory 는 advisory-only — Stop 차단 X. exit 0.

Loop guard: respects `stop_hook_active` to avoid infinite re-trigger.

Source: 셀프 메모 _AGENT_COMMS/to_claude/20260424_Claude_Claude_벌크등록_완료후_훅_구현_제안.md
권장 #5 (세션 종료 시 _STATUS.md 검증).
_AGENT_COMMS 확장: 20260502_Claude_Claude_루틴개선_1단계_위임.md (A 명세).
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Force UTF-8 stderr so Korean advisory text renders on Windows cp949 consoles.
try:
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass


_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)
_KV_RE = re.compile(r"^(\w+):\s*(.+)$")


def parse_frontmatter(content: str) -> dict:
    m = _FRONTMATTER_RE.match(content)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        kv = _KV_RE.match(line.strip())
        if kv:
            fm[kv.group(1)] = kv.group(2).strip()
    return fm


def scan_agent_comms(project_dir: str):
    """Return (in_progress_files, stale_resolved_files) lists."""
    comms_dir = Path(project_dir) / "_AGENT_COMMS" / "to_claude"
    if not comms_dir.is_dir():
        return [], []

    seven_days_ago = datetime.now() - timedelta(days=7)
    in_progress = []
    stale_resolved = []

    for md in sorted(comms_dir.glob("*.md")):
        try:
            content = md.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        fm = parse_frontmatter(content)
        status = fm.get("status", "").strip()

        if status == "in-progress":
            in_progress.append(md.name)
        elif status == "resolved":
            date_str = fm.get("resolved") or fm.get("updated") or fm.get("created")
            if date_str:
                try:
                    d = datetime.strptime(date_str, "%Y-%m-%d")
                    if d < seven_days_ago:
                        stale_resolved.append(md.name)
                except ValueError:
                    pass

    return in_progress, stale_resolved


def emit_agent_comms_advisory(in_progress, stale_resolved) -> None:
    if in_progress:
        sys.stderr.write(
            f"\n[ADVISORY] _AGENT_COMMS in-progress 큐 {len(in_progress)}건 — "
            f"status 갱신 또는 핸드오프 명시 필요.\n"
        )
        for name in in_progress[:3]:
            sys.stderr.write(f"  - {name}\n")
        if len(in_progress) > 3:
            sys.stderr.write(f"  (+{len(in_progress) - 3} more)\n")

    if stale_resolved:
        sys.stderr.write(
            f"\n[ADVISORY] _AGENT_COMMS resolved + 7일 경과 큐 "
            f"{len(stale_resolved)}건 — archive/YYYY-MM/ 이동 권장.\n"
        )
        for name in stale_resolved[:3]:
            sys.stderr.write(f"  - {name}\n")
        if len(stale_resolved) > 3:
            sys.stderr.write(f"  (+{len(stale_resolved) - 3} more)\n")


def emit_git_advisory(project_dir: str) -> None:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return

    if result.returncode != 0:
        return

    modified = [line for line in result.stdout.strip().splitlines() if line]
    if not modified:
        return

    status_touched = any(
        f.endswith("_STATUS.md") or "_SESSION_HANDOFF" in f
        for f in modified
    )
    if status_touched:
        return

    sample = ", ".join(modified[:5])
    if len(modified) > 5:
        sample += f" (+{len(modified) - 5} more)"

    sys.stderr.write(
        f"\n[ADVISORY] 세션 종료 — {len(modified)}개 파일 변경됨, "
        f"_STATUS.md / _SESSION_HANDOFF_*.md 갱신 미감지.\n"
        f"  변경 파일: {sample}\n"
        f"  규칙: .claude/rules/core/_essentials.md § 7 (세션 종료 루틴)\n"
        f"  다음 세션 진입 시 작업 추적 누락 위험. 종료 전 갱신 권장.\n"
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        payload = {}

    if payload.get("stop_hook_active"):
        print("{}")
        return 0

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR")
    if not project_dir or not os.path.isdir(project_dir):
        # Fallback for dry-run / direct invocation without env var.
        cwd = os.getcwd()
        if os.path.isdir(os.path.join(cwd, "_AGENT_COMMS")):
            project_dir = cwd
        else:
            print("{}")
            return 0

    in_progress, stale_resolved = scan_agent_comms(project_dir)
    emit_agent_comms_advisory(in_progress, stale_resolved)

    emit_git_advisory(project_dir)

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
