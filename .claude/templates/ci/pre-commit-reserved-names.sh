#!/usr/bin/env bash
# Install to: .git/hooks/pre-commit  (chmod +x)
# Or chain with husky / lefthook / pre-commit.com.
#
# Blocks commits that introduce paths containing Windows reserved names.
#
# Source: deep research 2026-04-21 (`20260421_nul_파일_누적_생성_이슈_리서치.md`)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/check-reserved-names.sh"
