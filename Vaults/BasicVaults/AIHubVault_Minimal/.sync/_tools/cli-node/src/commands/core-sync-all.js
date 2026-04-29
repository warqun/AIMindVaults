/**
 * core-sync-all — Push Core layer from Core Hub to all Preset Hubs.
 *
 * Triggered on Core Hub edit events (via bump-version --broadcast or manually).
 * Only syncs CORE_PATHS (rules/core, _tools, _Standards/Core) and CORE_PLUGINS.
 * Custom layer paths are protected — never touched on target Preset Hubs.
 *
 * Propagation model: Push (ensures Preset Hubs are up-to-date BEFORE any
 * satellite sync, avoiding stale-Core race conditions).
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import {
  CORE_PATHS,
  CUSTOM_PATHS,
  CORE_PLUGINS,
  CORE_FORCE_DATA_JSON,
  SYNC_EXCLUDE_DIRS,
  SYNC_EXCLUDE_FILES,
} from '../lib/config.js';
import { seedPluginDataBatch } from '../lib/plugin-seed.js';
import {
  isHub,
  readHubMarker,
  findHubsByType,
  findAIMindVaultsRoot,
} from '../lib/hub-resolver.js';
import { checkVersionRange } from '../lib/version-range.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect Core Hub root from script location or CWD.
 */
function detectCoreHubRoot(explicitRoot) {
  if (explicitRoot) return resolve(explicitRoot);
  // cli-node is at {hub}/.sync/_tools/cli-node/src/commands/
  const candidate = resolve(__dirname, '..', '..', '..', '..', '..');
  return candidate;
}

/**
 * Sync a single Core path (dir or file) from Core Hub to a Preset Hub.
 * Treats path with trailing '/' as directory; without as file.
 *
 * @returns {{copied: number, deleted: number, skipped?: string}}
 */
async function syncCorePath(sourceHub, targetHub, relPath, opts) {
  const sourceAbs = join(sourceHub, relPath);
  const targetAbs = join(targetHub, relPath);

  if (!existsSync(sourceAbs)) {
    return { copied: 0, deleted: 0, skipped: `source missing: ${relPath}` };
  }

  const isDir = relPath.endsWith('/');
  if (isDir) {
    const result = await mirrorDirectory(sourceAbs, targetAbs, {
      excludeDirs: SYNC_EXCLUDE_DIRS,
      excludeFiles: SYNC_EXCLUDE_FILES,
      dryRun: opts.dryRun,
      log: (msg) => log.info(`    ${msg}`),
    });
    return { copied: result.copied, deleted: result.deleted };
  } else {
    // Single file — copy if differs
    const { copyFile } = await import('node:fs/promises');
    const { createHash } = await import('node:crypto');
    const srcHash = createHash('sha256').update(readFileSync(sourceAbs)).digest('hex');
    const tgtHash = existsSync(targetAbs)
      ? createHash('sha256').update(readFileSync(targetAbs)).digest('hex')
      : null;
    if (srcHash === tgtHash) return { copied: 0, deleted: 0 };
    if (!opts.dryRun) {
      await mkdir(dirname(targetAbs), { recursive: true });
      await copyFile(sourceAbs, targetAbs);
    }
    log.info(`    [${opts.dryRun ? 'DRY' : 'COPY'}] ${relPath}`);
    return { copied: 1, deleted: 0 };
  }
}

/**
 * Sync Core plugins (forced set) from Core Hub to Preset Hub.
 * Preserves Preset's own Custom plugins.
 */
async function syncCorePlugins(sourceHub, targetHub, opts) {
  const sourcePlugRoot = join(sourceHub, '.obsidian', 'plugins');
  const targetPlugRoot = join(targetHub, '.obsidian', 'plugins');
  if (!existsSync(sourcePlugRoot)) return { copied: 0 };

  let copied = 0;
  for (const plugin of CORE_PLUGINS) {
    const src = join(sourcePlugRoot, plugin);
    const tgt = join(targetPlugRoot, plugin);
    if (!existsSync(src)) continue;

    const result = await mirrorDirectory(src, tgt, {
      excludeFiles: CORE_FORCE_DATA_JSON.includes(plugin) ? [] : ['data.json'],
      dryRun: opts.dryRun,
      log: (msg) => log.info(`    ${msg}`),
    });
    copied += result.copied;
  }
  return { copied };
}

/**
 * Merge CORE_PLUGINS into Preset Hub's community-plugins.json.
 * Ensures Core plugins are always enabled (array-style list).
 * Preserves existing Custom plugins in their original order.
 *
 * Result shape: [...CORE_PLUGINS (in config order), ...existing Custom (preserved)]
 */
async function mergeCommunityPlugins(targetHub, opts) {
  const path = join(targetHub, '.obsidian', 'community-plugins.json');
  const writeIfNeeded = async (arr) => {
    if (!opts.dryRun) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(arr, null, 2) + '\n', 'utf8');
    }
  };

  if (!existsSync(path)) {
    await writeIfNeeded([...CORE_PLUGINS]);
    log.info(`    [${opts.dryRun ? 'DRY' : 'WRITE'}] community-plugins.json (new, ${CORE_PLUGINS.length} core)`);
    return { added: CORE_PLUGINS.length, created: true };
  }

  try {
    const raw = readFileSync(path, 'utf8');
    const current = JSON.parse(raw);
    if (!Array.isArray(current)) {
      log.warn(`    community-plugins.json not an array — skipped`);
      return { added: 0, skipped: 'not-array' };
    }
    const existingCustom = current.filter(p => !CORE_PLUGINS.includes(p));
    const merged = [...CORE_PLUGINS, ...existingCustom];
    // No-op if identical
    if (JSON.stringify(merged) === JSON.stringify(current)) {
      return { added: 0 };
    }
    const missing = CORE_PLUGINS.filter(p => !current.includes(p));
    await writeIfNeeded(merged);
    log.info(`    [${opts.dryRun ? 'DRY' : 'MERGE'}] community-plugins.json (+${missing.length} core${missing.length ? ': ' + missing.join(', ') : ''})`);
    return { added: missing.length };
  } catch (e) {
    log.warn(`    community-plugins.json parse error — skipped: ${e.message}`);
    return { added: 0, error: e.message };
  }
}

/**
 * Write warning flag to Preset Hub on partial failure.
 */
async function writeWarning(presetHub, message) {
  const warnPath = join(presetHub, '.sync', '.core-sync-warning.json');
  const payload = {
    timestamp: new Date().toISOString(),
    message,
  };
  try {
    await writeFile(warnPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  } catch {}
}

/**
 * Parse latest version from _WORKSPACE_VERSION.md (12-digit YYYYMMDDNNNN).
 */
function parseLatestVersion(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const m = readFileSync(filePath, 'utf8').match(/^\|\s*(\d{12})\s*\|/m);
    return m ? m[1] : null;
  } catch { return null; }
}

/**
 * Append propagation entry to _CORE_VERSION.md on Core Hub.
 * Creates the file if missing. Non-fatal on error.
 *
 * @param {string} coreHubRoot
 * @param {object} info - { version, targets, result, copied, failed, note }
 */
async function appendCoreVersionEntry(coreHubRoot, info) {
  const filePath = join(coreHubRoot, '_CORE_VERSION.md');
  const today = new Date().toISOString().slice(0, 10);

  const targetsStr = info.targets.map(t => t.hubId || '?').join(', ') || '(none)';
  const row = `| ${info.version} | ${targetsStr} | ${info.result} | ${info.copied} | ${info.failed} | ${info.note || ''} |`;

  if (!existsSync(filePath)) {
    // Create fresh
    const header = `---
type: version-log
tags:
  - CoreHub
  - Multi-Hub
  - CoreVersion
updated: ${today}
---

# Core Version Log

> Core 계층 변경이 Preset Hub 들에 **전파된 이력** (추적/감사 전용).
> **sync 판단에는 사용되지 않음** — sync 는 \`_WORKSPACE_VERSION.md\` 기준.
> \`core-sync-all\` 실행 시 자동 append.

| 버전 | 전파 대상 | 결과 | 아이템 | 실패 | 메모 |
| ---- | --------- | ---- | ------ | ---- | ---- |
${row}
`;
    try {
      await writeFile(filePath, header, 'utf8');
    } catch {}
    return;
  }

  // Append to existing: insert after table header separator
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const sepIdx = lines.findIndex(l => /^\|\s*[-:\s]+\s*\|\s*[-:\s]+\s*\|/.test(l));
    if (sepIdx === -1) {
      // Table header malformed — just append at end
      await writeFile(filePath, content.trimEnd() + '\n' + row + '\n', 'utf8');
      return;
    }
    lines.splice(sepIdx + 1, 0, row);
    // Update frontmatter `updated:` if present
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (/^updated:\s*/.test(lines[i])) {
        lines[i] = `updated: ${today}`;
        break;
      }
    }
    // Remove placeholder "(엔트리 없음 ...)" row if present
    const placeholderIdx = lines.findIndex(l => l.includes('(엔트리 없음'));
    if (placeholderIdx > -1) lines.splice(placeholderIdx, 1);

    await writeFile(filePath, lines.join('\n'), 'utf8');
  } catch {}
}

/**
 * @param {object} opts
 * @param {string} [opts.coreHubRoot] - Core Hub root (auto-detect)
 * @param {string} [opts.target] - Specific Preset Hub to target (default: all)
 * @param {boolean} [opts.dryRun]
 */
export async function coreSyncAll(opts = {}) {
  const coreHubRoot = detectCoreHubRoot(opts.coreHubRoot);

  if (!isHub(coreHubRoot)) {
    log.error(`Not a Hub: ${coreHubRoot}`);
    process.exitCode = 1;
    return;
  }

  const marker = readHubMarker(coreHubRoot);
  if (marker && marker.hubType !== 'core') {
    log.error(`Source Hub is not a Core Hub (hubType="${marker.hubType}"). core-sync-all only runs from Core Hub.`);
    process.exitCode = 1;
    return;
  }
  // Backward compat: AIHubVault without hub-marker.json is treated as core
  if (!marker) {
    log.info(`[core-sync-all] Source has no hub-marker.json — treating as legacy Core Hub.`);
  }

  // Find target Preset Hubs
  const aimRoot = findAIMindVaultsRoot(coreHubRoot);
  if (!aimRoot) {
    log.error('AIMindVaults root not found.');
    process.exitCode = 1;
    return;
  }

  let targets;
  if (opts.target) {
    const t = resolve(opts.target);
    if (!isHub(t)) {
      log.error(`Target is not a Hub: ${t}`);
      process.exitCode = 1;
      return;
    }
    targets = [t];
  } else {
    targets = findHubsByType(aimRoot, 'preset');
  }

  log.info('====================================================');
  log.info(' Core-Sync-All (Core Hub → Preset Hubs · Push)');
  log.info('====================================================');
  log.info(` Core Hub : ${coreHubRoot}`);
  log.info(` Targets  : ${targets.length} Preset Hub(s)`);
  if (opts.dryRun) log.info(' Mode     : DRY_RUN');
  log.info('----------------------------------------------------');

  if (targets.length === 0) {
    log.info('\nNo Preset Hubs found. Nothing to propagate.');
    log.envVar('CORE_SYNC_RESULT', 'NO_TARGETS');
    return;
  }

  let totalCopied = 0;
  let totalFailed = 0;

  // Local Core Hub version (for coreHubVersion compat check)
  const coreVersion = marker?.version;

  for (const preset of targets) {
    const presetMarker = readHubMarker(preset);
    const presetLabel = presetMarker?.hubId || preset.split(/[/\\]/).pop();
    log.info(`\n--- Preset Hub: ${presetLabel} (${preset}) ---`);

    // Compatibility check: Preset's coreHubVersion vs local Core Hub version
    if (presetMarker?.coreHubVersion && coreVersion) {
      const check = checkVersionRange(coreVersion, presetMarker.coreHubVersion);
      if (!check.ok) {
        log.warn(`  SKIPPED — coreHubVersion mismatch: ${check.reason}`);
        log.warn(`  Use --force to override, or update this Preset Hub's coreHubVersion.`);
        if (!opts.force) {
          totalFailed++;
          continue;
        }
        log.info('  --force specified, proceeding despite mismatch.');
      }
    }

    let presetCopied = 0;
    let presetFailed = false;

    try {
      // Safety: never touch CUSTOM_PATHS on the target
      // (mirrorDirectory with explicit CORE_PATHS only — CUSTOM paths are untouched)
      for (const corePath of CORE_PATHS) {
        log.info(`  [Core] ${corePath}`);
        const r = await syncCorePath(coreHubRoot, preset, corePath, { dryRun: opts.dryRun });
        if (r.skipped) log.warn(`    SKIPPED: ${r.skipped}`);
        presetCopied += r.copied;
      }

      // Core plugins
      log.info(`  [Core Plugins] ${CORE_PLUGINS.join(', ')}`);
      const pluginResult = await syncCorePlugins(coreHubRoot, preset, { dryRun: opts.dryRun });
      presetCopied += pluginResult.copied;

      // Merge CORE_PLUGINS into community-plugins.json (activation list)
      log.info(`  [Community-Plugins Merge]`);
      const mergeResult = await mergeCommunityPlugins(preset, { dryRun: opts.dryRun });
      if (mergeResult.added > 0 || mergeResult.created) presetCopied += 1;

      // Seed data.json for Core plugins that target lacks (bootstrap once)
      log.info(`  [Plugin Data Seed]`);
      const seedResult = await seedPluginDataBatch(coreHubRoot, preset, CORE_PLUGINS, { dryRun: opts.dryRun });
      for (const p of seedResult.seeded) {
        log.info(`    [${opts.dryRun ? 'DRY' : 'SEED'}] ${p}/data.json`);
      }
      presetCopied += seedResult.seeded.length;

      log.info(`  → ${presetCopied} item(s) ${opts.dryRun ? 'would be synced' : 'synced'}`);
    } catch (err) {
      log.error(`  FAILED: ${err.message}`);
      presetFailed = true;
      if (!opts.dryRun) await writeWarning(preset, err.message);
    }

    if (presetFailed) totalFailed++;
    else totalCopied += presetCopied;
  }

  log.info('\n====================================================');
  log.info(` Complete — ${totalCopied} item(s) across ${targets.length - totalFailed}/${targets.length} Preset Hub(s)`);
  if (totalFailed > 0) log.warn(` ${totalFailed} Preset Hub(s) failed — check .sync/.core-sync-warning.json`);
  log.info('====================================================');
  const result = totalFailed === 0 ? 'OK' : 'PARTIAL';
  log.envVar('CORE_SYNC_RESULT', result);
  log.envVar('CORE_SYNC_COPIED', String(totalCopied));
  log.envVar('CORE_SYNC_FAILED', String(totalFailed));

  // Append propagation entry to _CORE_VERSION.md (skip on dry-run)
  if (!opts.dryRun) {
    const version = parseLatestVersion(join(coreHubRoot, '_WORKSPACE_VERSION.md')) || 'unknown';
    const targetInfo = targets.map(t => ({ hubId: readHubMarker(t)?.hubId }));
    await appendCoreVersionEntry(coreHubRoot, {
      version,
      targets: targetInfo,
      result,
      copied: totalCopied,
      failed: totalFailed,
      note: opts.note || '',
    });
  }
}
