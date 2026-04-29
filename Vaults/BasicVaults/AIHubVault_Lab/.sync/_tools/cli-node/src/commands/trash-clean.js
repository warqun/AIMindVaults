/**
 * vault_trash_clean — Clean .trash/ folders across vaults.
 * Port of vault_trash_clean.ps1 (127 LOC → ~80 LOC).
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find AIMindVaults/Vaults/ root.
 */
function findVaultsRoot() {
  let dir = resolve(__dirname, '..', '..', '..', '..', '..');
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'Vaults'))) return join(dir, 'Vaults');
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Recursively find all .trash/ directories.
 */
function findTrashDirs(dir, depth = 0) {
  if (depth > 5) return [];
  const results = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const full = join(dir, e.name);
      if (e.name === '.trash') {
        results.push(full);
      } else {
        results.push(...findTrashDirs(full, depth + 1));
      }
    }
  } catch {}
  return results;
}

/**
 * Get total file count and size under a directory.
 */
function getDirStats(dir) {
  let count = 0, size = 0;
  function walk(d) {
    try {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, e.name);
        if (e.isDirectory()) walk(full);
        else { count++; size += statSync(full).size; }
      }
    } catch {}
  }
  walk(dir);
  return { count, size };
}

/**
 * @param {object} opts
 * @param {string[]} [opts.vault] - Filter by vault names
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.vaultsRoot]
 */
export async function trashClean(opts = {}) {
  const vaultsRoot = opts.vaultsRoot ? resolve(opts.vaultsRoot) : findVaultsRoot();
  if (!vaultsRoot || !existsSync(vaultsRoot)) {
    log.error('Vaults/ folder not found. Use --vaults-root.');
    process.exitCode = 1;
    return;
  }

  let trashDirs = findTrashDirs(vaultsRoot);

  // Filter by vault names
  if (opts.vault && opts.vault.length > 0) {
    trashDirs = trashDirs.filter(t => {
      const rel = relative(vaultsRoot, t);
      return opts.vault.some(v => rel.includes(v));
    });
  }

  if (trashDirs.length === 0) {
    log.info('No .trash/ folders to clean.');
    return;
  }

  log.info('\n=== Vault Trash Clean ===\n');
  let totalFiles = 0, totalSize = 0;

  for (const trash of trashDirs) {
    const { count, size } = getDirStats(trash);
    const sizeKB = (size / 1024).toFixed(1);
    const rel = relative(vaultsRoot, dirname(trash));
    totalFiles += count;
    totalSize += size;

    if (opts.dryRun) {
      log.info(`  [DRY] ${rel} — ${count} files, ${sizeKB}KB`);
    } else {
      try {
        await rm(trash, { recursive: true, force: true });
        log.info(`  [DEL] ${rel} — ${count} files, ${sizeKB}KB`);
      } catch (err) {
        log.error(`  [ERR] ${rel} — ${err.message}`);
      }
    }
  }

  const totalKB = (totalSize / 1024).toFixed(1);
  log.info(`\nTotal: ${trashDirs.length} vaults, ${totalFiles} files, ${totalKB}KB`);
  if (opts.dryRun) log.info('(DryRun — no actual deletion)');
}
