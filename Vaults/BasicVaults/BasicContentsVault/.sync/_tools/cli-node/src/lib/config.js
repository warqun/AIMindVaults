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

/** Max summary length in index entries. */
export const MAX_SUMMARY_LENGTH = 200;

/** Hash algorithm for file change detection. */
export const HASH_ALGORITHM = 'sha256';

/** Hash prefix length stored in index. */
export const HASH_PREFIX_LENGTH = 8;
