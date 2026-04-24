/**
 * clone_vault — Mirror-copy a vault to a new location.
 * Port of clone_vault.ps1 (172 LOC → ~100 LOC).
 *
 * Uses mirrorDirectory (noPrune) instead of robocopy.
 * Post-copy: removes per-device configs, updates make-md systemName.
 */

import { existsSync, readFileSync } from 'node:fs';
import { readdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import { isHub, readHubMarker } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directories excluded from clone (new vault gets its own)
const CLONE_EXCLUDE_DIRS = ['.git', '.stfolder', 'smart-connections', 'cache', '.vault_data'];

// Per-vault volatile files Obsidian regenerates
const CLONE_EXCLUDE_FILES = [
  'workspace.json', 'workspace-mobile.json', 'graph.json',
  'backlink-in-document.json', '.stignore',
];

// Per-device plugin configs to remove after clone
const PER_DEVICE_CONFIGS = [
  '.obsidian/plugins/obsidian-git/data.json',
  '.obsidian/plugins/claudian/data.json',
];

/**
 * @param {object} opts
 * @param {string} opts.targetPath - Destination path for new vault
 * @param {string} [opts.projectName] - Display name (defaults to folder name)
 * @param {string} [opts.sourcePath] - Source vault (auto-detect: parent of .sync/)
 * @param {string} [opts.hub] - Hub vault root for the new satellite to bind to.
 *                              Auto-writes .sync/hub-source.json after clone.
 *                              If omitted, no hub-source.json is written (legacy scan).
 */
export async function cloneVault(opts) {
  if (!opts.targetPath) {
    log.error('--target-path is required.');
    process.exitCode = 1;
    return;
  }

  // Detect source vault root (cli-node is inside .sync/_tools/cli-node/)
  const sourceRoot = opts.sourcePath
    ? resolve(opts.sourcePath)
    : resolve(__dirname, '..', '..', '..', '..', '..');

  const targetPath = resolve(opts.targetPath);
  const projectName = opts.projectName || basename(targetPath);

  // Resolve hub binding target (if specified)
  let hubBindPath = null;
  let hubBindMarker = null;
  if (opts.hub) {
    hubBindPath = resolve(opts.hub);
    if (!isHub(hubBindPath)) {
      log.error(`--hub path is not a Hub (no .hub_marker / hub-marker.json): ${hubBindPath}`);
      process.exitCode = 1;
      return;
    }
    hubBindMarker = readHubMarker(hubBindPath);
  }

  log.info('====================================================');
  log.info(' Obsidian Vault Clone');
  log.info('====================================================');
  log.info(` Source : ${sourceRoot}`);
  log.info(` Target : ${targetPath}`);
  log.info(` Name   : ${projectName}`);
  log.info('----------------------------------------------------');

  // Safety: prevent target inside source
  if (targetPath.startsWith(sourceRoot + '/') || targetPath.startsWith(sourceRoot + '\\')) {
    log.error('Target is inside source directory. This would cause infinite recursive copy.');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(sourceRoot)) {
    log.error(`Source path not found: ${sourceRoot}`);
    process.exitCode = 1;
    return;
  }

  // Step 1: Mirror copy
  log.info('\n[1/3] Copying files...');
  try {
    const result = await mirrorDirectory(sourceRoot, targetPath, {
      excludeDirs: CLONE_EXCLUDE_DIRS,
      excludeFiles: CLONE_EXCLUDE_FILES,
      noPrune: true,  // Don't delete extra files in target
      log: (msg) => log.info(`  ${msg}`),
    });
    log.info(`  Copied: ${result.copied}, Unchanged: ${result.unchanged}`);
  } catch (err) {
    log.error(`Copy failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // Step 2: Remove per-device plugin configs
  log.info('\n[2/3] Removing per-device plugin configs...');
  for (const rel of PER_DEVICE_CONFIGS) {
    const filePath = join(targetPath, rel);
    if (existsSync(filePath)) {
      await unlink(filePath);
      log.info(`  - Removed: ${rel}`);
    }
  }

  // Step 3: Update make-md systemName
  log.info('\n[3/4] Updating plugin settings...');
  const makeMdPath = join(targetPath, '.obsidian', 'plugins', 'make-md', 'data.json');
  if (existsSync(makeMdPath)) {
    try {
      const content = readFileSync(makeMdPath, 'utf8');
      const updated = content.replace(/"systemName"\s*:\s*"[^"]*"/, `"systemName": "${projectName}"`);
      if (content !== updated) {
        await writeFile(makeMdPath, updated, 'utf8');
        log.info(`  - make-md systemName -> ${projectName} [OK]`);
      } else {
        log.info('  - make-md systemName: already up to date');
      }
    } catch (err) {
      log.warn(`  Could not update make-md: ${err.message}`);
    }
  } else {
    log.info('  - make-md plugin not found, skipping');
  }

  // Step 4: Write hub-source.json if --hub specified
  log.info('\n[4/4] Writing hub-source.json...');
  if (hubBindPath) {
    const relHub = relative(targetPath, hubBindPath).split(/[/\\]/).join('/');
    const hubSource = {
      hubPath: relHub || '.',
      hubId: hubBindMarker?.hubId || opts.hubId || 'core',
      bindAt: new Date().toISOString().slice(0, 10),
    };
    const hubSourcePath = join(targetPath, '.sync', 'hub-source.json');
    await writeFile(hubSourcePath, JSON.stringify(hubSource, null, 2) + '\n', 'utf8');
    log.info(`  - Wrote: .sync/hub-source.json (hubId="${hubSource.hubId}", hubPath="${hubSource.hubPath}")`);

    // Also clean stale .hub_marker if the clone source was a Hub but target is satellite
    const staleMarker = join(targetPath, '.sync', '.hub_marker');
    if (existsSync(staleMarker)) {
      await unlink(staleMarker);
      log.info(`  - Removed stale .hub_marker (cloned satellite is not a Hub)`);
    }
  } else {
    log.info('  - No --hub specified, skipping hub-source.json (legacy scan fallback will be used)');
  }

  log.info('\n====================================================');
  log.info(' DONE');
  log.info('====================================================');
  log.info(` Vault copied to : ${targetPath}`);
  log.info(` System name set : ${projectName}`);
  log.info('');
  log.info(' Next: Open Obsidian -> Manage vaults -> Open folder');
  log.info(`       Select: ${targetPath}`);
  log.info('====================================================');
}
