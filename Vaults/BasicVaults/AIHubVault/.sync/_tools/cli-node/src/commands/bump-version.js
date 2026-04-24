/**
 * bump-version — Bump _WORKSPACE_VERSION.md on Hub + optional broadcast.
 *
 * Required on Core Hub after any Core-layer edit. `--broadcast` triggers
 * `core-sync-all` in the same atomic step (D1 decision: push on edit event).
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHub, readHubMarker } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect Hub root (caller's Hub) from explicit option or script location.
 */
function detectHubRoot(explicit) {
  if (explicit) return resolve(explicit);
  return resolve(__dirname, '..', '..', '..', '..', '..');
}

/**
 * Generate next version: YYYYMMDDNNNN.
 * If today's latest exists, increment NNNN; else start at 0001.
 */
function nextVersion(latestVersion) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  if (latestVersion && latestVersion.startsWith(today)) {
    const seq = parseInt(latestVersion.slice(8), 10);
    return today + String(seq + 1).padStart(4, '0');
  }
  return today + '0001';
}

/**
 * Parse latest version from _WORKSPACE_VERSION.md (first table row with 12-digit).
 */
function parseLatestVersion(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^\|\s*(\d{12})\s*\|/m);
  return match ? match[1] : null;
}

/**
 * Insert a new row right after the header separator.
 */
function insertVersionRow(content, version, message) {
  const lines = content.split('\n');
  const headerSepIdx = lines.findIndex(l => /^\|\s*[-: ]+\s*\|/.test(l));
  if (headerSepIdx === -1) {
    throw new Error('Could not find version table header separator.');
  }
  const newRow = `| ${version} | ${message.replace(/\|/g, '\\|')} |`;
  lines.splice(headerSepIdx + 1, 0, newRow);

  // Update frontmatter `updated:` if present
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < lines.length && i < 30; i++) {
    if (/^updated:\s*/.test(lines[i])) {
      lines[i] = `updated: ${today}`;
      break;
    }
  }

  return lines.join('\n');
}

/**
 * @param {object} opts
 * @param {string} [opts.hubRoot] - Hub vault root (auto-detect)
 * @param {string} opts.message - Change description for the new row
 * @param {boolean} [opts.broadcast] - After bump, trigger core-sync-all
 * @param {boolean} [opts.dryRun]
 */
export async function bumpVersion(opts) {
  if (!opts.message) {
    log.error('--message is required (change description).');
    process.exitCode = 1;
    return;
  }

  const hubRoot = detectHubRoot(opts.hubRoot);
  if (!isHub(hubRoot)) {
    log.error(`Not a Hub: ${hubRoot}`);
    process.exitCode = 1;
    return;
  }

  const marker = readHubMarker(hubRoot);
  const hubType = marker?.hubType || 'core'; // legacy default
  const hubLabel = marker?.hubId || 'legacy';

  const verFile = join(hubRoot, '_WORKSPACE_VERSION.md');
  if (!existsSync(verFile)) {
    log.error(`_WORKSPACE_VERSION.md not found in Hub: ${verFile}`);
    process.exitCode = 1;
    return;
  }

  const latest = parseLatestVersion(verFile);
  const newVersion = nextVersion(latest);

  log.info('=== Bump Version ===');
  log.info(` Hub       : ${hubRoot} (hubType="${hubType}", hubId="${hubLabel}")`);
  log.info(` Previous  : ${latest || '(none)'}`);
  log.info(` New       : ${newVersion}`);
  log.info(` Message   : ${opts.message}`);
  if (opts.dryRun) log.info(' Mode      : DRY_RUN');
  log.info('');

  if (!opts.dryRun) {
    const content = readFileSync(verFile, 'utf8');
    const updated = insertVersionRow(content, newVersion, opts.message);
    await writeFile(verFile, updated, 'utf8');
    log.info(`Wrote _WORKSPACE_VERSION.md (${newVersion}).`);
  }

  log.envVar('BUMP_VERSION', newVersion);

  if (opts.broadcast) {
    if (hubType !== 'core') {
      log.warn(`--broadcast skipped: hubType="${hubType}" (only Core Hub broadcasts).`);
      return;
    }
    log.info('\n--- Broadcast (core-sync-all) ---');
    const { coreSyncAll } = await import('./core-sync-all.js');
    await coreSyncAll({ coreHubRoot: hubRoot, dryRun: opts.dryRun });
  }
}
