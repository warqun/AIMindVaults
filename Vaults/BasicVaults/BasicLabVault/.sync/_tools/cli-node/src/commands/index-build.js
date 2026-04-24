/**
 * vault_index_build — Contents/ crawling → JSON index.
 * Port of vault_index_build.ps1 (390 LOC → ~180 LOC).
 */

import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, relative, sep, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { detectVaultRoot, getVaultName, getDataDir, getIndexPath, toRelativePath } from '../lib/vault-path.js';
import { parseFrontmatterLight } from '../lib/frontmatter.js';
import { EXCLUDE_FILES, EXCLUDE_TYPES, MAX_SUMMARY_LENGTH, HASH_ALGORITHM, HASH_PREFIX_LENGTH } from '../lib/config.js';
import * as log from '../lib/logger.js';

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 * @param {boolean} [opts.incremental]
 * @param {boolean} [opts.verbose]
 */
export async function indexBuild(opts = {}) {
  const start = Date.now();
  const vaultRoot = opts.vaultRoot || detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root auto-detect failed');
    process.exitCode = 1;
    return;
  }

  const contentsDir = join(vaultRoot, 'Contents');
  if (!existsSync(contentsDir)) {
    log.error(`Contents/ folder not found: ${contentsDir}`);
    process.exitCode = 1;
    return;
  }

  const vaultName = getVaultName(vaultRoot);
  const dataDir = getDataDir(vaultRoot);
  const indexPath = getIndexPath(vaultRoot);

  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  // Load existing index for incremental
  const existing = new Map();
  if (opts.incremental && existsSync(indexPath)) {
    try {
      const raw = await readFile(indexPath, 'utf8');
      const prev = JSON.parse(raw);
      for (const n of prev.notes) existing.set(n.path, n);
    } catch {
      log.warn('Failed to load existing index, doing full build');
    }
  }

  // Crawl .md files
  const mdFiles = await walkMd(contentsDir);
  const notes = [];
  const stats = { new: 0, updated: 0, skipped: 0, excluded: 0 };

  for (const filePath of mdFiles) {
    const relPath = toRelativePath(vaultRoot, filePath);
    const fileName = basename(filePath);
    const fileStat = await stat(filePath);
    const mtime = fileStat.mtime.toISOString().slice(0, 19);

    // Incremental: mtime check
    if (opts.incremental && existing.has(relPath)) {
      const ex = existing.get(relPath);
      if (ex.mtime === mtime) {
        notes.push(ex);
        stats.skipped++;
        continue;
      }
    }

    // Read + hash
    let content, hash;
    try {
      content = await readFile(filePath, 'utf8');
      const full = createHash(HASH_ALGORITHM).update(content).digest('hex');
      hash = full.slice(0, HASH_PREFIX_LENGTH);
    } catch {
      log.warn(`Failed to read: ${relPath}`);
      continue;
    }

    // Incremental: hash check (mtime differs but content same)
    if (opts.incremental && existing.has(relPath)) {
      const ex = existing.get(relPath);
      if (ex.hash === hash) {
        ex.mtime = mtime;
        notes.push(ex);
        stats.skipped++;
        continue;
      }
    }

    // Exclude check
    const fm = parseFrontmatterLight(content);
    const noteType = fm.type || '';
    if (shouldExclude(fileName, noteType)) {
      stats.excluded++;
      if (opts.verbose) log.info(`[SKIP] Excluded: ${relPath} (${noteType})`);
      continue;
    }

    // Build note object
    const note = buildNoteObject(relPath, content, fm, hash, mtime);
    notes.push(note);

    if (existing.has(relPath)) {
      stats.updated++;
      if (opts.verbose) log.info(`[UPDATE] ${relPath}`);
    } else {
      stats.new++;
      if (opts.verbose) log.info(`[NEW] ${relPath}`);
    }
  }

  // links_from reverse tracking
  const linkMap = new Map();
  for (const note of notes) {
    const fn = fileNameFromPath(note.path);
    linkMap.set(fn, note);
  }
  for (const note of notes) {
    for (const link of note.links_to) {
      const target = linkMap.get(link);
      if (target) {
        const srcName = fileNameFromPath(note.path);
        if (!target.links_from.includes(srcName)) {
          target.links_from.push(srcName);
        }
      }
    }
  }

  // tag_index
  const tagIndex = {};
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagIndex[tag]) tagIndex[tag] = [];
      tagIndex[tag].push(note.path);
    }
  }

  // link_graph
  const linkGraph = {};
  for (const note of notes) {
    linkGraph[fileNameFromPath(note.path)] = note.links_to;
  }

  // Write index
  const index = {
    vault: vaultName,
    built: new Date().toISOString().slice(0, 19),
    notes,
    tag_index: tagIndex,
    link_graph: linkGraph,
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

  // Summary
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  log.summary('Vault Index Build Complete', {
    Vault: vaultName,
    Notes: notes.length,
    New: stats.new,
    Updated: stats.updated,
    Skipped: stats.skipped,
    Excluded: stats.excluded,
    Tags: Object.keys(tagIndex).length,
    Time: `${elapsed}s`,
    Output: indexPath,
  });

  // Master index partial update
  try {
    const { masterIndexBuild } = await import('./master-index-build.js');
    await masterIndexBuild({ vaultName });
    log.info(` Master   : partial update (${vaultName})`);
  } catch {
    // master builder may not exist yet
  }
}

function shouldExclude(fileName, noteType) {
  if (EXCLUDE_FILES.includes(fileName)) return true;
  if (EXCLUDE_TYPES.includes(noteType)) return true;
  return false;
}

function buildNoteObject(relPath, content, fm, hash, mtime) {
  const lines = content.split('\n');

  // Title: first H1
  let title = '';
  for (const l of lines) {
    const m = l.trim().match(/^#\s+(.+)$/);
    if (m) { title = m[1].trim(); break; }
  }

  // Headings: H2/H3
  const headings = [];
  for (const l of lines) {
    const m = l.trim().match(/^#{2,3}\s+(.+)$/);
    if (m) headings.push(m[1].trim());
  }

  // Summary: first text paragraph after H1 (skip code blocks, juggl)
  let summary = '';
  let foundH1 = false;
  let inCode = false;
  for (const l of lines) {
    const trimmed = l.trim();
    if (!foundH1) {
      if (/^#\s+/.test(trimmed)) foundH1 = true;
      continue;
    }
    if (/^```/.test(trimmed)) { inCode = !inCode; continue; }
    if (inCode || !trimmed) continue;
    summary = trimmed.length > MAX_SUMMARY_LENGTH
      ? trimmed.slice(0, MAX_SUMMARY_LENGTH) + '...'
      : trimmed;
    break;
  }

  // WikiLinks
  const linksTo = [];
  const linkRe = /\[\[([^\]|]+)/g;
  let lm;
  while ((lm = linkRe.exec(content))) {
    const target = lm[1].trim();
    if (target && !linksTo.includes(target)) linksTo.push(target);
  }

  return {
    path: relPath,
    title,
    type: fm.type || '',
    tags: Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [],
    headings,
    summary,
    links_to: linksTo,
    links_from: [],
    mtime,
    hash,
  };
}

function fileNameFromPath(p) {
  const parts = p.split('/');
  const last = parts[parts.length - 1];
  return last.replace(/\.md$/, '');
}

async function walkMd(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkMd(full));
    } else if (extname(entry.name) === '.md') {
      results.push(full);
    }
  }
  return results;
}
