/**
 * sync-all — Run pre-sync across every vault with a cli-node copy.
 *
 * Designed for the root `Sync All Vaults.*` launchers. It installs missing
 * node_modules per vault, runs `pre-sync`, appends output to root sync.log,
 * and refreshes per-vault `.sync/` launchers after sync.
 */

import { existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  findVaultsWithCli,
  installRootLaunchers,
  installVaultLaunchers,
  resolveAIMRoot,
  resolveCoreHubRoot,
} from '../lib/launchers.js';
import * as log from '../lib/logger.js';

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function secondsSince(startMs) {
  return Math.max(0, Math.round((Date.now() - startMs) / 1000));
}

function redact(text) {
  let out = text || '';
  const homes = [process.env.USERPROFILE, process.env.HOME].filter(Boolean);
  for (const home of homes) {
    out = out.split(home).join('<user-home>');
  }
  return out;
}

async function appendLog(logFile, line) {
  await appendFile(logFile, redact(line), 'utf8');
}

function resolveCommand(command) {
  if (process.platform === 'win32' && command.toLowerCase() === 'npm') {
    return 'npm.cmd';
  }
  return command;
}

function runCommand(command, args, cwd) {
  return spawnSync(resolveCommand(command), args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
}

async function ensureNodeModules(vaultName, cliNodeDir, logFile, opts) {
  const modulesDir = join(cliNodeDir, 'node_modules');
  if (existsSync(modulesDir)) {
    await appendLog(logFile, `[${timestamp()}] [${vaultName}] npm install... SKIP (node_modules exists)\n`);
    return { ok: true, skipped: true, seconds: 0 };
  }

  if (opts.skipNpm) {
    await appendLog(logFile, `[${timestamp()}] [${vaultName}] npm install... SKIP (--skip-npm)\n`);
    return { ok: true, skipped: true, seconds: 0 };
  }

  if (opts.dryRun) {
    await appendLog(logFile, `[${timestamp()}] [${vaultName}] npm install... DRY_RUN\n`);
    return { ok: true, skipped: true, seconds: 0 };
  }

  const start = Date.now();
  await appendLog(logFile, `[${timestamp()}] [${vaultName}] npm install... START\n`);
  const result = runCommand('npm', ['install', '--no-audit', '--no-fund'], cliNodeDir);
  const elapsed = secondsSince(start);
  if (result.stdout) await appendLog(logFile, result.stdout);
  if (result.stderr) await appendLog(logFile, result.stderr);
  await appendLog(logFile, `[${timestamp()}] [${vaultName}] npm install... ${result.status === 0 ? 'OK' : 'FAIL'} (${elapsed}s)\n`);
  return { ok: result.status === 0, skipped: false, seconds: elapsed, exitCode: result.status };
}

async function runPreSync(vaultName, vaultRoot, cliPath, logFile, opts) {
  if (opts.dryRun) {
    await appendLog(logFile, `[${timestamp()}] [${vaultName}] pre-sync... DRY_RUN\n`);
    return { ok: true, seconds: 0 };
  }

  const start = Date.now();
  await appendLog(logFile, `[${timestamp()}] [${vaultName}] pre-sync... START\n`);
  const result = runCommand(process.execPath, [cliPath, 'pre-sync', '--vault-root', vaultRoot], vaultRoot);
  const elapsed = secondsSince(start);
  if (result.stdout) await appendLog(logFile, result.stdout);
  if (result.stderr) await appendLog(logFile, result.stderr);
  await appendLog(logFile, `[${timestamp()}] [${vaultName}] pre-sync... ${result.status === 0 ? 'OK' : 'FAIL'} (${elapsed}s)\n`);
  return { ok: result.status === 0, seconds: elapsed, exitCode: result.status };
}

export async function syncAll(opts = {}) {
  const aimRoot = resolveAIMRoot(opts.root);
  if (!aimRoot) {
    log.error('AIMindVaults root not found. Use --root.');
    process.exitCode = 1;
    return;
  }

  const logFile = join(aimRoot, 'sync.log');
  const coreHubRoot = resolveCoreHubRoot(aimRoot);
  const vaults = findVaultsWithCli(aimRoot);

  if (vaults.length === 0) {
    log.error('No vaults with .sync/_tools/cli-node/bin/cli.js were found.');
    process.exitCode = 1;
    return;
  }

  const startAll = Date.now();
  let okCount = 0;
  let failCount = 0;
  let npmInstalled = 0;
  let launcherCopied = 0;
  let legacyRemoved = 0;
  const vaultTemplateDir = coreHubRoot
    ? join(coreHubRoot, '.sync', '_tools', 'launchers', 'vault')
    : undefined;

  log.info('=== Sync All Vaults ===');
  log.info(`Root : ${aimRoot}`);
  log.info(`Vaults: ${vaults.length}`);
  log.info(`Log  : ${logFile}`);
  if (opts.dryRun) log.info('Mode : DRY_RUN');
  log.info('');

  await appendLog(logFile, `\n========== Sync All Vaults ${timestamp()} ==========\n`);

  if (opts.installLaunchers !== false && coreHubRoot) {
    const rootResult = await installRootLaunchers(aimRoot, { coreHubRoot, dryRun: opts.dryRun });
    launcherCopied += rootResult.copied;
  }

  for (const vaultRoot of vaults) {
    const vaultName = basename(vaultRoot);
    const cliNodeDir = join(vaultRoot, '.sync', '_tools', 'cli-node');
    const cliPath = join(cliNodeDir, 'bin', 'cli.js');

    log.info(`[${vaultName}] syncing...`);
    const npmResult = await ensureNodeModules(vaultName, cliNodeDir, logFile, opts);
    if (!npmResult.ok) {
      failCount++;
      log.error(`  npm install failed (${vaultName})`);
      continue;
    }
    if (!npmResult.skipped) npmInstalled++;

    const syncResult = await runPreSync(vaultName, vaultRoot, cliPath, logFile, opts);
    if (!syncResult.ok) {
      failCount++;
      log.error(`  pre-sync failed (${vaultName})`);
      continue;
    }

    if (opts.installLaunchers !== false) {
      const launchResult = await installVaultLaunchers(vaultRoot, {
        templateDir: vaultTemplateDir,
        dryRun: opts.dryRun,
      });
      launcherCopied += launchResult.copied;
      legacyRemoved += launchResult.removed || 0;
    }

    okCount++;
    log.info(`  OK (${vaultName})`);
  }

  const elapsed = secondsSince(startAll);
  await appendLog(logFile, `========== Summary: success=${okCount} fail=${failCount} elapsed=${elapsed}s ==========\n`);

  log.info('');
  log.info('=== Sync All Complete ===');
  log.info(`Success      : ${okCount}`);
  log.info(`Failed       : ${failCount}`);
  log.info(`npm installs : ${npmInstalled}`);
  log.info(`Launchers    : ${launcherCopied} copied`);
  log.info(`Cleanup      : ${legacyRemoved} legacy launchers removed`);
  log.info(`Elapsed      : ${elapsed}s`);
  log.envVar('SYNC_ALL_SUCCESS', String(okCount));
  log.envVar('SYNC_ALL_FAILED', String(failCount));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}
