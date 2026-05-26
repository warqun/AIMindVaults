/**
 * Cross-platform directory mirroring.
 * Replaces robocopy /MIR with Node.js fs.promises.
 *
 * Behavior: source → target mirror. Files in target not in source are deleted.
 * Respects exclude patterns for dirs and files.
 */

import { readdir, stat, mkdir, copyFile, unlink, rmdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

/**
 * Mirror source directory to target directory.
 *
 * @param {string} source - Source directory (read-only).
 * @param {string} target - Target directory (will be modified to match source).
 * @param {object} [options]
 * @param {string[]} [options.excludeDirs=[]] - Directory names to skip.
 * @param {string[]} [options.excludeFiles=[]] - File names to skip.
 * @param {boolean} [options.dryRun=false] - Log actions without executing.
 * @param {boolean} [options.noPrune=false] - Skip deleting target-only files.
 * @param {boolean} [options.protectExisting=false] - Skip files that exist in target (only copy new files). Used by deploy --english-mode to protect translated files.
 * @param {(msg: string) => void} [options.log] - Logger function.
 * @returns {Promise<{ copied: number, deleted: number, unchanged: number }>}
 */
export async function mirrorDirectory(source, target, options = {}) {
  const {
    excludeDirs = [],
    excludeFiles = [],
    dryRun = false,
    noPrune = false,
    protectExisting = false,
    log = () => {},
  } = options;

  const stats = { copied: 0, deleted: 0, unchanged: 0 };

  if (!existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
  }

  if (!existsSync(target) && !dryRun) {
    await mkdir(target, { recursive: true });
  }

  await syncDir(source, target, excludeDirs, excludeFiles, dryRun, noPrune, protectExisting, log, stats);

  return stats;
}

async function syncDir(source, target, excludeDirs, excludeFiles, dryRun, noPrune, protectExisting, log, stats) {
  // Ensure target dir exists
  if (!existsSync(target) && !dryRun) {
    await mkdir(target, { recursive: true });
  }

  // Get source entries
  const sourceEntries = await getEntries(source);
  const targetEntries = await getEntries(target);

  const sourceNames = new Set(sourceEntries.map(e => e.name));

  // Delete target entries not in source (unless noPrune or protectExisting)
  // protectExisting disables pruning to preserve translated files unique to target.
  if (!noPrune && !protectExisting) for (const entry of targetEntries) {
    if (excludeDirs.includes(entry.name) || excludeFiles.includes(entry.name)) continue;

    if (!sourceNames.has(entry.name)) {
      const targetPath = join(target, entry.name);
      log(`[DELETE] ${relative(target, targetPath)}`);
      if (!dryRun) {
        if (entry.isDirectory) {
          await removeRecursive(targetPath);
        } else {
          await unlink(targetPath);
        }
      }
      stats.deleted++;
    }
  }

  // Copy/update source entries to target
  for (const entry of sourceEntries) {
    if (entry.isDirectory && excludeDirs.includes(entry.name)) continue;
    if (!entry.isDirectory && excludeFiles.includes(entry.name)) continue;

    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);

    if (entry.isDirectory) {
      await syncDir(sourcePath, targetPath, excludeDirs, excludeFiles, dryRun, noPrune, protectExisting, log, stats);
    } else {
      const needsCopy = await shouldCopyFile(sourcePath, targetPath, protectExisting);
      if (needsCopy) {
        log(`[COPY] ${entry.name}`);
        if (!dryRun) {
          await copyFile(sourcePath, targetPath);
        }
        stats.copied++;
      } else {
        stats.unchanged++;
      }
    }
  }
}

/**
 * Check if source file differs from target (by size + mtime).
 *
 * @param {boolean} protectExisting - If true and target exists, returns false (skip copy).
 *   Used by deploy --english-mode to preserve translated target files.
 */
async function shouldCopyFile(sourcePath, targetPath, protectExisting = false) {
  if (!existsSync(targetPath)) return true;
  if (protectExisting) return false;

  try {
    const [srcStat, tgtStat] = await Promise.all([stat(sourcePath), stat(targetPath)]);
    return srcStat.size !== tgtStat.size || srcStat.mtimeMs > tgtStat.mtimeMs;
  } catch {
    return true;
  }
}

async function getEntries(dirPath) {
  if (!existsSync(dirPath)) return [];
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch {
    return [];
  }
}

async function removeRecursive(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await removeRecursive(fullPath);
    } else {
      await unlink(fullPath);
    }
  }
  await rmdir(dirPath);
}
