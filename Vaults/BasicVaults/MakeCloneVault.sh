#!/usr/bin/env bash
# ======================================================================
#  MakeCloneVault.sh — Satellite Vault Clone Launcher (Mac/Linux/Git Bash)
# ======================================================================
#  Location : Vaults/BasicVaults/MakeCloneVault.sh  (single copy)
#  Scope    : operates on sibling folders under BasicVaults/
#
#  What it does:
#    1. Scans siblings of this script for folders containing
#       .sync/hub-marker.json (= Hub candidates).
#    2. Displays a numbered menu; user picks a Hub.
#    3. Prompts for parent folder + new vault name.
#    4. Invokes Node CLI: `clone --hub <pickedHub>` — the CLI auto
#       resolves the clone source via the Hub's hub-marker.defaultTemplate
#       (falls back to BasicContentsVault sibling if unset).
#    5. CLI writes .sync/hub-source.json so the new satellite is bound.
#
#  Paths:
#    SCRIPT_DIR         = this script's directory (BasicVaults/)
#    CLI                = CoreHub's Node CLI (single Core source of truth)
# ======================================================================

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASICVAULTS_ROOT="$SCRIPT_DIR"
CLI="$BASICVAULTS_ROOT/CoreHub/.sync/_tools/cli-node/bin/cli.js"

if [ ! -f "$CLI" ]; then
  echo "[ERROR] CLI not found at: $CLI" >&2
  echo "         Make sure CoreHub exists next to this launcher." >&2
  exit 1
fi

echo ""
echo "===================================================="
echo " AIMindVaults — Satellite Vault Clone Launcher"
echo " Location : $BASICVAULTS_ROOT"
echo "===================================================="
echo ""
echo " Scanning Hub candidates (folders with .sync/hub-marker.json)..."
echo ""

# Build numbered list of Hubs (shell arrays)
declare -a HUB_NAMES=()
IDX=0
for entry in "$BASICVAULTS_ROOT"/*/; do
  name="$(basename "$entry")"
  if [ -f "$entry/.sync/hub-marker.json" ]; then
    IDX=$((IDX + 1))
    HUB_NAMES+=("$name")
    printf "  %d) %s\n" "$IDX" "$name"
  fi
done

HUB_COUNT=${#HUB_NAMES[@]}
if [ "$HUB_COUNT" -eq 0 ]; then
  echo "[ERROR] No Hub folders found under $BASICVAULTS_ROOT" >&2
  exit 1
fi

echo ""
read -r -p "Select Hub (1-$HUB_COUNT): " HUB_IDX

if ! [[ "$HUB_IDX" =~ ^[0-9]+$ ]] || [ "$HUB_IDX" -lt 1 ] || [ "$HUB_IDX" -gt "$HUB_COUNT" ]; then
  echo "[ERROR] Invalid Hub selection: $HUB_IDX" >&2
  exit 1
fi

# Bash arrays are 0-indexed
HUB_NAME="${HUB_NAMES[$((HUB_IDX - 1))]}"
HUB_PATH="$BASICVAULTS_ROOT/$HUB_NAME"

echo "  Selected: $HUB_NAME"
echo ""

read -r -p "Parent folder for new vault (e.g. /path/to/Vaults/Domains_Infra): " PARENT_PATH
read -r -p "New vault name: " VAULT_NAME

if [ -z "$VAULT_NAME" ]; then
  echo "[ERROR] Vault name is required." >&2
  exit 1
fi

TARGET_PATH="$PARENT_PATH/$VAULT_NAME"

echo ""
echo " Hub    : $HUB_PATH"
echo " Target : $TARGET_PATH"
echo " Source : resolved by CLI from Hub's hub-marker.defaultTemplate"
echo ""

if node "$CLI" clone \
    --target-path "$TARGET_PATH" \
    --project-name "$VAULT_NAME" \
    --hub "$HUB_PATH"; then
  echo ""
  echo "[DONE] Vault cloned and bound to Hub."
  echo " Next: Open Obsidian -> Vault manager -> Open folder as vault"
  echo "       Select: $TARGET_PATH"
else
  echo ""
  echo "[FAILED] Clone failed. See error above." >&2
  exit 1
fi
