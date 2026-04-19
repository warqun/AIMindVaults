---
type: standards
tags:
  - TileMapToolKit
  - Standards
  - AIMindVault
  - hub-sync
  - workspace
updated: 2026-03-15
agent: claude
---

# Hub-Sync Targets

> Definitive list of files and folders synchronized across vaults by `sync_workspace.ps1`.
> **Only the targets listed below are synced.** Everything else remains vault-specific and untouched.
> Keep this document updated when the script changes.

---

## Sync Batches

The script syncs in ordered batches. **Only these targets are copied from AIHubVault to other vaults.** If Batch 2 or 3 fails, later batches are skipped.

### Batch 1 — Guides & Documentation

Low-risk assets. Failure does not block subsequent batches.

| Target | Description |
|--------|-------------|
| `Juggl_StyleGuide/` | Juggl graph styling guide and examples |

### Batch 2 — Rules & Standards

Core operational rules. **Any failure here halts Batch 3 and version update.**

| Target | Description |
|--------|-------------|
| `_Standards/Core/` | Shared operational standards (all vaults) |
| `_WORKFLOW.md` | Edit mode separation, status rules, workspace protocol |
| `_VAULT-INDEX.md` | Workspace directory map (fixed structure) |

### Batch 3 — Scripts & Tools

Executable files. Only runs if Batch 2 succeeds entirely.

| Target | Description |
|--------|-------------|
| `_tools/` | Automation scripts (CLI utilities, verification tools) |

### Batch 4 — Version Record (Automatic)

Runs only if all previous batches succeed.

| Target | Description |
|--------|-------------|
| `_WORKSPACE_VERSION.md` | Version log — copied from source to target |

---

## Authoritative Source

The batch definitions live in `.sync/sync_workspace.ps1`.
If this document and the script disagree, **the script is authoritative**.

---

## Related

- Script details: [[Script_Registry]]
- Sync protocol design: [[20260311_허브_동기화_계획]]
- Script internals: [[20260312_sync_workspace_작동방식_상세]]
