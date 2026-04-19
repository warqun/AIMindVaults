# Updating AIMindVaults

## How to Update

AIMindVaults is distributed via Git. To receive updates:

```bash
cd AIMindVaults
git pull origin main
```

Git automatically merges changes. Your personal files remain untouched.

## What Gets Updated

| Area | Updated? | Notes |
|------|:--------:|-------|
| `.claude/rules/core/` | Yes | Shared AI rules — always overwritten |
| `.claude/commands/core/` | Yes | Shared AI skills — always overwritten |
| `Vaults/BasicVaults/` | Yes | Hub vault and template vault |
| `_tools/` | Yes | CLI tools and launchers |
| `docs/` | Yes | Documentation |

## What Is Never Touched

| Area | Notes |
|------|-------|
| `.claude/rules/custom/` | Your personal rules |
| `.claude/commands/custom/` | Your personal skills |
| `CLAUDE.md` (root) | Your vault registry and routing |
| `_STATUS.md` (root) | Your vault statuses |
| Your vaults (`Domains_*`, `Projects_*`, `Lab_*`, ...) | Everything you created |
| Vault-level `Contents/` | Your notes and knowledge |

## Customization Rules

### Do

- Add your own rules in `.claude/rules/custom/`
- Add your own skills in `.claude/commands/custom/`
- Create new vaults in any category (`Domains_*`, `Projects_*`, `Lab_*`)
- Modify root `CLAUDE.md` to update your vault registry

### Don't

- **Do not modify files in `core/`** — they will be overwritten on the next update
- If you want to change a core rule's behavior, create an override in `custom/` with the same filename

### Overriding Core Rules

Claude Code reads both `core/` and `custom/` rules. If you disagree with a core rule, create a `custom/` version:

```
.claude/rules/
├── core/
│   └── note-writing.md          ← managed by updates
└── custom/
    └── note-writing.md          ← YOUR override (takes priority)
```

## Handling Conflicts

If `git pull` reports a merge conflict:

1. **On `core/` files**: Accept the update version
   ```bash
   git checkout --theirs .claude/rules/core/conflicted-file.md
   ```
2. **On files you intentionally modified**: Merge manually, then move your changes to `custom/`

## Checking What Changed

After pulling, review what's new:

```bash
git log --oneline -10
```
