/**
 * open_vault — Run pre-sync then open Obsidian vault.
 * Port of open_vault.ps1 (59 LOC → ~40 LOC).
 */

import { existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { exec } from 'node:child_process';
import { detectVaultRoot } from '../lib/vault-path.js';
import * as log from '../lib/logger.js';

/**
 * Open Obsidian vault using URI scheme (cross-platform).
 */
function openObsidian(vaultName) {
  const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  const platform = process.platform;

  if (platform === 'win32') {
    exec(`start "" "${uri}"`);
  } else if (platform === 'darwin') {
    exec(`open "${uri}"`);
  } else {
    exec(`xdg-open "${uri}"`);
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 */
export async function openVault(opts = {}) {
  const vaultRoot = opts.vaultRoot ? resolve(opts.vaultRoot) : detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root not found.');
    process.exitCode = 1;
    return;
  }

  const vaultName = basename(vaultRoot);

  // Run pre-sync first
  const preSyncPath = join(vaultRoot, '.sync', '_tools', 'cli-node', 'src', 'commands', 'pre-sync.js');
  if (existsSync(preSyncPath)) {
    log.info('=== Pre-Sync ===');
    try {
      const { preSync } = await import('./pre-sync.js');
      await preSync({ vaultRoot });
    } catch (err) {
      log.warn(`Pre-sync failed: ${err.message}`);
    }
    log.info('');
  }

  // Open vault
  log.info(`=== Opening Obsidian vault: ${vaultName} ===`);
  openObsidian(vaultName);
}
