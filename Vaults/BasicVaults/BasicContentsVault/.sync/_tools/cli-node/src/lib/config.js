/**
 * Shared constants and configuration.
 * Centralizes values previously hardcoded across PS1 scripts.
 */

/** Files excluded from indexing (exact filename match). */
export const EXCLUDE_FILES = [
  '_STATUS.md',
  '_VAULT-INDEX.md',
  '_WORKSPACE_VERSION.md',
  'README.md',
  'Contents.md',
];

/** Frontmatter types excluded from indexing. */
export const EXCLUDE_TYPES = [
  'index',
  'version-log',
  'status-hub',
  'status',
];

/**
 * Directories excluded from sync mirroring.
 *
 * `node_modules/` IS synced — CLI depends on deps (commander, argparse, etc.)
 * and satellites must run their own cli.js via Obsidian Shell Commands.
 * Current deps are ~1.4MB / pure JS → portable across OS.
 */
export const SYNC_EXCLUDE_DIRS = [
  '.git',
  '.vault_data',
  '.trash',
];

/**
 * Files excluded from sync mirroring.
 * Hub identity files are per-vault and must NEVER be replicated by sync.
 */
export const SYNC_EXCLUDE_FILES = [
  '.hub_marker',
  'hub-marker.json',
  'hub-source.json',
  '.core-sync-warning.json',
  'vault_index.json',
];

/** Deploy targets — explicit whitelist of paths to sync to distribution. */
export const DEPLOY_TARGETS = [
  // Directories (mirrored)
  { type: 'dir', path: '.claude/rules/core' },
  { type: 'dir', path: '.claude/commands/core' },
  { type: 'dir', path: 'docs', excludeDirs: ['generated', '.pdca-snapshots'], excludeFiles: ['.bkit-memory.json', '.pdca-status.json'] },
  { type: 'dir', path: 'Vaults/BasicVaults' },
  { type: 'dir', path: '_tools', excludeFiles: [
    'temp_cleanup_testvault.ps1', 'temp_deep_delete.py',
    'temp_subst_delete2.py', 'temp_subst_robo.py',
    'setup_new_environment.ps1',
  ]},
  // Individual files
  { type: 'file', path: '.claude/rules/MANIFEST.md' },
  { type: 'file', path: '.claude/commands/MANIFEST.md' },
  { type: 'file', path: 'AGENTS.md' },
  { type: 'file', path: 'AGENT_ONBOARDING.md' },
  { type: 'file', path: 'AGENT_ONBOARDING_CLAUDE.md' },
  { type: 'file', path: 'AGENT_ONBOARDING_CODEX.md' },
  { type: 'file', path: 'README.md' },
  { type: 'file', path: 'SETUP_GUIDE.md' },
  { type: 'file', path: '_ROOT_VERSION.md' },
];

/** Files in target that should never be overwritten (deploy-specific versions). */
export const DEPLOY_PROTECTED_FILES = [
  'CLAUDE.md',
  'CODEX.md',
  '_STATUS.md',
  '.claude/settings.local.json',
];

/** Directories excluded within all deploy mirror operations. */
export const DEPLOY_EXCLUDE_DIRS = [
  '.git', '.vault_data', 'node_modules', '.trash', '.stfolder',
];

/** Files excluded within all deploy mirror operations. */
export const DEPLOY_EXCLUDE_FILES = [
  'vault_index.json',
];

/** Max summary length in index entries. */
export const MAX_SUMMARY_LENGTH = 200;

/** Hash algorithm for file change detection. */
export const HASH_ALGORITHM = 'sha256';

/** Hash prefix length stored in index. */
export const HASH_PREFIX_LENGTH = 8;

/**
 * Core-layer paths — propagated by `core-sync-all` from Core Hub to Preset Hubs.
 * Paths are relative to vault root. Trailing slash marks directory.
 *
 * NOTE: `.claude/rules/core/` and `.claude/commands/core/` live at the
 * AIMindVaults ROOT (not in any vault) and are inherited by all vaults via
 * Claude Code's CWD ancestry. They are deployed separately via `deploy`
 * (DEPLOY_TARGETS) and are NOT part of Hub-to-Hub propagation.
 */
export const CORE_PATHS = [
  '.sync/_tools/',
  '.sync/_Standards/Core/',
  '.sync/schemas/',
];

/**
 * Custom-layer paths — NOT propagated by `core-sync-all`.
 * Protected on Preset Hubs to preserve per-hub differentiation.
 *
 * `.claude/rules/custom/` and `.claude/commands/custom/` live at root level
 * (inherited via ancestry) — listed here to document the Custom boundary.
 */
export const CUSTOM_PATHS = [
  '.claude/rules/custom/',
  '.claude/commands/custom/',
];

/**
 * Core plugins — forced sync, cannot be removed per vault.
 * Previously defined in sync-workspace.js; moved here for shared use.
 * Expanded to the Core 6 set (per handoff 202604190002).
 */
export const CORE_PLUGINS = [
  'obsidian-local-rest-api',
  'obsidian-advanced-uri',
  'obsidian-shellcommands',
  'dataview',
  'templater-obsidian',
  'obsidian-linter',
];

/** Plugins whose data.json is force-synced from Hub (centralized data). */
export const CORE_FORCE_DATA_JSON = [
  'obsidian-linter',
  'obsidian-shellcommands',
];
