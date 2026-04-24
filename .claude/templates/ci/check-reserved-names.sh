#!/usr/bin/env bash
# Scan the repository for Windows reserved file names (NUL/CON/PRN/AUX/COM1-9/LPT1-9).
# Exit 1 if any are found. Used by:
#   - Git pre-commit hook (scans staged files)
#   - GitHub Actions workflow deny-reserved-names.yml (scans whole tree)
#
# Invoke mode is auto-detected:
#   - If invoked from a Git hook context (stdin closed, $GIT_DIR set), scan staged diff.
#   - Otherwise scan the whole working tree.
#
# Source: deep research 2026-04-21 (`20260421_nul_파일_누적_생성_이슈_리서치.md`)
set -euo pipefail

python3 - <<'PY'
import os
import subprocess
import sys

reserved = {
    "con", "prn", "aux", "nul",
    *(f"com{i}" for i in range(1, 10)),
    *(f"lpt{i}" for i in range(1, 10)),
}

in_git = os.environ.get("GIT_DIR") or os.path.isdir(".git")

bad = []
if in_git:
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "-z"],
        check=False,
        stdout=subprocess.PIPE,
    )
    paths = [p.decode("utf-8", "surrogateescape") for p in proc.stdout.split(b"\0") if p]
else:
    paths = []
    for root, _dirs, files in os.walk("."):
        for f in files:
            paths.append(os.path.join(root, f))

for path in paths:
    for comp in path.replace("\\", "/").split("/"):
        stem = comp.rstrip(" .").split(".")[0].lower()
        if stem in reserved:
            bad.append(path)
            break

if bad:
    print("Blocked reserved Windows names:")
    print("\n".join(bad))
    sys.exit(1)
PY
