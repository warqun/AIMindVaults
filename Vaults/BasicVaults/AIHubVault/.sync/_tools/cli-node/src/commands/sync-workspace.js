/**
 * sync_workspace — Hub-Sync: workspace synchronization between vaults.
 * Port of sync_workspace.ps1 (593 LOC → ~280 LOC).
 *
 * Compares _WORKSPACE_VERSION.md versions between current vault and Hub,
 * then mirrors .sync/ folder and merges Obsidian plugins accordingly.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile, copyFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, resolve, dirname, basename, relative, sep } from 'node:path';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import { SYNC_EXCLUDE_DIRS, SYNC_EXCLUDE_FILES } from '../lib/config.js';
import * as log from '../lib/logger.js';

// Core plugins — forced sync, cannot be removed per vault
const CORE_PLUGINS = [
  'obsidian-local-rest-api',
  'dataview',
  'templater-obsidian',
  'obsidian-linter',
];

// Plugins whose data.json is force-synced from Hub
const CORE_FORCE_DATA_JSON = ['obsidian-linter', 'obsidian-shellcommands'];

/**
 * Detect vault root from CWD by walking up looking for _VAULT-INDEX.md or CLAUDE.md.
 * Different from vault-path.js detectVaultRoot (which is script-location based).
 */
function detectVaultRootCwd() {
  let dir = process.cwd();
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
 * Find AIMindVaults root (parent that contains Vaults/).
 */
function findAIMindVaultsRoot(startPath) {
  let dir = startPath;
  for (let i = 0; i < 10; i++) {
    const parent = dirname(dir);
    if (parent === dir) break;
    if (existsSync(join(parent, 'Vaults'))) return parent;
    dir = parent;
  }
  return null;
}

/**
 * Find Hub vault by searching for .hub_marker under Vaults/.
 */
async function findHub(aimRoot, excludeVault) {
  const vaultsDir = join(aimRoot, 'Vaults');
  if (!existsSync(vaultsDir)) return null;

  async function searchDir(dir, depth) {
    if (depth > 3) return null;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);
      const normalized = resolve(full);
      if (normalized === excludeVault) continue;
      if (existsSync(join(full, '.sync', '.hub_marker'))) return normalized;
      const found = await searchDir(full, depth + 1);
      if (found) return found;
    }
    return null;
  }

  return searchDir(vaultsDir, 0);
}

/**
 * Parse latest version number from _WORKSPACE_VERSION.md.
 * Looks for first `| 123456789012 |` pattern in table.
 */
function parseLatestVersion(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(/^\|\s*(\d{12})\s*\|/m);
    return match ? match[1] : null;
  } catch { return null; }
}

// Sync import for version parsing (needs to be synchronous for simple flow)
import { readFileSync } from 'node:fs';

/**
 * Merge Obsidian plugins: Core forced, Custom preserved.
 */
async function syncPluginBatch(sourceRoot, targetRoot, dryRun) {
  const sourcePlugins = join(sourceRoot, '.obsidian', 'plugins');
  const targetPlugins = join(targetRoot, '.obsidian', 'plugins');
  let syncCount = 0;

  if (!existsSync(sourcePlugins)) {
    log.info('  [SKIP] Source has no .obsidian/plugins/');
    return 0;
  }
  if (!existsSync(targetPlugins) && !dryRun) {
    await mkdir(targetPlugins, { recursive: true });
  }

  // 1) Sync plugin folders
  const hubDirs = await readdir(sourcePlugins, { withFileTypes: true });
  for (const d of hubDirs.filter(e => e.isDirectory())) {
    const pluginId = d.name;
    const srcDir = join(sourcePlugins, pluginId);
    const tgtDir = join(targetPlugins, pluginId);
    const isCore = CORE_PLUGINS.includes(pluginId);

    if (isCore) log.info(`  [CORE] ${pluginId}`);

    if (!existsSync(tgtDir) && !dryRun) {
      await mkdir(tgtDir, { recursive: true });
    }

    const files = await readdir(srcDir, { withFileTypes: true });
    for (const f of files.filter(e => e.isFile())) {
      // data.json: skip unless core-force
      if (f.name === 'data.json' && existsSync(join(tgtDir, 'data.json'))) {
        if (!CORE_FORCE_DATA_JSON.includes(pluginId)) continue;
      }
      const srcFile = join(srcDir, f.name);
      const tgtFile = join(tgtDir, f.name);
      const display = `.obsidian/plugins/${pluginId}/${f.name}`;

      // Hash-free check: size+mtime
      let needsCopy = !existsSync(tgtFile);
      if (!needsCopy) {
        const { statSync } = await import('node:fs');
        const ss = statSync(srcFile);
        const ts = statSync(tgtFile);
        needsCopy = ss.size !== ts.size || ss.mtimeMs > ts.mtimeMs;
      }

      if (needsCopy) {
        if (dryRun) {
          log.info(`  [DRY] ${display}`);
        } else {
          await copyFile(srcFile, tgtFile);
          log.info(`  [SYNC] ${display}`);
        }
        syncCount++;
      }
    }
  }

  // 2) Merge community-plugins.json
  const srcCp = join(sourceRoot, '.obsidian', 'community-plugins.json');
  if (existsSync(srcCp)) {
    const cpResult = await mergeCommunityPlugins(srcCp, join(targetRoot, '.obsidian', 'community-plugins.json'), dryRun);
    syncCount += cpResult.newCount;

    // Create reload flag if new plugins added
    if (cpResult.newCount > 0 && !dryRun) {
      const reloadFlag = join(targetRoot, '.obsidian', '.sync-needs-reload');
      await writeFile(reloadFlag, `new=${cpResult.newCount}`, 'utf8');
    }
  }

  return syncCount;
}

/**
 * Merge community-plugins.json: Core forced + Hub custom + target unique preserved.
 */
async function mergeCommunityPlugins(srcPath, tgtPath, dryRun) {
  const extractIds = (text) => [...text.matchAll(/"([^"]+)"/g)].map(m => m[1]);

  const srcIds = extractIds(readFileSync(srcPath, 'utf8'));
  const tgtIds = existsSync(tgtPath) ? extractIds(readFileSync(tgtPath, 'utf8')) : [];

  // Merge: Core first → Hub custom → Target unique
  const merged = new Set(CORE_PLUGINS);
  for (const id of srcIds) merged.add(id);
  for (const id of tgtIds) merged.add(id);
  const sorted = [...merged].sort();

  const newPlugins = sorted.filter(id => !tgtIds.includes(id));
  const needsWrite = sorted.length !== tgtIds.length || newPlugins.length > 0;

  if (needsWrite) {
    if (dryRun) {
      log.info(`  [DRY] community-plugins.json merge: +${newPlugins.length}`);
    } else {
      // Write JSON array as text (no JSON.stringify to match PS1 safety rule)
      const lines = ['['];
      sorted.forEach((id, i) => {
        lines.push(`  "${id}"${i < sorted.length - 1 ? ',' : ''}`);
      });
      lines.push(']');
      await writeFile(tgtPath, lines.join('\n'), 'utf8');

      if (newPlugins.length > 0) {
        for (const p of newPlugins) {
          const tag = CORE_PLUGINS.includes(p) ? 'CORE' : 'ADD';
          log.info(`  [${tag}] ${p}`);
        }
      }
    }
  }

  return { newCount: newPlugins.length };
}

/**
 * Trigger Obsidian reload via local-rest-api.
 */
async function triggerObsidianReload(vaultPath) {
  const reloadFlag = join(vaultPath, '.obsidian', '.sync-needs-reload');
  if (!existsSync(reloadFlag)) return;

  try { await unlink(reloadFlag); } catch {}

  // Cooldown check (60s)
  const cooldownFile = join(vaultPath, '.obsidian', '.sync-reload-cooldown');
  if (existsSync(cooldownFile)) {
    const { statSync } = await import('node:fs');
    const elapsed = (Date.now() - statSync(cooldownFile).mtimeMs) / 1000;
    if (elapsed < 60) {
      log.info(`  [RELOAD] Cooldown (${Math.round(elapsed)}s ago) — skipped`);
      return;
    }
  }
  await writeFile(cooldownFile, new Date().toISOString(), 'utf8');

  const apiDataPath = join(vaultPath, '.obsidian', 'plugins', 'obsidian-local-rest-api', 'data.json');
  if (!existsSync(apiDataPath)) {
    log.info('  [RELOAD] local-rest-api not installed — manual reload needed');
    return;
  }

  try {
    const apiContent = readFileSync(apiDataPath, 'utf8');
    const keyMatch = apiContent.match(/"apiKey"\s*:\s*"([^"]+)"/);
    const portMatch = apiContent.match(/"insecurePort"\s*:\s*(\d+)/);
    if (!keyMatch) return;

    const apiKey = keyMatch[1];
    const port = portMatch ? parseInt(portMatch[1]) : 27123;

    const resp = await fetch(`http://localhost:${port}/commands/app%3Areload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (resp.ok) log.info('  [RELOAD] Obsidian reloaded (new plugins activated)');
  } catch (err) {
    log.info(`  [RELOAD] Obsidian reload failed: ${err.message}`);
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.hubPath]
 * @param {string} [opts.vaultRoot]
 * @param {boolean} [opts.dryRun]
 * @param {boolean} [opts.noPrune]
 * @param {boolean} [opts.verifyContent]
 */
export async function syncWorkspace(opts = {}) {
  // 1. Detect vault root
  const vaultRoot = opts.vaultRoot ? resolve(opts.vaultRoot) : detectVaultRootCwd();
  if (!vaultRoot) {
    log.error('Vault root not detected. Run from within a vault or use --vault-root.');
    process.exitCode = 1;
    return;
  }

  // 2. Self-check: is this Hub?
  if (existsSync(join(vaultRoot, '.sync', '.hub_marker'))) {
    log.envVar('SYNC_RESULT', 'SELF');
    log.info('Current vault is Hub. No sync needed.');
    return;
  }

  // 3. Find Hub
  let hubPath = opts.hubPath ? resolve(opts.hubPath) : null;
  if (!hubPath) {
    const aimRoot = findAIMindVaultsRoot(vaultRoot);
    if (aimRoot) hubPath = await findHub(aimRoot, resolve(vaultRoot));
  }
  if (!hubPath || !existsSync(hubPath)) {
    log.envVar('SYNC_RESULT', 'ERROR');
    log.error('Hub vault not found. Use --hub-path to specify.');
    process.exitCode = 1;
    return;
  }

  // 4. Parse versions
  const vaultVerFile = join(vaultRoot, '_WORKSPACE_VERSION.md');
  const hubVerFile = join(hubPath, '_WORKSPACE_VERSION.md');
  const hubVersion = parseLatestVersion(hubVerFile);
  let vaultVersion = parseLatestVersion(vaultVerFile);

  log.info('=== Workspace Sync ===');
  log.info(`Vault: ${vaultRoot}`);
  log.info(`Hub:   ${hubPath}`);
  log.info(`Vault version: ${vaultVersion || '(none)'}`);
  log.info(`Hub version:   ${hubVersion || '(none)'}`);
  log.info('');

  if (!hubVersion) {
    log.envVar('SYNC_RESULT', 'ERROR');
    log.error('Hub _WORKSPACE_VERSION.md missing or unparseable.');
    process.exitCode = 1;
    return;
  }
  if (!vaultVersion) {
    log.warn('Vault version missing — treating as initial sync (full PULL).');
    vaultVersion = '000000000000';
  }

  // 5. Direction
  let direction, source, target;
  if (vaultVersion === hubVersion) {
    direction = opts.verifyContent ? 'VERIFY' : 'PLUGIN_ONLY';
    source = hubPath; target = vaultRoot;
  } else if (hubVersion > vaultVersion) {
    direction = 'PULL'; source = hubPath; target = vaultRoot;
    log.info('SYNC_DIRECTION=PULL (Hub → Vault)');
  } else {
    direction = 'PUSH'; source = vaultRoot; target = hubPath;
    log.info('SYNC_DIRECTION=PUSH (Vault → Hub)');
  }

  let totalSync = 0;
  let totalPrune = 0;

  // 6. Batch 0: Plugin merge (PULL/VERIFY/PLUGIN_ONLY only)
  if (direction !== 'PUSH') {
    log.info('\n--- Batch 0: Obsidian plugin merge ---');
    totalSync += await syncPluginBatch(source, target, opts.dryRun);
  }

  // PLUGIN_ONLY: only Batch 0, then exit
  if (direction === 'PLUGIN_ONLY') {
    await triggerObsidianReload(target);
    if (totalSync > 0) {
      log.info(`\nPLUGIN_ONLY: ${totalSync} items merged.`);
    } else {
      log.envVar('SYNC_RESULT', 'UP_TO_DATE');
      log.info('\nPlugins up to date — no changes.');
    }
    return;
  }

  // 7. .sync/ folder mirror
  log.info('\n--- .sync/ folder mirror ---');
  const sourceSyncDir = join(source, '.sync');
  const targetSyncDir = join(target, '.sync');

  try {
    const mirrorResult = await mirrorDirectory(sourceSyncDir, targetSyncDir, {
      excludeDirs: SYNC_EXCLUDE_DIRS,
      excludeFiles: [...SYNC_EXCLUDE_FILES, '.hub_marker'],
      dryRun: opts.dryRun,
      noPrune: opts.noPrune,
      log: (msg) => log.info(`  ${msg}`),
    });
    totalSync += mirrorResult.copied;
    totalPrune += mirrorResult.deleted;
  } catch (err) {
    log.error(`.sync/ mirror failed: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  // 8. Version file sync
  log.info('\n--- Version sync ---');
  if (!opts.dryRun && direction !== 'VERIFY') {
    if (direction === 'PULL') {
      await copyFile(hubVerFile, vaultVerFile);
      log.info('  [SYNC] _WORKSPACE_VERSION.md');
    } else {
      await copyFile(vaultVerFile, hubVerFile);
      log.info('  [SYNC] _WORKSPACE_VERSION.md → Hub');
    }
  }

  // 9. Obsidian reload
  await triggerObsidianReload(target);

  // 10. Result
  log.info('\n=== Sync Complete ===');
  if (totalSync === 0 && totalPrune === 0) {
    const result = direction === 'VERIFY' ? 'VERIFIED' : 'VERSION_SYNCED';
    log.envVar('SYNC_RESULT', result);
  } else {
    const mode = opts.dryRun ? 'DRY_RUN' : 'SYNCED';
    const detail = `${totalSync} files${totalPrune > 0 ? `, ${totalPrune} pruned` : ''}`;
    log.envVar('SYNC_RESULT', mode);
    log.info(`Sync ${direction}: ${detail}`);
  }
}
