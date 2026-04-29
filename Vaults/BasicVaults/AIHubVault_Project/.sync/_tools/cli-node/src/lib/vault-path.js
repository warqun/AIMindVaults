/**
 * Vault root detection and path utilities.
 * Replaces PS1 pattern: $ScriptDir\..\..\..
 */

import { existsSync } from 'node:fs';
import { resolve, join, basename, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect vault root from a starting path by walking up until Contents/ is found.
 * @param {string} [startPath] - Starting path. Defaults to cli-node location.
 * @returns {string|null} Resolved vault root, or null if not found.
 */
export function detectVaultRoot(startPath) {
  if (startPath && existsSync(join(startPath, 'Contents'))) {
    return resolve(startPath);
  }

  // From cli-node/src/lib/ → walk up to find Contents/
  const candidates = [
    resolve(__dirname, '..', '..', '..', '..', '..'),  // .sync/_tools/cli-node/src/lib → vault root
    resolve(__dirname, '..', '..', '..', '..'),         // fallback: one level less
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'Contents'))) {
      return resolve(candidate);
    }
  }

  return null;
}

/**
 * Get vault name from root path.
 * @param {string} vaultRoot
 * @returns {string}
 */
export function getVaultName(vaultRoot) {
  return basename(resolve(vaultRoot));
}

/**
 * Convert absolute path to vault-relative path with forward slashes.
 * @param {string} vaultRoot
 * @param {string} absolutePath
 * @returns {string}
 */
export function toRelativePath(vaultRoot, absolutePath) {
  return relative(vaultRoot, absolutePath).split(sep).join('/');
}

/**
 * Standard vault data directory (.vault_data/).
 * @param {string} vaultRoot
 * @returns {string}
 */
export function getDataDir(vaultRoot) {
  return join(vaultRoot, '.vault_data');
}

/**
 * Standard index file path.
 * @param {string} vaultRoot
 * @returns {string}
 */
export function getIndexPath(vaultRoot) {
  return join(getDataDir(vaultRoot), 'vault_index.json');
}
