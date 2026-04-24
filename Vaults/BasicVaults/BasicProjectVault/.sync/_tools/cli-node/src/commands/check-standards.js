/**
 * check-standards — Display _Standards/ directory structure.
 * Merged port of check_standards.ps1 + verify_structure.ps1.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { detectVaultRoot } from '../lib/vault-path.js';
import * as log from '../lib/logger.js';

function listDir(dirPath, label) {
  if (!existsSync(dirPath)) {
    log.warn(`${label} — not found`);
    return;
  }
  const entries = readdirSync(dirPath, { withFileTypes: true });
  if (entries.length === 0) {
    log.info(`${label} — (empty)`);
    return;
  }
  log.info(`${label}`);
  for (const e of entries) {
    const marker = e.isDirectory() ? '/' : '';
    console.log(`  ${e.name}${marker}`);
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 * @param {boolean} [opts.deep] - Show subdirectories (Core/NoteTemplates, Core/VaultTypes, Domain/)
 */
export function checkStandards(opts = {}) {
  const vaultRoot = opts.vaultRoot ? resolve(opts.vaultRoot) : detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root not found.');
    process.exitCode = 1;
    return;
  }

  const stdPath = join(vaultRoot, '_Standards');
  if (!existsSync(stdPath)) {
    log.error(`_Standards/ not found in ${basename(vaultRoot)}`);
    process.exitCode = 1;
    return;
  }

  listDir(stdPath, '=== _Standards/ ===');
  listDir(join(stdPath, 'Core'), '=== Core/ ===');

  if (opts.deep) {
    listDir(join(stdPath, 'Core', 'NoteTemplates'), '=== Core/NoteTemplates/ ===');
    listDir(join(stdPath, 'Core', 'NoteTemplates', 'Domain'), '=== Core/NoteTemplates/Domain/ ===');
    listDir(join(stdPath, 'Core', 'NoteTemplates', 'Project'), '=== Core/NoteTemplates/Project/ ===');
    listDir(join(stdPath, 'Core', 'VaultTypes'), '=== Core/VaultTypes/ ===');
    listDir(join(stdPath, 'Domain'), '=== Domain/ ===');
  }
}
