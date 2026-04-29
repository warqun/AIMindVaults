#!/bin/bash
# Sync all AIMindVaults vaults from this root folder.
# Usage: ./Sync\ All\ Vaults.sh [--dry-run]
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$ROOT/Vaults/BasicVaults/CoreHub/.sync/_tools/cli-node"
CLI="$CLI_DIR/bin/cli.js"
LOG="$ROOT/sync.log"
NO_PAUSE=0
[ "${1:-}" = "--help" ] && NO_PAUSE=1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Node.js 가 필요합니다: https://nodejs.org" >&2
  [ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
  exit 1
fi

if [ ! -f "$CLI" ]; then
  echo "AIMindVaults CLI was not found: $CLI" >&2
  [ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
  exit 1
fi

if [ ! -d "$CLI_DIR/node_modules" ]; then
  echo "Installing CoreHub CLI dependencies..."
  printf '[%s] [CoreHub] npm install... START\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  (cd "$CLI_DIR" && npm install --no-audit --no-fund) >> "$LOG" 2>&1
  npm_exit=$?
  if [ "$npm_exit" -ne 0 ]; then
    echo "npm install failed. See $LOG" >&2
    [ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
    exit "$npm_exit"
  fi
fi

node "$CLI" sync-all --root "$ROOT" "$@"
exit_code=$?

if [ "$exit_code" -eq 0 ]; then
  echo "Sync complete. Log: $LOG"
else
  echo "Sync failed with exit code $exit_code. Log: $LOG" >&2
fi

[ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
exit "$exit_code"
