---
type: codex-memory
updated: 2026-03-10
agent: codex
tags:
  - AIMindVault
  - Meta
  - Codex
---

# CODEX.md

> This is the root Codex hub for the AIMindVaults multi-vault workspace.
> Use this document to choose the target vault and the correct local `.codex` entry before editing.

## Session Start Order

1. `CODEX.md`
2. `_STATUS.md` (루트) — 전체 볼트 현황 + 다른 볼트 작업 확인
3. `.codex/rules/vault-routing.md`
4. `.codex/rules/edit-scope.md`
5. `.codex/rules/status-sync.md`
6. `.codex/rules/encoding-safety.md`
7. `.codex/AGENT_STATUS.md`
8. Target vault `.codex/CODEX.md`
9. Target vault `_STATUS.md`

Do not start editing before finishing that order.

## Vault Registry

| Vault ID | Path | Role | Status |
|------|------|------|------|
| AIHubVault | `Vaults/BasicVaults/AIHubVault/` | AI 작업환경 설계·개선·배포 허브 | active |
| BasicContentsVault | `Vaults/BasicVaults/BasicContentsVault/` | 범용 콘텐츠 저장소 | active |

## Routing Rules

- Explicit vault name wins.
- If the task mentions AI workflow, agents, `_Standards`, or vault infrastructure, route to `AIHubVault`.
- If the task mentions content writing, knowledge capture, or general note organization, route to `BasicContentsVault`.
- If a file path is given, derive the vault from the path.
- If the task only targets root files (`CLAUDE.md`, `.claude/`, `.codex/`, `docs/`), stay at root.

## Root Scope

You may edit these directly from the root hub:

- `CODEX.md`
- `.codex/`
- `CLAUDE.md`
- `.claude/`
- `docs/`

For vault-internal files, first enter the target vault and follow that vault's `.codex/CODEX.md`.

## Delegation

- Root `.codex` is a shared routing hub.
- Vault `.codex` is the local execution rule set.
- Do not replace vault-local rules with root rules.

## Status

- Root hub status: `.codex/AGENT_STATUS.md`
- Vault execution status: `{vault}/.codex/AGENT_STATUS.md`
