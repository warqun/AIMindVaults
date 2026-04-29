#!/bin/bash
# Sync only this AIMindVaults vault.
# Usage: double-click from .sync, or run: ./.sync/Sync\ This\ Vault.command
set -u

SYNC_DIR="$(cd "$(dirname "$0")" && pwd)"
VAULT_ROOT="$(cd "$SYNC_DIR/.." && pwd)"
CLI_DIR="$VAULT_ROOT/.sync/_tools/cli-node"
CLI="$CLI_DIR/bin/cli.js"
LOG="$SYNC_DIR/sync.log"
NO_PAUSE=0
[ "${1:-}" = "--help" ] && NO_PAUSE=1

if [ "${1:-}" = "--help" ]; then
  echo "Sync This Vault.command runs pre-sync for the current vault."
  exit 0
fi

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
  echo "Installing vault CLI dependencies..."
  printf '[%s] [Sync This Vault] npm install... START\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  (cd "$CLI_DIR" && npm install --no-audit --no-fund) >> "$LOG" 2>&1
  npm_exit=$?
  if [ "$npm_exit" -ne 0 ]; then
    echo "npm install failed. See $LOG" >&2
    [ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
    exit "$npm_exit"
  fi
fi

echo "Running pre-sync for $VAULT_ROOT..."
printf '[%s] [Sync This Vault] pre-sync... START\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
node "$CLI" pre-sync --vault-root "$VAULT_ROOT" >> "$LOG" 2>&1
exit_code=$?
printf '[%s] [Sync This Vault] pre-sync... EXIT %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$exit_code" >> "$LOG"

if [ "$exit_code" -eq 0 ]; then
  echo "Sync complete. Log: $LOG"
else
  echo "Sync failed with exit code $exit_code. Log: $LOG" >&2
fi

[ "$NO_PAUSE" -eq 0 ] && read -r -p "Press Enter to close..." _
exit "$exit_code"
