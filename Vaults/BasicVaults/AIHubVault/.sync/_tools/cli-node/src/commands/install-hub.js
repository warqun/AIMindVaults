/**
 * install-hub — Clone a Hub from a git URL into Vaults/BasicVaults/.
 *
 * Post-clone:
 *  - Validate it's a proper Hub (has `.hub_marker` or `hub-marker.json`)
 *  - Show hubId / hubType / version / coreHubVersion (if any)
 *  - For Preset Hubs: resolve coreHub pointer + check compatibility
 *  - Strip per-device configs (same as clone-vault)
 *
 * Out of scope (user-driven follow-up):
 *  - Running core-sync-all to push local Core to the newly installed Preset
 *  - Binding existing satellites to the new Hub via hub-source.json
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isHub, readHubMarker, findAIMindVaultsRoot } from '../lib/hub-resolver.js';
import { checkVersionRange } from '../lib/version-range.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PER_DEVICE_CONFIGS = [
  '.obsidian/plugins/obsidian-git/data.json',
  '.obsidian/plugins/claudian/data.json',
];

// Version compatibility via shared lib/version-range.js

/**
 * @param {object} opts
 * @param {string} opts.url - Git URL to clone
 * @param {string} [opts.target] - Destination path (default: Vaults/BasicVaults/<repo-name>)
 * @param {string} [opts.branch] - Git branch to check out
 * @param {boolean} [opts.dryRun] - Preview only (logs intended steps)
 * @param {boolean} [opts.skipCompatCheck] - Skip Core version compatibility check
 */
export async function installHub(opts) {
  if (!opts.url) {
    log.error('--url <git-url> is required.');
    process.exitCode = 1;
    return;
  }

  // Infer target if not given: Vaults/BasicVaults/<repo-name>
  let target;
  if (opts.target) {
    target = resolve(opts.target);
  } else {
    const cwd = process.cwd();
    const aimRoot = findAIMindVaultsRoot(cwd);
    if (!aimRoot) {
      log.error('AIMindVaults root not found. Use --target <path> to specify explicit destination.');
      process.exitCode = 1;
      return;
    }
    const repoName = opts.url.replace(/\.git$/, '').split(/[/\\]/).pop();
    target = join(aimRoot, 'Vaults', 'BasicVaults', repoName);
  }

  log.info('====================================================');
  log.info(' install-hub — Clone Hub from Git');
  log.info('====================================================');
  log.info(` URL     : ${opts.url}`);
  log.info(` Target  : ${target}`);
  if (opts.branch) log.info(` Branch  : ${opts.branch}`);
  if (opts.dryRun) log.info(' Mode    : DRY_RUN (no git clone)');
  log.info('----------------------------------------------------');

  if (existsSync(target)) {
    log.error(`Target already exists: ${target}`);
    log.error('Move or remove existing directory first.');
    process.exitCode = 1;
    return;
  }

  if (opts.dryRun) {
    log.info('\n--- Would execute ---');
    log.info(` git clone ${opts.branch ? `-b ${opts.branch} ` : ''}${opts.url} "${target}"`);
    log.info(` then validate .sync/hub-marker.json or .sync/.hub_marker`);
    log.info(` then strip per-device configs (.obsidian/plugins/*/data.json)`);
    log.info('\n[DRY_RUN] No changes written. Re-run without --dry-run to install.');
    log.envVar('INSTALL_HUB_RESULT', 'DRY_RUN');
    return;
  }

  // Step 1: git clone
  log.info('\n[1/4] git clone...');
  const cloneCmd = `git clone ${opts.branch ? `-b ${opts.branch} ` : ''}${JSON.stringify(opts.url)} ${JSON.stringify(target)}`;
  try {
    execSync(cloneCmd, { stdio: 'inherit' });
  } catch (err) {
    log.error(`git clone failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // Step 2: Validate it's a Hub
  log.info('\n[2/4] Validating Hub...');
  if (!isHub(target)) {
    log.error('Cloned repo is not a Hub (no .hub_marker or hub-marker.json in .sync/).');
    log.error(`Remove manually if desired: ${target}`);
    process.exitCode = 1;
    return;
  }
  const marker = readHubMarker(target);
  if (marker) {
    log.info(`  hubId         : ${marker.hubId}`);
    log.info(`  hubType       : ${marker.hubType}`);
    log.info(`  hubName       : ${marker.hubName || '(none)'}`);
    log.info(`  version       : ${marker.version || '(none)'}`);
    if (marker.coreHubVersion) log.info(`  coreHubVersion: ${marker.coreHubVersion}`);
  } else {
    log.warn('  Legacy marker only (.hub_marker) — no hub-marker.json metadata.');
  }

  // Step 3: Compatibility check (Preset Hub → Core Hub version)
  log.info('\n[3/4] Checking compatibility...');
  if (marker?.hubType === 'preset' && marker.coreHubVersion && !opts.skipCompatCheck) {
    const aimRoot = findAIMindVaultsRoot(target);
    if (aimRoot) {
      // Resolve local Core Hub
      const { scanHubs } = await import('../lib/hub-resolver.js');
      const hubs = scanHubs(aimRoot, target);
      const coreHub = hubs.find(h => {
        const m = readHubMarker(h);
        return m?.hubType === 'core';
      });
      if (!coreHub) {
        log.warn(`  No local Core Hub found — cannot verify coreHubVersion="${marker.coreHubVersion}"`);
      } else {
        const coreMarker = readHubMarker(coreHub);
        const check = checkVersionRange(coreMarker?.version, marker.coreHubVersion);
        if (check.ok) {
          log.info(`  Compatibility OK (local Core Hub ${coreMarker?.version} satisfies ${marker.coreHubVersion})`);
        } else {
          log.warn(`  Compatibility WARNING: ${check.reason}`);
          log.warn(`  You may need to update the local Core Hub or use --skip-compat-check.`);
        }
      }
    }
  } else if (marker?.hubType === 'core') {
    log.info('  Installed as Core Hub (no compatibility check needed).');
  } else {
    log.info('  No compatibility requirement declared.');
  }

  // Step 4: Strip per-device configs
  log.info('\n[4/4] Stripping per-device configs...');
  for (const rel of PER_DEVICE_CONFIGS) {
    const p = join(target, rel);
    if (existsSync(p)) {
      try {
        await unlink(p);
        log.info(`  - Removed: ${rel}`);
      } catch {}
    }
  }

  log.info('\n====================================================');
  log.info(' Hub Installed');
  log.info('====================================================');
  log.info(` Path  : ${target}`);
  if (marker) log.info(` hubId : ${marker.hubId}`);
  log.info(' Next  :');
  if (marker?.hubType === 'preset') {
    log.info('   - Bind satellites via .sync/hub-source.json or aimv rebase --hub <path>');
    log.info('   - Run core-sync-all from local Core Hub to refresh Core layer on this Preset');
  } else {
    log.info('   - Open Obsidian to register vault (or use aimv open)');
  }
  log.envVar('INSTALL_HUB_RESULT', 'OK');
  log.envVar('INSTALL_HUB_PATH', target);
  if (marker?.hubId) log.envVar('INSTALL_HUB_ID', marker.hubId);
  if (marker?.hubType) log.envVar('INSTALL_HUB_TYPE', marker.hubType);
}
