# Codex Root Vault Routing

> Root `.codex` decides where to work. Vault `.codex` decides how to work inside that vault.

## Rules

- Pick the target vault before reading or editing vault files.
- Use explicit vault names first.
- Use task keywords only when the user did not name a vault.
- If the task is root-only, stay at the project root.
- After routing, read the target vault's `.codex/CODEX.md` and `_STATUS.md` before editing.

## Current Mapping

- `AIHubVault`: AI workflow, agent setup, `_Standards`, `_tools`, vault infrastructure
- `BasicContentsVault`: content writing, knowledge notes, general PKM, note organization
- `DevFoundation`: 개발 기초, CS, 컴퓨터구조, 운영체제, 네트워크, HTTP, 웹/서버/DB, 인증·보안 기초, 클라우드·인프라 입문
