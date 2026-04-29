/**
 * register-vaults — Bulk-register AIMindVaults satellite vaults into
 * Obsidian's global vault registry (obsidian.json).
 *
 * Design (2026-04-24 deep research derived):
 *   1. Refuse to run while Obsidian is open (live write-back corruption risk).
 *   2. Scan `Vaults/**` for directories containing `.obsidian/`.
 *   3. Diff scanned paths against current registry entries.
 *   4. Report dry-run summary. Only mutate when `--apply` passed.
 *   5. Atomic write (temp file + rename), UTF-8 no BOM, 2-space indent.
 *   6. Create timestamped backup before write.
 *   7. Do NOT touch existing entries' `open` flag (preserves user session).
 *   8. Advise user to restart Obsidian after successful apply.
 *
 * Scope per user decision (2026-04-24):
 *   - `--notebook-profile` option is intentionally OMITTED. User prefers
 *     uniform environment across devices. Instance-count limit (Codex B-3)
 *     is the alternative path.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addVaultsToRegistry,
  backupRegistry,
  computeRegistryDiff,
  getObsidianConfigPath,
  isObsidianRunning,
  readRegistry,
  restoreRegistry,
  scanVaultsWithObsidian,
  writeRegistryAtomic,
} from '../lib/obsidian-registry.js';
import { findAIMindVaultsRoot } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

function resolveAIMRoot(explicit, startPath = process.cwd()) {
  if (explicit) return resolve(explicit);
  const found = findAIMindVaultsRoot(startPath);
  if (found) return found;
  const cwd = resolve(startPath);
  if (existsSync(`${cwd}/Vaults/BasicVaults`)) return cwd;
  return null;
}

function formatList(paths) {
  if (!paths.length) return '  (none)';
  return paths.map((p) => `  - ${p}`).join('\n');
}

export async function registerVaults(opts = {}) {
  const aimRoot = resolveAIMRoot(opts.root);
  if (!aimRoot) {
    log.error('AIMindVaults root not found. Use --root <path>.');
    process.exitCode = 1;
    return;
  }

  log.info('=== Register Vaults ===');
  log.info(`Root : ${aimRoot}`);
  if (opts.apply) log.info('Mode : APPLY (will modify obsidian.json)');
  else log.info('Mode : DRY_RUN (use --apply to modify)');

  // 1. Locate obsidian.json
  const configPath = opts.configPath ? resolve(opts.configPath) : getObsidianConfigPath();
  if (!configPath) {
    log.error('Could not determine obsidian.json location for this platform.');
    process.exitCode = 1;
    return;
  }
  log.info(`Config: ${configPath}`);
  if (!existsSync(configPath)) {
    log.warn('obsidian.json does not exist yet.');
    log.warn('Open Obsidian at least once (any vault) to create it, then re-run.');
    if (!opts.apply) {
      log.envVar('REGISTER_VAULTS_RESULT', 'NO_CONFIG');
      return;
    }
  }

  // 2. Obsidian running?
  if (!opts.skipProcessCheck) {
    const running = isObsidianRunning();
    if (running === true) {
      log.error('Obsidian is currently running. Close all Obsidian windows and retry.');
      log.error('Editing obsidian.json while the app runs can silently revert changes.');
      if (!opts.force) {
        process.exitCode = 2;
        log.envVar('REGISTER_VAULTS_RESULT', 'OBSIDIAN_RUNNING');
        return;
      }
      log.warn('--force given: proceeding despite running Obsidian. NOT RECOMMENDED.');
    } else if (running === null) {
      log.warn('Could not determine whether Obsidian is running (process check failed).');
    }
  }

  // 3. Scan vaults
  const scanned = scanVaultsWithObsidian(aimRoot);
  log.info(`Scanned vaults (with .obsidian/) : ${scanned.length}`);

  // 4. Read registry + compute diff
  const registry = await readRegistry(configPath);
  const diff = computeRegistryDiff(registry.data, scanned, aimRoot);

  log.info('');
  log.info(`Existing matched entries : ${diff.existing.length}`);
  log.info(`To add                   : ${diff.toAdd.length}`);
  log.info(`Stale entries in scope   : ${diff.stale.filter((s) => s.inScope).length}`);

  if (diff.toAdd.length) {
    log.info('');
    log.info('[TO ADD]');
    log.info(formatList(diff.toAdd));
  }
  if (diff.stale.length) {
    log.info('');
    log.info('[STALE in AIMindVaults scope]');
    const inScope = diff.stale.filter((s) => s.inScope);
    log.info(formatList(inScope.map((s) => `${s.path}  [${s.reason}]`)));
    const outOfScope = diff.stale.filter((s) => !s.inScope);
    if (outOfScope.length) {
      log.info('');
      log.info('[STALE outside AIMindVaults — left untouched]');
      log.info(formatList(outOfScope.map((s) => `${s.path}  [${s.reason}]`)));
    }
  }

  // 5. Apply or stop
  if (!opts.apply) {
    log.info('');
    log.info('Dry-run only. Pass --apply to modify obsidian.json.');
    log.envVar('REGISTER_VAULTS_RESULT', 'DRY_RUN');
    log.envVar('REGISTER_VAULTS_TO_ADD', String(diff.toAdd.length));
    return;
  }

  if (!diff.toAdd.length) {
    log.info('');
    log.info('No new vaults to add. Registry already covers all scanned vaults.');
    log.envVar('REGISTER_VAULTS_RESULT', 'NOOP');
    return;
  }

  // 6. Backup + write
  let backupPath = null;
  if (existsSync(configPath)) {
    backupPath = await backupRegistry(configPath);
    log.info('');
    log.info(`Backup : ${backupPath}`);
  }

  try {
    const added = addVaultsToRegistry(registry.data, diff.toAdd);
    await writeRegistryAtomic(configPath, registry.data);
    log.info(`Added  : ${added} vault entries`);
    log.info('');
    log.info('✓ obsidian.json updated. Next steps:');
    log.info('  1. Launch Obsidian. Vault switcher should list all AIMindVaults vaults.');
    log.info('  2. First time opening each vault: click "Trust author and enable plugins".');
    log.info('  3. Shell Commands auto-sync runs on vault open (on-layout-ready event).');
    log.info('  4. If auto-sync fails, run `Sync This Vault.bat` from the vault root.');
    log.envVar('REGISTER_VAULTS_RESULT', 'APPLIED');
    log.envVar('REGISTER_VAULTS_ADDED', String(added));
    if (backupPath) log.envVar('REGISTER_VAULTS_BACKUP', backupPath);
  } catch (err) {
    log.error(`Failed to write registry: ${err.message}`);
    if (backupPath) {
      log.warn(`Attempting rollback from backup: ${backupPath}`);
      try {
        await restoreRegistry(configPath, backupPath);
        log.info('Rollback succeeded.');
      } catch (rollbackErr) {
        log.error(`Rollback failed: ${rollbackErr.message}`);
        log.error(`Manual restore: copy "${backupPath}" over "${configPath}".`);
      }
    }
    process.exitCode = 1;
    log.envVar('REGISTER_VAULTS_RESULT', 'WRITE_FAILED');
  }
}
