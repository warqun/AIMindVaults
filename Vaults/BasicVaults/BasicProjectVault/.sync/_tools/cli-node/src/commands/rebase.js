/**
 * rebase — Change a satellite vault's bound Hub.
 *
 * Steps:
 *  1. Validate target Hub
 *  2. Dry-run: show what would change (new hub-source.json, pruned files, added files)
 *  3. Write/update satellite's .sync/hub-source.json
 *  4. Trigger a fresh sync from the new Hub (Add + Prune)
 *
 * Safety:
 *  - Contents/ is never touched (prune scope = .sync/ and .obsidian/ only)
 *  - --dry-run required before actual rebase (unless --yes)
 *  - Existing hub-source.json is backed up as .hub-source.json.bak
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile, copyFile } from 'node:fs/promises';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHub, readHubMarker, resolveHub } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * @param {object} opts
 * @param {string} opts.hub - Path to new target Hub (required)
 * @param {string} [opts.vaultRoot] - Satellite vault root (auto-detect from CWD)
 * @param {string} [opts.hubId] - Override hub-id check
 * @param {boolean} [opts.dryRun] - Preview without making changes
 * @param {boolean} [opts.yes] - Skip confirmation (use with CI / scripts)
 */
export async function rebase(opts = {}) {
  if (!opts.hub) {
    log.error('--hub <path> is required.');
    process.exitCode = 1;
    return;
  }

  const vaultRoot = opts.vaultRoot ? resolve(opts.vaultRoot) : detectVaultRootCwd();
  if (!vaultRoot) {
    log.error('Satellite vault root not found. Run from within a vault or use --vault-root.');
    process.exitCode = 1;
    return;
  }

  // Refuse if satellite is actually a Hub
  if (isHub(vaultRoot)) {
    log.error(`Refusing to rebase a Hub vault: ${vaultRoot}`);
    log.error('Only satellite vaults can be rebased.');
    process.exitCode = 1;
    return;
  }

  const newHubPath = resolve(opts.hub);
  if (!isHub(newHubPath)) {
    log.error(`Target is not a Hub (no .hub_marker / hub-marker.json): ${newHubPath}`);
    process.exitCode = 1;
    return;
  }

  const newHubMarker = readHubMarker(newHubPath);
  const newHubId = opts.hubId || newHubMarker?.hubId || 'core';

  // Detect current binding
  const currentResolution = resolveHub(vaultRoot);
  const currentHubPath = currentResolution.hubPath;
  const currentHubMarker = currentHubPath ? readHubMarker(currentHubPath) : null;
  const currentHubId = currentHubMarker?.hubId || '(legacy scan)';
  const currentSource = currentResolution.source;

  const today = new Date().toISOString().slice(0, 10);

  log.info('====================================================');
  log.info(' Rebase — Satellite Hub Change');
  log.info('====================================================');
  log.info(` Satellite    : ${vaultRoot}`);
  log.info(` Current Hub  : ${currentHubPath || '(not resolved)'} [source=${currentSource}, hubId=${currentHubId}]`);
  log.info(` Target Hub   : ${newHubPath} [hubId=${newHubId}]`);
  log.info(' Scope        : .sync/ + .obsidian/ (prune + add). Contents/ untouched.');
  if (opts.dryRun) log.info(' Mode         : DRY_RUN (no changes written)');
  log.info('----------------------------------------------------');

  // Early exit if same Hub
  if (currentHubPath && resolve(currentHubPath) === newHubPath) {
    log.info('\nAlready bound to target Hub. No rebase needed.');
    log.envVar('REBASE_RESULT', 'NOOP');
    return;
  }

  // Prepare new hub-source.json
  const relHubPath = relative(vaultRoot, newHubPath).split(/[/\\]/).join('/');
  const newHubSource = {
    hubPath: relHubPath || '.',
    hubId: newHubId,
    bindAt: today,
  };

  log.info('\n--- hub-source.json (new) ---');
  log.info(JSON.stringify(newHubSource, null, 2));

  if (opts.dryRun) {
    log.info('\n--- Forecast: sync after rebase would ---');
    log.info(' - PULL all files from target Hub (.sync/, .obsidian/ plugins)');
    log.info(' - PRUNE files present in current satellite but absent in target Hub');
    log.info(' - PRESERVE Contents/ entirely');
    log.info('\n[DRY_RUN] No changes written. Re-run without --dry-run to apply.');
    log.envVar('REBASE_RESULT', 'DRY_RUN');
    return;
  }

  // Backup existing hub-source.json if present
  const hubSourcePath = join(vaultRoot, '.sync', 'hub-source.json');
  if (existsSync(hubSourcePath)) {
    const bakPath = hubSourcePath + '.bak';
    await copyFile(hubSourcePath, bakPath);
    log.info(`\nBacked up existing hub-source.json → ${bakPath}`);
  }

  // Write new hub-source.json
  await writeFile(hubSourcePath, JSON.stringify(newHubSource, null, 2) + '\n', 'utf8');
  log.info(`\nWrote .sync/hub-source.json (hubId="${newHubId}", hubPath="${relHubPath}")`);

  // Trigger fresh sync against new Hub
  log.info('\n--- Fresh sync from new Hub ---');
  const { syncWorkspace } = await import('./sync-workspace.js');
  await syncWorkspace({ vaultRoot });

  log.info('\n====================================================');
  log.info(' Rebase Complete');
  log.info('====================================================');
  log.envVar('REBASE_RESULT', 'OK');
  log.envVar('REBASE_FROM', currentHubId);
  log.envVar('REBASE_TO', newHubId);
}
