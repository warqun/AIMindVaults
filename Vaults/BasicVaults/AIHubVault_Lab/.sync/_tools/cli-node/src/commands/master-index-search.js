/**
 * master_index_search — Cross-vault master index search.
 * Port of master_index_search.ps1 (175 LOC → ~130 LOC).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as log from '../lib/logger.js';

/**
 * @param {object} opts
 * @param {string} [opts.aimindvaultsRoot]
 * @param {string} [opts.query]
 * @param {string} [opts.tag]
 * @param {string} [opts.vault]         Filter by vault
 * @param {'table'|'compact'} [opts.format]
 * @param {number} [opts.top]
 * @param {boolean} [opts.conceptsOnly]  Show cross-vault concept map only
 */
export async function masterIndexSearch(opts = {}) {
  const root = opts.aimindvaultsRoot || detectAIMindVaultsRoot();
  if (!root) {
    log.error('AIMindVaults root not found');
    process.exitCode = 1;
    return;
  }

  const masterIndexPath = join(root, '.vault_data', 'master_index.json');

  // Auto-build if missing
  if (!existsSync(masterIndexPath)) {
    log.info('Master index not found, building...');
    try {
      const { masterIndexBuild } = await import('./master-index-build.js');
      await masterIndexBuild({ aimindvaultsRoot: root });
    } catch (e) {
      log.error(`master_index_build failed: ${e.message}`);
      process.exitCode = 1;
      return;
    }
  }

  if (!existsSync(masterIndexPath)) {
    log.error('Master index still not found after build attempt');
    process.exitCode = 1;
    return;
  }

  let master;
  try {
    const raw = await readFile(masterIndexPath, 'utf8');
    master = JSON.parse(raw);
  } catch (e) {
    log.error(`Failed to load master index: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const query = opts.query || '';
  const tag = opts.tag || '';
  const vault = opts.vault || '';
  const format = opts.format || 'table';
  const top = opts.top || 15;

  // ConceptsOnly mode
  if (opts.conceptsOnly) {
    const cm = master.concept_map || {};
    const entries = Object.entries(cm)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, top);

    if (entries.length === 0) {
      log.info('No cross-vault concepts found.');
      return;
    }

    log.info(`=== Cross-Vault Concepts (${top} max) ===`);
    log.info('');
    for (const [name, val] of entries) {
      log.info(`[${val.count}] ${name} -> ${val.vaults.join(', ')}`);
    }
    return;
  }

  // Filter
  let results = master.notes || [];

  if (vault) {
    results = results.filter(n => n.vault_id === vault);
  }

  if (tag) {
    results = results.filter(n => n.tags && n.tags.includes(tag));
  }

  // Keyword search with weighted scoring
  if (query) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = [];

    for (const note of results) {
      let score = 0;
      const titleLower = (note.title || '').toLowerCase();
      const tagString = (note.tags || []).join(' ').toLowerCase();

      for (const term of queryTerms) {
        if (titleLower.includes(term)) score += 10;
        if (tagString.includes(term)) score += 5;
      }

      if (score > 0) scored.push({ note, score });
    }

    scored.sort((a, b) => b.score - a.score);
    results = scored.slice(0, top).map(s => s.note);
  } else {
    results = results.slice(0, top);
  }

  if (results.length === 0) {
    log.info('No results found.');
    return;
  }

  // Vault summary header
  const vaultCounts = {};
  for (const n of results) {
    vaultCounts[n.vault_id] = (vaultCounts[n.vault_id] || 0) + 1;
  }
  const vaultSummary = Object.entries(vaultCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([v, c]) => `${v}:${c}`)
    .join(', ');

  log.info(`=== ${results.length} results across [${vaultSummary}] ===`);
  log.info('');

  if (format === 'compact') {
    for (const note of results) {
      const tagStr = (note.tags || []).slice(0, 3).join(',');
      log.info(`[${note.vault_id}] ${note.title} | ${note.type} | tags:${tagStr}`);
    }
  } else {
    for (const note of results) {
      const tagStr = (note.tags || []).slice(0, 5).join(', ');
      log.info(`[${note.vault_id}] ${note.title}`);
      log.info(`  type: ${note.type} | tags: ${tagStr}`);
      log.info(`  path: ${note.path}`);
      log.info('');
    }
  }
}

function detectAIMindVaultsRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  dir = join(dir, '..');
  for (let i = 0; i < 10; i++) {
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
    if (existsSync(join(dir, 'Vaults'))) return dir;
  }
  return null;
}
