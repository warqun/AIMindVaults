/**
 * pre_sync — Trampoline: ensure cli-node is up-to-date before sync.
 * Port of pre_sync.ps1 (101 LOC → ~70 LOC).
 *
 * 1. Detect Hub's cli-node
 * 2. Compare cli.js hash
 * 3. If different → re-exec from Hub's cli.js
 * 4. Otherwise → run sync-workspace directly
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliNodeRoot = resolve(__dirname, '..', '..');

function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Detect vault root from CWD (walk up looking for CLAUDE.md or _VAULT-INDEX.md).
 */
function detectVaultRootCwd(startDir) {
  let dir = startDir || process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, '_VAULT-INDEX.md')) || existsSync(join(dir, 'CLAUDE.md'))) {
      return resolve(dir);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Find Hub's cli-node directory by searching for .hub_marker.
 */
function findHubCliNode(vaultRoot) {
  // Walk up to find AIMindVaults root (has Vaults/)
  let dir = vaultRoot;
  let aimRoot = null;
  for (let i = 0; i < 10; i++) {
    const parent = dirname(dir);
    if (parent === dir) break;
    if (existsSync(join(parent, 'Vaults'))) { aimRoot = parent; break; }
    dir = parent;
  }
  if (!aimRoot) return null;

  const normalizedVault = resolve(vaultRoot);

  function search(searchDir, depth) {
    if (depth > 3 || !existsSync(searchDir)) return null;
    try {
      for (const e of readdirSync(searchDir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const full = join(searchDir, e.name);
        if (resolve(full) === normalizedVault) continue;
        if (existsSync(join(full, '.sync', '.hub_marker'))) {
          return join(full, '.sync', '_tools', 'cli-node');
        }
        const found = search(full, depth + 1);
        if (found) return found;
      }
    } catch {}
    return null;
  }

  return search(join(aimRoot, 'Vaults'), 0);
}

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 */
export async function preSync(opts = {}) {
  const vaultRoot = opts.vaultRoot ? resolve(opts.vaultRoot) : detectVaultRootCwd();
  if (!vaultRoot) {
    log.error('[PRE_SYNC] Vault root not found.');
    process.exitCode = 1;
    return;
  }

  // Self is Hub → no sync needed
  if (existsSync(join(vaultRoot, '.sync', '.hub_marker'))) {
    log.info('[PRE_SYNC] Current vault is Hub. No sync needed.');
    return;
  }

  // Find Hub's cli-node
  const hubCliNode = findHubCliNode(vaultRoot);
  if (!hubCliNode || !existsSync(hubCliNode)) {
    log.warn('[PRE_SYNC] Hub cli-node not found. Running sync directly.');
    const { syncWorkspace } = await import('./sync-workspace.js');
    await syncWorkspace({ vaultRoot });
    return;
  }

  // Compare cli.js hash
  const localHash = hashFile(join(cliNodeRoot, 'bin', 'cli.js'));
  const hubHash = hashFile(join(hubCliNode, 'bin', 'cli.js'));

  if (localHash !== hubHash && hubHash) {
    log.info('[PRE_SYNC] cli-node outdated. Re-executing from Hub...');
    try {
      execSync(`"${process.execPath}" "${join(hubCliNode, 'bin', 'cli.js')}" sync --vault-root "${vaultRoot}"`, {
        stdio: 'inherit',
        cwd: vaultRoot,
      });
      return;
    } catch (err) {
      log.error(`[PRE_SYNC] Re-exec failed: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  log.info('[PRE_SYNC] cli-node up to date.');
  const { syncWorkspace } = await import('./sync-workspace.js');
  await syncWorkspace({ vaultRoot });
}
