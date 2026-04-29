/**
 * Deploy distribution — mirror deployment targets from source to SellingVault.
 * Cross-platform replacement for robocopy/cp-rf based deploy workflow.
 *
 * Strategy: explicit deploy targets (whitelist) rather than exclude-based.
 * Protected files in target are never overwritten (deploy-specific versions).
 */

import { existsSync } from 'node:fs';
import { stat, copyFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import {
  DEPLOY_TARGETS, DEPLOY_PROTECTED_FILES,
  DEPLOY_EXCLUDE_DIRS, DEPLOY_EXCLUDE_FILES,
} from '../lib/config.js';
import * as log from '../lib/logger.js';

/**
 * @param {object} opts
 * @param {string} [opts.source] - AIMindVaults root (auto-detect from CWD)
 * @param {string} opts.target - SellingVault root
 * @param {boolean} [opts.dryRun=false]
 * @param {boolean} [opts.force=false] - Overwrite protected files too
 * @param {boolean} [opts.verbose=false]
 */
export async function deployDist(opts) {
  const { target, dryRun = false, force = false, verbose = false } = opts;
  let { source } = opts;

  if (!source) {
    source = detectRoot();
  }

  if (!source || !existsSync(source)) {
    log.error(`Source not found: ${source || '(auto-detect failed)'}`);
    process.exit(1);
  }

  if (!target) {
    log.error('--target is required. Example: --target C:/SellingVault/Korean/AIMindVaults');
    process.exit(1);
  }

  if (!existsSync(target)) {
    log.error(`Target not found: ${target}`);
    process.exit(1);
  }

  log.info(`Deploy: ${source} → ${target}`);
  if (dryRun) log.info('[DRY-RUN] No files will be modified.\n');

  const totals = { copied: 0, deleted: 0, unchanged: 0, skipped: 0 };

  for (const entry of DEPLOY_TARGETS) {
    const srcPath = join(source, entry.path);
    const tgtPath = join(target, entry.path);

    if (!existsSync(srcPath)) {
      if (verbose) log.warn(`Source missing, skip: ${entry.path}`);
      continue;
    }

    if (entry.type === 'dir') {
      await deployDir(entry, srcPath, tgtPath, { dryRun, force, verbose }, totals);
    } else {
      await deployFile(entry.path, srcPath, tgtPath, { dryRun, force, verbose }, totals);
    }
  }

  log.info('');
  log.summary('Deploy Complete', {
    Source: source,
    Target: target,
    Copied: totals.copied,
    Deleted: totals.deleted,
    Unchanged: totals.unchanged,
    Skipped: totals.skipped,
    Mode: dryRun ? 'DRY-RUN' : 'LIVE',
  });

  log.envVar('DEPLOY_COPIED', totals.copied);
  log.envVar('DEPLOY_DELETED', totals.deleted);
  log.envVar('DEPLOY_SKIPPED', totals.skipped);
}

async function deployDir(entry, srcPath, tgtPath, opts, totals) {
  const { dryRun, force, verbose } = opts;

  if (verbose) log.info(`\n[DIR] ${entry.path}`);

  const excludeDirs = [...DEPLOY_EXCLUDE_DIRS, ...(entry.excludeDirs || [])];
  const excludeFiles = [...DEPLOY_EXCLUDE_FILES, ...(entry.excludeFiles || [])];

  // Add protected files that fall within this directory
  if (!force) {
    for (const pf of DEPLOY_PROTECTED_FILES) {
      if (pf.startsWith(entry.path + '/')) {
        const relName = pf.slice(entry.path.length + 1);
        if (!relName.includes('/')) {
          excludeFiles.push(relName);
        }
      }
    }
  }

  const stats = await mirrorDirectory(srcPath, tgtPath, {
    excludeDirs,
    excludeFiles,
    dryRun,
    log: verbose ? (msg) => log.info(`  ${msg}`) : () => {},
  });

  totals.copied += stats.copied;
  totals.deleted += stats.deleted;
  totals.unchanged += stats.unchanged;

  if (verbose) {
    log.info(`  → copied: ${stats.copied}, deleted: ${stats.deleted}, unchanged: ${stats.unchanged}`);
  }
}

async function deployFile(relPath, srcPath, tgtPath, opts, totals) {
  const { dryRun, force, verbose } = opts;

  // Check if protected
  if (!force && DEPLOY_PROTECTED_FILES.includes(relPath)) {
    if (existsSync(tgtPath)) {
      if (verbose) log.info(`[SKIP] ${relPath} (protected)`);
      totals.skipped++;
      return;
    }
    // First-time deploy: copy even if protected
  }

  // Ensure target directory exists
  const tgtDir = dirname(tgtPath);
  if (!existsSync(tgtDir) && !dryRun) {
    await mkdir(tgtDir, { recursive: true });
  }

  // Check if file changed (size + mtime)
  const needsCopy = await shouldCopyFile(srcPath, tgtPath);
  if (needsCopy) {
    if (verbose) log.info(`[COPY] ${relPath}`);
    if (!dryRun) await copyFile(srcPath, tgtPath);
    totals.copied++;
  } else {
    totals.unchanged++;
  }
}

async function shouldCopyFile(srcPath, tgtPath) {
  if (!existsSync(tgtPath)) return true;
  try {
    const [s, t] = await Promise.all([stat(srcPath), stat(tgtPath)]);
    return s.size !== t.size || s.mtimeMs > t.mtimeMs;
  } catch {
    return true;
  }
}

/**
 * Detect AIMindVaults root by walking up from CWD.
 * Looks for directory containing both Vaults/ and _STATUS.md.
 */
function detectRoot() {
  let dir = resolve('.');
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'Vaults')) && existsSync(join(dir, '_STATUS.md'))) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
