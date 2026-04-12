/**
 * master_index_build — Cross-vault master index aggregation.
 * Port of master_index_build.ps1 (200 LOC → ~140 LOC).
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import * as log from '../lib/logger.js';

/**
 * @param {object} opts
 * @param {string} [opts.aimindvaultsRoot]  AIMindVaults root path
 * @param {string} [opts.vaultName]         Partial update for a single vault
 */
export async function masterIndexBuild(opts = {}) {
  const start = Date.now();
  const root = opts.aimindvaultsRoot || detectAIMindVaultsRoot();
  if (!root) {
    log.error('AIMindVaults root not found');
    process.exitCode = 1;
    return;
  }

  const masterDataDir = join(root, '.vault_data');
  const masterIndexPath = join(masterDataDir, 'master_index.json');
  const vaultsDir = join(root, 'Vaults');

  if (!existsSync(masterDataDir)) {
    await mkdir(masterDataDir, { recursive: true });
  }

  // Load existing master index for partial update
  let masterVaults = {};
  let masterNotes = [];
  let masterTagIndex = {};
  const vaultName = opts.vaultName || '';

  if (vaultName && existsSync(masterIndexPath)) {
    try {
      const raw = await readFile(masterIndexPath, 'utf8');
      const existing = JSON.parse(raw);
      masterVaults = existing.vaults || {};
      masterNotes = (existing.notes || []).filter(n => n.vault_id !== vaultName);
      // Keep tags not belonging to this vault
      for (const [tag, entries] of Object.entries(existing.tag_index || {})) {
        masterTagIndex[tag] = entries.filter(e => !e.startsWith(`${vaultName}:`));
      }
    } catch {
      log.warn('Failed to load existing master index, doing full build');
      masterVaults = {};
      masterNotes = [];
      masterTagIndex = {};
    }
  }

  // Discover vault indices
  const vaultIndices = await findVaultIndices(vaultsDir, 3);
  let processedCount = 0;

  for (const { dir, indexPath } of vaultIndices) {
    const vName = dir.split(/[\\/]/).pop();

    // Partial update: only process specified vault
    if (vaultName && vName !== vaultName) continue;

    let vIndex;
    try {
      const raw = await readFile(indexPath, 'utf8');
      vIndex = JSON.parse(raw);
    } catch {
      log.warn(`Failed to read: ${indexPath}`);
      continue;
    }

    // vault field consistency check
    if (vIndex.vault !== vName) {
      log.warn(`vault mismatch: ${vName} has vault=${vIndex.vault} — skipping`);
      continue;
    }

    // Vault metadata
    const vaultTags = vIndex.tag_index ? Object.keys(vIndex.tag_index) : [];
    const relPath = relative(root, dir).split(sep).join('/');
    masterVaults[vName] = {
      path: relPath,
      note_count: vIndex.notes.length,
      domain_tags: vaultTags,
      built: vIndex.built,
    };

    // Aggregate notes (lightweight: title, tags, type, vault_id only)
    for (const note of vIndex.notes) {
      masterNotes.push({
        vault_id: vName,
        title: note.title,
        path: note.path,
        type: note.type,
        tags: Array.isArray(note.tags) ? note.tags : [],
      });
    }

    // Aggregate tag_index
    if (vIndex.tag_index) {
      for (const [tagName, notePaths] of Object.entries(vIndex.tag_index)) {
        if (!masterTagIndex[tagName]) masterTagIndex[tagName] = [];
        for (const notePath of notePaths) {
          masterTagIndex[tagName].push(`${vName}:${notePath}`);
        }
      }
    }

    processedCount++;
  }

  // concept_map: tags spanning 2+ vaults
  const conceptMap = {};
  for (const [tagName, entries] of Object.entries(masterTagIndex)) {
    const vaultIds = [...new Set(entries.map(e => e.split(':')[0]))].sort();
    if (vaultIds.length >= 2) {
      conceptMap[tagName] = { vaults: vaultIds, count: entries.length };
    }
  }

  // Write master index
  const masterIndex = {
    built: new Date().toISOString().slice(0, 19),
    vault_count: Object.keys(masterVaults).length,
    note_count: masterNotes.length,
    vaults: masterVaults,
    notes: masterNotes,
    tag_index: masterTagIndex,
    concept_map: conceptMap,
  };

  await writeFile(masterIndexPath, JSON.stringify(masterIndex, null, 2), 'utf8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const mode = vaultName ? `PARTIAL (${vaultName})` : 'FULL';
  log.summary('Master Index Build Complete', {
    Mode: mode,
    Vaults: Object.keys(masterVaults).length,
    Notes: masterNotes.length,
    Tags: Object.keys(masterTagIndex).length,
    Concepts: `${Object.keys(conceptMap).length} (cross-vault)`,
    Time: `${elapsed}s`,
    Output: masterIndexPath,
  });
}

/**
 * Detect AIMindVaults root by walking up from current file location.
 */
function detectAIMindVaultsRoot() {
  let dir = import.meta.url.replace('file:///', '').replace(/\//g, sep);
  dir = join(dir, '..'); // start from file's parent
  for (let i = 0; i < 10; i++) {
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
    if (existsSync(join(dir, 'Vaults'))) return dir;
  }
  return null;
}

/**
 * Recursively find vault directories that have .vault_data/vault_index.json.
 */
async function findVaultIndices(dir, maxDepth, depth = 0) {
  const results = [];
  if (depth > maxDepth || !existsSync(dir)) return results;

  const indexPath = join(dir, '.vault_data', 'vault_index.json');
  if (existsSync(indexPath)) {
    results.push({ dir, indexPath });
  }

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results.push(...await findVaultIndices(join(dir, entry.name), maxDepth, depth + 1));
      }
    }
  } catch { /* permission errors, etc. */ }

  return results;
}
