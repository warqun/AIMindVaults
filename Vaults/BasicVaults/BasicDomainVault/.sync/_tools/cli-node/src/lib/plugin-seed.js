/**
 * plugin-seed — Bootstrap missing plugin data.json from source Hub to target Hub.
 *
 * Used by:
 *   - core-sync-all: seeds Core plugin data.json on Presets that don't have it yet
 *     (e.g. Presets created before the plugin was added to CORE_PLUGINS).
 *   - create-hub:    ensures new Preset Hubs start with sane plugin defaults even
 *     when the Core Hub lacked the plugin at derivation time (future-proofing).
 *
 * Policy:
 *   - Only seeds when target data.json is **missing** (never overwrites existing).
 *   - For make-md: rewrites systemName to target vault basename so each Hub
 *     identifies itself correctly in the Spaces sidebar (rule: make-md
 *     systemName must match vault name — see rules-archive/vault-individualization.md).
 *
 * Intentionally conservative: data.json carries UI/state that is largely
 * per-vault, so we do not force-overwrite. Bootstrapping gives Preset Hubs
 * a coherent starting point without destroying user edits.
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

/**
 * Rewrite plugin data.json fields that must reflect the target vault identity.
 * Currently handles make-md systemName.
 *
 * @param {string} pluginName
 * @param {string} content - raw JSON text
 * @param {string} vaultName - target vault basename
 * @returns {string} rewritten content
 */
export function normalizePluginData(pluginName, content, vaultName) {
  if (pluginName === 'make-md') {
    return content.replace(/"systemName"\s*:\s*"[^"]*"/, `"systemName": "${vaultName}"`);
  }
  return content;
}

/**
 * Seed a single plugin's data.json from source Hub to target Hub if missing.
 *
 * @param {string} sourceHub - absolute path to source Hub (usually Core Hub)
 * @param {string} targetHub - absolute path to target Hub (Preset)
 * @param {string} pluginName
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun]
 * @returns {{seeded: boolean, reason?: string}}
 */
export async function seedPluginDataIfMissing(sourceHub, targetHub, pluginName, opts = {}) {
  const srcData = join(sourceHub, '.obsidian', 'plugins', pluginName, 'data.json');
  const tgtData = join(targetHub, '.obsidian', 'plugins', pluginName, 'data.json');

  if (!existsSync(srcData)) return { seeded: false, reason: 'source-missing' };
  if (existsSync(tgtData)) return { seeded: false, reason: 'already-exists' };

  if (opts.dryRun) return { seeded: true, reason: 'dry-run' };

  await mkdir(dirname(tgtData), { recursive: true });
  const raw = readFileSync(srcData, 'utf8');
  const vaultName = basename(targetHub);
  const content = normalizePluginData(pluginName, raw, vaultName);
  await writeFile(tgtData, content, 'utf8');
  return { seeded: true };
}

/**
 * Seed data.json for a list of plugins.
 *
 * @param {string} sourceHub
 * @param {string} targetHub
 * @param {string[]} pluginNames
 * @param {object} [opts]
 * @returns {{seeded: string[], skipped: Array<{plugin: string, reason: string}>}}
 */
export async function seedPluginDataBatch(sourceHub, targetHub, pluginNames, opts = {}) {
  const seeded = [];
  const skipped = [];
  for (const plugin of pluginNames) {
    const r = await seedPluginDataIfMissing(sourceHub, targetHub, plugin, opts);
    if (r.seeded) seeded.push(plugin);
    else skipped.push({ plugin, reason: r.reason });
  }
  return { seeded, skipped };
}
