/**
 * Launcher install helpers for double-click sync entrypoints.
 *
 * Source templates live under `.sync/_tools/launchers/`.
 * Root launchers are copied to AIMindVaults root; vault launchers are copied
 * under each vault's `.sync/` folder after sync so Obsidian does not show
 * utility files in the vault root.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { copyFile, chmod, mkdir, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { findAIMindVaultsRoot, findHubsByType } from './hub-resolver.js';

export const ROOT_LAUNCHERS = [
  'Sync All Vaults.bat',
  'Sync All Vaults.command',
  'Sync All Vaults.sh',
];

export const VAULT_LAUNCHERS = [
  'Sync This Vault.bat',
  'Sync This Vault.command',
  'Sync This Vault.sh',
];

const SKIP_DIRS = new Set(['.git', '.trash', '.vault_data', 'node_modules']);

function sameFile(source, target) {
  if (!existsSync(source) || !existsSync(target)) return false;
  const a = readFileSync(source);
  const b = readFileSync(target);
  return a.length === b.length && a.equals(b);
}

async function copyTemplate(source, target, opts = {}) {
  const dryRun = !!opts.dryRun;
  const executable = /\.(sh|command)$/i.test(target);

  if (!existsSync(source)) {
    return { copied: 0, skipped: `missing template: ${source}` };
  }
  if (sameFile(source, target)) {
    if (executable && !dryRun) {
      try { await chmod(target, 0o755); } catch {}
    }
    return { copied: 0, unchanged: 1 };
  }

  if (!dryRun) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    if (executable) {
      try { await chmod(target, 0o755); } catch {}
    }
  }
  return { copied: 1, unchanged: 0 };
}

function defaultRootTemplateDir(coreHubRoot) {
  return join(coreHubRoot, '.sync', '_tools', 'launchers', 'root');
}

function defaultVaultTemplateDir(vaultRoot) {
  return join(vaultRoot, '.sync', '_tools', 'launchers', 'vault');
}

function vaultLauncherTargetDir(vaultRoot) {
  return join(vaultRoot, '.sync');
}

async function cleanupLegacyVaultLaunchers(vaultRoot, opts = {}) {
  let removed = 0;
  for (const name of VAULT_LAUNCHERS) {
    const target = join(vaultRoot, name);
    if (!existsSync(target)) continue;
    removed++;
    if (!opts.dryRun) {
      await unlink(target);
    }
    if (opts.log) {
      opts.log(`[LAUNCHER] cleanup ${basename(vaultRoot)}/${name}`);
    }
  }
  return removed;
}

export function resolveAIMRoot(explicitRoot, startPath = process.cwd()) {
  if (explicitRoot) return resolve(explicitRoot);
  const found = findAIMindVaultsRoot(startPath);
  if (found) return found;
  const cwd = resolve(startPath);
  if (existsSync(join(cwd, 'Vaults', 'BasicVaults'))) return cwd;
  return null;
}

export function resolveCoreHubRoot(aimRoot) {
  const conventional = join(aimRoot, 'Vaults', 'BasicVaults', 'CoreHub');
  if (existsSync(join(conventional, '.sync', '_tools', 'cli-node', 'bin', 'cli.js'))) {
    return conventional;
  }
  const hubs = findHubsByType(aimRoot, 'core');
  return hubs.length > 0 ? hubs[0] : null;
}

export function findVaultsWithCli(aimRoot) {
  const vaultsDir = join(aimRoot, 'Vaults');
  if (!existsSync(vaultsDir)) return [];

  const results = [];
  function scan(dir, depth) {
    if (depth > 8) return;
    const cli = join(dir, '.sync', '_tools', 'cli-node', 'bin', 'cli.js');
    if (existsSync(cli)) {
      results.push(resolve(dir));
      return;
    }

    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      scan(join(dir, entry.name), depth + 1);
    }
  }

  scan(vaultsDir, 0);
  return [...new Set(results)].sort((a, b) => a.localeCompare(b));
}

export async function installRootLaunchers(aimRoot, opts = {}) {
  const coreHubRoot = opts.coreHubRoot || resolveCoreHubRoot(aimRoot);
  if (!coreHubRoot) {
    return { copied: 0, unchanged: 0, skipped: ['CoreHub not found'] };
  }

  const templateDir = opts.templateDir || defaultRootTemplateDir(coreHubRoot);
  const summary = { copied: 0, unchanged: 0, skipped: [] };

  for (const name of ROOT_LAUNCHERS) {
    const result = await copyTemplate(join(templateDir, name), join(aimRoot, name), opts);
    summary.copied += result.copied || 0;
    summary.unchanged += result.unchanged || 0;
    if (result.skipped) summary.skipped.push(result.skipped);
    if (opts.log && result.copied) opts.log(`[LAUNCHER] ${name}`);
  }
  return summary;
}

export async function installVaultLaunchers(vaultRoot, opts = {}) {
  const templateDir = opts.templateDir || defaultVaultTemplateDir(vaultRoot);
  const targetDir = opts.targetDir || vaultLauncherTargetDir(vaultRoot);
  const summary = { copied: 0, unchanged: 0, removed: 0, skipped: [] };

  if (!existsSync(templateDir)) {
    return { copied: 0, unchanged: 0, removed: 0, skipped: [`template dir missing: ${templateDir}`] };
  }

  for (const name of VAULT_LAUNCHERS) {
    const result = await copyTemplate(join(templateDir, name), join(targetDir, name), opts);
    summary.copied += result.copied || 0;
    summary.unchanged += result.unchanged || 0;
    if (result.skipped) summary.skipped.push(result.skipped);
    if (opts.log && result.copied) opts.log(`[LAUNCHER] ${basename(vaultRoot)}/.sync/${name}`);
  }
  summary.removed = await cleanupLegacyVaultLaunchers(vaultRoot, opts);
  return summary;
}
