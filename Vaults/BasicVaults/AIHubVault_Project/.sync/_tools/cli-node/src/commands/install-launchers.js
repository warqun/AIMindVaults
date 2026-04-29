/**
 * install-launchers — Install double-click sync launchers.
 *
 * Copies root-level `Sync All Vaults.*` launchers and per-vault `.sync/`
 * `Sync This Vault.*` launchers from CoreHub templates.
 */

import {
  findVaultsWithCli,
  installRootLaunchers,
  installVaultLaunchers,
  resolveAIMRoot,
  resolveCoreHubRoot,
} from '../lib/launchers.js';
import * as log from '../lib/logger.js';
import { join } from 'node:path';

export async function installLaunchers(opts = {}) {
  const aimRoot = resolveAIMRoot(opts.root);
  if (!aimRoot) {
    log.error('AIMindVaults root not found. Use --root.');
    process.exitCode = 1;
    return;
  }

  const coreHubRoot = resolveCoreHubRoot(aimRoot);
  if (!coreHubRoot && !opts.vaultRoot) {
    log.error('CoreHub not found. Cannot install root launchers.');
    process.exitCode = 1;
    return;
  }

  log.info('=== Install Sync Launchers ===');
  log.info(`Root: ${aimRoot}`);
  if (opts.dryRun) log.info('Mode: DRY_RUN');

  let rootCopied = 0;
  let vaultCopied = 0;
  let legacyRemoved = 0;
  let vaultCount = 0;
  const vaultTemplateDir = coreHubRoot
    ? join(coreHubRoot, '.sync', '_tools', 'launchers', 'vault')
    : undefined;

  if (!opts.vaultOnly && !opts.vaultRoot) {
    const rootResult = await installRootLaunchers(aimRoot, {
      coreHubRoot,
      dryRun: opts.dryRun,
      log: (msg) => log.info(`  ${msg}`),
    });
    rootCopied = rootResult.copied;
  }

  const vaults = opts.vaultRoot ? [opts.vaultRoot] : findVaultsWithCli(aimRoot);
  if (!opts.rootOnly) {
    for (const vault of vaults) {
      vaultCount++;
      const result = await installVaultLaunchers(vault, {
        templateDir: vaultTemplateDir,
        dryRun: opts.dryRun,
        log: (msg) => log.info(`  ${msg}`),
      });
      vaultCopied += result.copied;
      legacyRemoved += result.removed || 0;
    }
  }

  log.info('');
  log.info(`Root launcher files copied : ${rootCopied}`);
  log.info(`Vaults processed          : ${opts.rootOnly ? 0 : vaultCount}`);
  log.info(`Vault launcher files copied: ${vaultCopied}`);
  log.info(`Legacy root files removed  : ${legacyRemoved}`);
  log.envVar('INSTALL_LAUNCHERS_RESULT', 'OK');
}
