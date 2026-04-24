/**
 * pre_sync — Trampoline: ensure cli-node is up-to-date before sync.
 *
 * Detection signals (any one triggers re-exec from Hub's cli.js):
 *   1. Hub `_WORKSPACE_VERSION.md` > local version  (primary — catches config/lib changes)
 *   2. `bin/cli.js` hash differs                    (fallback — dev/manual edits without version bump)
 *
 * Using only cli.js hash misses changes in `src/lib/*.js` and `src/commands/*.js`
 * (config.js, hub-resolver.js, etc.), so version comparison is the main gate.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isHub, resolveHub, getHubCliNode } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliNodeRoot = resolve(__dirname, '..', '..');

function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Parse latest `YYYYMMDDNNNN` version from `_WORKSPACE_VERSION.md`.
 * Returns null if file missing or unparseable.
 */
function parseLatestVersion(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const m = readFileSync(filePath, 'utf8').match(/^\|\s*(\d{12})\s*\|/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
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
  if (isHub(vaultRoot)) {
    log.info('[PRE_SYNC] Current vault is Hub. No sync needed.');
    return;
  }

  // Resolve the Hub this satellite binds to (Multi-Hub aware).
  const resolution = resolveHub(vaultRoot);
  if (!resolution.hubPath) {
    log.warn('[PRE_SYNC] Hub not found. Running local sync directly.');
    const { syncWorkspace } = await import('./sync-workspace.js');
    await syncWorkspace({ vaultRoot });
    return;
  }
  const hubPath = resolution.hubPath;
  const hubCliNode = getHubCliNode(hubPath);

  // Signal 1 — workspace version comparison (primary).
  const hubVer = parseLatestVersion(join(hubPath, '_WORKSPACE_VERSION.md'));
  const localVer = parseLatestVersion(join(vaultRoot, '_WORKSPACE_VERSION.md'));
  const versionStale = !!hubVer && (!localVer || localVer < hubVer);

  // Signal 2 — cli.js hash (fallback).
  const localHash = hashFile(join(cliNodeRoot, 'bin', 'cli.js'));
  const hubHash = hashFile(join(hubCliNode, 'bin', 'cli.js'));
  const hashDiffers = hubHash && localHash !== hubHash;

  if (versionStale || hashDiffers) {
    const reasons = [];
    if (versionStale) reasons.push(`version ${localVer || '(none)'} < Hub ${hubVer}`);
    if (hashDiffers) reasons.push('cli.js hash differs');
    log.info(`[PRE_SYNC] Re-executing from Hub (${reasons.join(', ')})`);
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
