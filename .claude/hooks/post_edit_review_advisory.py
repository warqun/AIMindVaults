#!/usr/bin/env python3
"""
PostToolUse advisory hook — Contents/ 노트 편집 후 Post-Edit Review 환기.

_essentials.md § 5 룰을 deterministic 환기. 차단 X, stderr advisory 만.
"""
import json
import sys
import re
from pathlib import Path

CONTENTS_PATTERN = re.compile(
    r"[/\\]Vaults[/\\]([^/\\]+(?:[/\\][^/\\]+)*)[/\\]Contents[/\\].*\.md$",
    re.IGNORECASE,
)


def main():
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
    if tool_name not in ("Write", "Edit"):
        print("{}")
        return 0

    fp = payload.get("tool_input", {}).get("file_path", "")
    if not fp:
        print("{}")
        return 0

    fp_norm = fp.replace("\\", "/")
    m = CONTENTS_PATTERN.search(fp_norm)
    if not m:
        print("{}")
        return 0

    vault_rel = m.group(1)
    basename = Path(fp).name

    sys.stderr.write(f"[advisory] Contents/ 노트 편집됨: {basename}\n")
    sys.stderr.write(f"  Post-Edit Review 실행 권장 (_essentials.md § 5):\n")
    sys.stderr.write(
        f"  node \"<볼트경로>/.sync/_tools/cli-node/bin/cli.js\" review -r \"<볼트경로>\" -s Contents\n"
    )
    sys.stderr.write(f"  POST_EDIT_REVIEW_BAD=0 + POST_EDIT_INDEX_UPDATED=1 확인 필수\n")
    sys.stderr.flush()

    print("{}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
