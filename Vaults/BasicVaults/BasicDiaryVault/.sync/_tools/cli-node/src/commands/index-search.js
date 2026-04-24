/**
 * vault_index_search — JSON index based keyword/tag/type search.
 * Port of vault_index_search.ps1 (214 LOC → ~120 LOC).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { detectVaultRoot, getIndexPath } from '../lib/vault-path.js';
import * as log from '../lib/logger.js';

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 * @param {string} [opts.query]
 * @param {string} [opts.tag]
 * @param {string} [opts.type]
 * @param {'table'|'compact'} [opts.format]
 * @param {number} [opts.top]
 */
export async function indexSearch(opts = {}) {
  const vaultRoot = opts.vaultRoot || detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root auto-detect failed');
    process.exitCode = 1;
    return;
  }

  const indexPath = getIndexPath(vaultRoot);
  if (!existsSync(indexPath)) {
    log.error(`Index not found: ${indexPath}`);
    log.info('Run vault_index_build first.');
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(indexPath, 'utf8');
  const index = JSON.parse(raw);

  const vaultName = index.vault;
  const allNotes = index.notes;
  const tagIndex = index.tag_index || {};
  const query = opts.query || '';
  const tag = opts.tag || '';
  const type = opts.type || '';
  const format = opts.format || 'table';
  const top = opts.top || 10;

  // Pre-filter
  let filtered = allNotes;

  if (tag) {
    const tagPaths = tagIndex[tag] || [];
    if (tagPaths.length === 0) {
      log.info(`No notes found with tag: ${tag}`);
      return;
    }
    const pathSet = new Set(tagPaths);
    filtered = filtered.filter(n => pathSet.has(n.path));
  }

  if (type) {
    filtered = filtered.filter(n => n.type === type);
    if (filtered.length === 0) {
      log.info(`No notes found with type: ${type}`);
      return;
    }
  }

  // Scoring + sorting
  let results;

  if (query) {
    const keywords = query.split(/\s+/).filter(Boolean);
    const scored = [];
    for (const note of filtered) {
      const score = getNoteScore(note, keywords);
      if (score > 0) scored.push({ score, note });
    }
    scored.sort((a, b) => b.score - a.score);
    results = scored;
  } else {
    results = filtered.map(note => ({ score: -1, note }));
    results.sort((a, b) => (b.note.mtime || '').localeCompare(a.note.mtime || ''));
  }

  // Limit
  results = results.slice(0, top);

  if (results.length === 0) {
    log.info('No results found.');
    return;
  }

  // Output
  if (format === 'compact') {
    writeCompact(results);
  } else {
    writeTable(results, allNotes.length, filtered.length, vaultName, query, tag, type);
  }
}

function getNoteScore(note, keywords) {
  let score = 0;
  for (const q of keywords) {
    const ql = q.toLowerCase();
    if (note.title && note.title.toLowerCase().includes(ql)) score += 10;
    if (note.tags) {
      for (const t of note.tags) {
        const tl = t.toLowerCase();
        if (tl === ql) score += 8;
        else if (tl.includes(ql)) score += 4;
      }
    }
    if (note.headings) {
      for (const h of note.headings) {
        if (h.toLowerCase().includes(ql)) { score += 3; break; }
      }
    }
    if (note.summary && note.summary.toLowerCase().includes(ql)) score += 1;
  }
  return score;
}

function writeCompact(results) {
  for (const r of results) {
    const n = r.note;
    const scoreStr = r.score >= 0 ? `[${r.score}]` : '[-]';
    const tagsStr = n.tags ? n.tags.join(',') : '';
    log.info(`${scoreStr} ${n.title} | ${n.type} | tags:${tagsStr} | ${n.path}`);
    if (n.summary) log.info(`  ${n.summary}`);
    log.info('---');
  }
}

function writeTable(results, totalCount, filteredCount, vaultName, query, tag, type) {
  const queryStr = query ? `"${query}"` : '(none)';
  const filterParts = [];
  if (tag) filterParts.push(`tag=${tag}`);
  if (type) filterParts.push(`type=${type}`);
  const filterDisplay = filterParts.length ? ` | Filter: ${filterParts.join(', ')}` : '';

  log.info('');
  log.info(`Vault: ${vaultName} | Notes: ${totalCount} | Query: ${queryStr}${filterDisplay}`);
  log.info('='.repeat(70));

  const fmt = (s, t, ti, p) =>
    `${s.padStart(5)}  ${t.padEnd(10)}  ${ti.padEnd(35)}  ${p}`;

  log.info(fmt('Score', 'Type', 'Title', 'Path'));
  log.info(fmt('-----', '----', '-----', '----'));

  for (const r of results) {
    const n = r.note;
    const scoreStr = r.score >= 0 ? String(r.score) : '-';
    let titleTrunc = n.title || '';
    if (titleTrunc.length > 33) titleTrunc = titleTrunc.slice(0, 30) + '...';
    let typeTrunc = n.type || '';
    if (typeTrunc.length > 10) typeTrunc = typeTrunc.slice(0, 10);
    let pathTrunc = n.path || '';
    if (pathTrunc.length > 50) pathTrunc = '...' + pathTrunc.slice(-47);
    log.info(fmt(scoreStr, typeTrunc, titleTrunc, pathTrunc));
  }

  log.info('='.repeat(70));
  log.info(`${results.length} results (from ${filteredCount} filtered, ${totalCount} total)`);
}
