# Codex Note Writing Rules

> Basis: `_Standards/WritingStandards.md` and `_Standards/NoteProperties.md`

## Frontmatter

All normal notes must start with YAML frontmatter at line 1.

Required fields:

```yaml
---
type: [design|spec|issue-design|issue-spec|standards|temp-draft|report|meta]
tags:
  - AIMindVault
updated: YYYY-MM-DD
agent: codex
---
```

Rules:
- Frontmatter starts on line 1.
- Leave exactly one blank line after the closing `---`.
- Only one frontmatter block is allowed.

## Juggl

For normal notes, insert a Juggl block directly under H1.

```markdown
# Note Title

```juggl
local: Note_Title
```
```

Exceptions:
- `_STATUS.md`, `_VAULT-INDEX.md`
- `.codex/rules/**`, `.codex/playbooks/**`
- `.claude/commands/**`, `.claude/rules/**`
- `Domain/temp/agent_packets/**`

## Folder Note Rule

- If a folder contains `<foldername>.md`, that file is the folder note.
- Treat folder notes as index or overview notes by default.
- Unless the user explicitly says to edit the folder note itself, do not place the main record into that file.
- When the user says "record it in that folder/space", first distinguish between:
  - editing the folder note
  - creating a new note inside that folder
- In `prompt_log/<agent>/` folders:
  - `<agent>.md` is the folder note
  - actual logs must be stored as separate `LOG_*.md` notes inside that folder
- Before writing into a folder-note-based workspace, inspect the existing filename pattern in that folder first.

## Post Edit Review

For note editing work:

```bash
node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
```

Do not report completion before `POST_EDIT_REVIEW_BAD=0`.

## Wiki Links

- Use `[[WikiLink]]` format.
- If a filename changes, update all related wiki links in the same task.
- Do not leave broken wiki links behind.

## Editing Mode Separation (Mandatory)

- All edits belong to `[Domain]` mode (Domain/** content) or `[workspace]` mode (infrastructure/settings/rules).
- In Domain mode: do not modify workspace files. In workspace mode: do not modify Domain body content.
- Declare mode before editing. Switching requires explicit declaration.
- Full rules: `_WORKFLOW.md` § 6)

## Script Management (Mandatory)

- Before creating any new script, check `_Standards/Core/Script_Registry.md` for duplicates.
- If existing script can be extended with parameters, prefer that over creating new scripts.
- After creation, register in `Script_Registry.md` (name, location, purpose, creator, user).
- After deletion, move entry to "삭제된 스크립트" section with reason.
- Full rules: `_Standards/Core/Script_Creation_Rule.md`
