/**
 * hub_broadcast — Broadcast a file/folder from Hub .sync/ to all satellite vaults.
 * Port of hub_broadcast.ps1 (169 LOC → ~110 LOC).
 *
 * Lightweight alternative to full sync: pushes a single file to all vaults.
 */

import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find Hub .sync/ directory from script location.
 */
function findHubSyncDir() {
  // cli-node/src/commands/ → cli-node/ → _tools/ → .sync/
  const candidate = resolve(__dirname, '..', '..', '..', '..');
  if (existsSync(join(candidate, '.hub_marker'))) return candidate;

  // fallback: one level less
  const candidate2 = resolve(__dirname, '..', '..', '..');
  if (existsSync(join(candidate2, '.hub_marker'))) return candidate2;

  return null;
}

/**
 * Find all satellite vault .sync/ directories under Vaults/.
 */
function findSatelliteVaults(vaultsRoot, hubVaultRoot, excludePatterns) {
  const results = [];

  function search(dir, depth) {
    if (depth > 3) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = join(dir, entry.name);

        if (entry.name === '.sync') {
          const vaultRoot = dirname(full);
          if (resolve(vaultRoot) === resolve(hubVaultRoot)) continue;

          const vaultName = basename(vaultRoot);
          const excluded = excludePatterns.some(pat => {
            if (pat.includes('*')) {
              const regex = new RegExp('^' + pat.replace(/\*/g, '.*') + '$');
              return regex.test(vaultName);
            }
            return vaultName === pat;
          });
          if (!excluded) {
            results.push({ vaultName, syncDir: full });
          }
          continue; // Don't recurse into .sync/
        }

        search(full, depth + 1);
      }
    } catch {}
  }

  search(vaultsRoot, 0);
  return results;
}

/**
 * @param {object} opts
 * @param {string} opts.relativePath - Path relative to .sync/ (e.g. "clone_vault.ps1")
 * @param {boolean} [opts.dryRun]
 * @param {boolean} [opts.force] - Create file even if it doesn't exist in target
 * @param {string[]} [opts.exclude] - Vault name patterns to skip
 * @param {string} [opts.vaultsRoot] - Vaults/ folder path
 */
export async function hubBroadcast(opts) {
  if (!opts.relativePath) {
    log.error('--relative-path is required.');
    process.exitCode = 1;
    return;
  }

  const hubSyncDir = findHubSyncDir();
  if (!hubSyncDir) {
    log.error('Cannot locate Hub .sync/ directory. Run from AIHubVault.');
    process.exitCode = 1;
    return;
  }

  const hubVaultRoot = dirname(hubSyncDir);
  const vaultsRoot = opts.vaultsRoot
    ? resolve(opts.vaultsRoot)
    : resolve(hubVaultRoot, '..', '..');

  const sourcePath = join(hubSyncDir, opts.relativePath);
  if (!existsSync(sourcePath)) {
    log.error(`Source not found: ${sourcePath}`);
    process.exitCode = 1;
    return;
  }

  const isDir = statSync(sourcePath).isDirectory();
  const exclude = opts.exclude || [];

  log.info('====================================================');
  log.info(' Hub-Broadcast');
  log.info('====================================================');
  log.info(` Source  : ${sourcePath}`);
  log.info(` Mode    : ${opts.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  log.info(` Force   : ${opts.force || false}`);
  if (exclude.length) log.info(` Exclude : ${exclude.join(', ')}`);
  log.info('----------------------------------------------------');

  const vaults = findSatelliteVaults(vaultsRoot, hubVaultRoot, exclude);
  let okCount = 0, skipCount = 0, failCount = 0, createCount = 0;

  for (const v of vaults) {
    const destPath = join(v.syncDir, opts.relativePath);
    const destExists = existsSync(destPath);

    if (!destExists && !opts.force) {
      log.info(`  [SKIP] ${v.vaultName}  (use --force to create)`);
      skipCount++;
      continue;
    }

    if (opts.dryRun) {
      log.info(`  [DRY]  ${v.vaultName}  (${destExists ? 'OVERWRITE' : 'CREATE'})`);
      okCount++;
      continue;
    }

    try {
      if (isDir) {
        await mirrorDirectory(sourcePath, destPath, { noPrune: false });
      } else {
        const destDir = dirname(destPath);
        if (!existsSync(destDir)) await mkdir(destDir, { recursive: true });
        await copyFile(sourcePath, destPath);
      }

      if (destExists) {
        log.info(`  [OK]   ${v.vaultName}`);
      } else {
        log.info(`  [NEW]  ${v.vaultName}`);
        createCount++;
      }
      okCount++;
    } catch (err) {
      log.info(`  [FAIL] ${v.vaultName}  (${err.message})`);
      failCount++;
    }
  }

  log.info('\n====================================================');
  log.info(' Result');
  log.info('====================================================');
  log.info(` Updated : ${okCount}`);
  if (createCount > 0) log.info(` Created : ${createCount} (new)`);
  log.info(` Skipped : ${skipCount}`);
  log.info(` Failed  : ${failCount}`);
  log.info(` Total   : ${vaults.length} vaults scanned`);
  log.info('====================================================');

  if (failCount > 0) process.exitCode = 1;
}
