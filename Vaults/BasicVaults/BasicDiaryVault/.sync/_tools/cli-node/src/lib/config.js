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

/** Directories excluded from sync mirroring. */
export const SYNC_EXCLUDE_DIRS = [
  '.git',
  '.vault_data',
  'node_modules',
  '.trash',
];

/** Files excluded from sync mirroring. */
export const SYNC_EXCLUDE_FILES = [
  '.hub_marker',
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
