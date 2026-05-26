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
    // R137 — Contents/ 부재 vault (CoreHub · AIHubVault_Minimal · AIHubVault_{Domain,Lab,Project,Diary})
    // 는 인프라성 Hub 라 콘텐츠 인덱싱 대상이 아님. ERROR 가 아닌 INFO 로 강등 + success exit.
    // sync-all 의 자동 인덱싱이 모든 vault 시도해도 fail 로 카운트되지 않게.
    log.info(`Contents/ folder absent (infra Hub): ${vaultRoot} — skipping vault_index build`);
    log.envVar('POST_EDIT_INDEX_SKIPPED', '1');
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
    const fsMtime = fileStat.mtime.toISOString().slice(0, 19);
    const birthtime = fileStat.birthtime.toISOString().slice(0, 19);

    // Incremental fast-path: fs.mtime 변경 안 됐으면 content 변경 가능성 0 → skip.
    // legacy entry (ex.fsMtime 부재) 는 ex.mtime 으로 비교 (backward compat).
    if (opts.incremental && existing.has(relPath)) {
      const ex = existing.get(relPath);
      const exFsMtime = ex.fsMtime || ex.mtime;
      if (exFsMtime === fsMtime) {
        if (!ex.created) ex.created = birthtime;
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

    // Incremental: hash check (fs.mtime 변경됐지만 content 동일 — git pull 시각 리셋 케이스)
    if (opts.incremental && existing.has(relPath)) {
      const ex = existing.get(relPath);
      if (ex.hash === hash) {
        ex.fsMtime = fsMtime;
        if (!ex.created) ex.created = birthtime;
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

    // R136 Gap 1 fix — mtime 결정: frontmatter.updated 우선, fs.stat.mtime fallback.
    // git pull 이 fs.mtime 을 pull 시각으로 리셋해도 사용자가 명시한 frontmatter.updated 가 보존됨.
    const fmUpdated = normalizeCreatedField(fm.updated);
    const mtime = fmUpdated || fsMtime;

    // Build note object
    const note = buildNoteObject(relPath, content, fm, hash, mtime, birthtime);
    note.fsMtime = fsMtime;  // incremental schema 확장 (다음 fast-path 비교용)
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

/**
 * Normalize a frontmatter `created` value into the same ISO format as mtime/birthtime
 * (`YYYY-MM-DDTHH:MM:SS`). Returns null when unparseable so caller can fall back to birthtime.
 */
function normalizeCreatedField(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s) return null;
  // Already full ISO datetime (with T)
  const isoT = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/);
  if (isoT) {
    const time = isoT[2].length === 5 ? `${isoT[2]}:00` : isoT[2];
    return `${isoT[1]}T${time}`;
  }
  // Space-separated date+time
  const dt = s.match(/^(\d{4}-\d{2}-\d{2})[ \t]+(\d{2}:\d{2}(?::\d{2})?)/);
  if (dt) {
    const time = dt[2].length === 5 ? `${dt[2]}:00` : dt[2];
    return `${dt[1]}T${time}`;
  }
  // Date only
  const d = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (d) return `${d[1]}T00:00:00`;
  return null;
}

function buildNoteObject(relPath, content, fm, hash, mtime, birthtime) {
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

  const fmCreated = normalizeCreatedField(fm.created);
  const created = fmCreated || birthtime;

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
    created,
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
