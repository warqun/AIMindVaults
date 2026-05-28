# Codex Create Vault Safety

> Codex-only guardrail for creating AIMindVaults satellite vaults.

## Rule

When the user asks Codex to create, add, split, or scaffold a new vault, use
`.codex/skills/create-aimind-vault/SKILL.md` before cloning anything.

## Preset Selection

Select the Preset Hub from the target category before selecting a template:

| Target category | Default Preset Hub | Expected template |
|---|---|---|
| `Vaults/Domains_*`, `Vaults/Domain_*` | `AIHubVault_Domain` | `BasicDomainVault` |
| `Vaults/Lab_*` | `AIHubVault_Lab` | `BasicLabVault` |
| `Vaults/Projects_*` | `AIHubVault_Project` | `BasicProjectVault` |
| diary-style personal vault | `AIHubVault_Diary` | `BasicDiaryVault` |
| explicit generic/minimal vault | `AIHubVault` or `AIHubVault_Minimal` | `BasicContentsVault` |

Never treat `AIHubVault` as the fallback for a `Domains_*`, `Lab_*`, or
`Projects_*` target just because older docs mention `BasicContentsVault`.

## Clone Command Rule

Use CoreHub CLI as the entrypoint:

```powershell
node "C:\AIMindVaults\Vaults\BasicVaults\CoreHub\.sync\_tools\cli-node\bin\cli.js" clone `
  --hub "C:\AIMindVaults\Vaults\BasicVaults\<PresetHub>" `
  --target-path "C:\AIMindVaults\Vaults\<Category>\<VaultName>" `
  --project-name "<VaultName>"
```

Do not pass `--source-path` unless the user explicitly chooses a non-default
template. `--source-path` overrides the Hub `defaultTemplate`.

## Ambiguous Domain Case

If a target path is a domain but the requested structure sounds non-ZK
(`Contents/Domain/<topic>` folders, review-note buckets, or general PKM):

1. Stop before clone.
2. Present two choices:
   - ZK Domain Preset: `AIHubVault_Domain` + `BasicDomainVault`
   - General topic vault: explicit `BasicContentsVault`, with Hub choice stated
3. Continue only after the user picks one.

## Obsidian Registration

New vault creation is not complete until Obsidian registration is addressed.

1. Run `register-vaults` dry-run.
2. Report `TO ADD` and `STALE` entries.
3. Run `register-vaults --apply` only after user confirmation or explicit
   request for full registration.
4. Never edit `obsidian.json` directly for bulk registration.

## Required Verification

- `.sync/hub-source.json` matches the selected Preset Hub.
- Root `_STATUS.md` and `_ROOT_VERSION.md` state the actual Hub/template.
- Target vault index exists and was rebuilt.
- Master index is rebuilt when the vault should appear in global viz/search.
- If notes were added, post-edit review reports `POST_EDIT_REVIEW_BAD=0`.

## Claude Review Queue

After changing create-vault rules or applying a non-obvious template/Hub
choice, create `_AGENT_COMMS/to_claude/{YYYYMMDD}_codex_claude_<topic>.md`
with `status: open` and ask Claude to review cross-rule consistency.
