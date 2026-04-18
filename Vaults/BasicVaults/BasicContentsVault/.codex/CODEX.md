---
type: codex-memory
updated: 2026-03-06
agent: codex
tags:
  - Meta
  - Codex
---

# CODEX.md (DEPRECATED)

> **DEPRECATED (2026-03-21)**: 이 파일은 볼트 루트의 `AGENTS.md`로 대체됨.

> This is a Codex-specific support note.
> The primary auto-loaded project entry is `CODEX.md`.

## Session Start Order

1. `.codex/rules/never-do.md`
2. `_WORKFLOW.md`
3. `_STATUS.md`
4. `.codex/AGENT_STATUS.md`
5. Relevant `.codex/rules/*`
6. Target documents

Do not start editing before finishing that order.

## Priority

- Rule compliance > speed
- Minimal edit > broad edit
- Verified completion > quick completion report

## Rule Files

| File | Purpose |
|------|---------|
| `.codex/rules/never-do.md` | Hard bans and safety rules |
| `.codex/rules/note-writing.md` | Note, folder note, Juggl, frontmatter rules |
| `.codex/rules/bulk-edit-safety.md` | Bulk edit safety process |

## Folder Note Rule

- If a folder contains `<foldername>.md`, that file is the folder note.
- Treat folder notes as index or overview notes unless told otherwise.
- If the user says "write it there" or "record it in that folder", first determine:
  - whether they want the folder note edited
  - or whether they want a new note created inside that folder
- In `prompt_log/<agent>/` folders:
  - `<agent>.md` is the folder note
  - actual records belong in separate `LOG_*.md` notes
- Before writing in any folder-note-based space, inspect the existing file naming pattern first.

## Editing Mode Separation (Mandatory)

All edits belong to one of two modes. Never mix.

- **`[Domain]` mode**: Edit `Domain/**` content only. Do not touch `_Standards/`, `_tools/`, `.claude/`, `.codex/`, or vault root files.
- **`[workspace]` mode**: Edit vault infrastructure (`_Standards/`, `_tools/`, `.claude/`, `.codex/`, `Tags/`, vault root files). Do not modify `Domain/**` body content.
- Declare mode before editing. Switching requires explicit declaration.
- Full rules: `_WORKFLOW.md` § 6)

## Current Status

See `.codex/AGENT_STATUS.md`.

## Project Access Paths

| Path | Purpose |
|------|---------|
| `_WORKFLOW.md` | Overall operating rules |
| `_STATUS.md` | Current merged status |
| `_VAULT-INDEX.md` | Document map |
| `.codex/AGENT_STATUS.md` | Codex work status |
