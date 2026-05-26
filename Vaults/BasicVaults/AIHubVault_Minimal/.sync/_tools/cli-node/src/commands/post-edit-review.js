/**
 * post_note_edit_review — UTF-8 validation + auto index build.
 * Port of post_note_edit_review.ps1 (~110 LOC → ~90 LOC).
 *
 * Checks all .md files under scope for:
 *   1. Strict UTF-8 validity (fatal decode)
 *   2. U+FFFD replacement character count
 *
 * On pass, automatically triggers incremental index build.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectVaultRoot } from '../lib/vault-path.js';
import { parseFrontmatterLight } from '../lib/frontmatter.js';
import { normalizeTag, parseTagAliases, defaultTagAliasesPath } from './tag-migrate.js';
import * as log from '../lib/logger.js';

const SCOPE_CANDIDATES = ['Contents', 'Project', 'docs'];
const REPLACEMENT_CHAR = '\uFFFD';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// note-types.yaml \uC815\uBCF8 \uC704\uCE58 \u2014 \uC790\uAE30 \uC704\uCE58 \uAE30\uBC18 (\uD658\uACBD \uB3C5\uB9BD\uC131 \u00A7 3 A4)
function defaultNoteTypesPath() {
  return join(__dirname, '..', '..', 'data', 'note-types.yaml');
}

// note-types.yaml \uBBF8\uB2C8 \uD30C\uC11C \u2014 types \uC139\uC158\uC758 type \uC774\uB984 + aliases \uC139\uC158\uB9CC \uCD94\uCD9C.
// description/category \uB4F1 nested \uB0B4\uC6A9\uC740 \uAC80\uC99D\uC5D0 \uBD88\uD544\uC694\uD574 \uBB34\uC2DC.
function loadNoteTypes(filePath) {
  if (!existsSync(filePath)) return { types: new Set(), aliases: {} };
  const text = readFileSync(filePath, 'utf8');
  const types = new Set();
  const aliases = {};
  const lines = text.split(/\r?\n/);
  let section = null;
  let typeIndent = -1;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const stripped = line.trim();

    if (indent === 0) {
      if (stripped === 'types:') { section = 'types'; typeIndent = -1; continue; }
      if (stripped === 'aliases:') { section = 'aliases'; continue; }
      if (stripped.endsWith(':')) { section = null; continue; }
    }

    if (section === 'types') {
      // \uCCAB nested level (\uBCF4\uD1B5 indent 2) \uC758 `name:` \uB9CC type \uC774\uB984\uC73C\uB85C \uCD94\uCD9C
      if (typeIndent < 0 && indent > 0) typeIndent = indent;
      if (indent === typeIndent) {
        const m = stripped.match(/^([a-z][a-z0-9-]*)\s*:\s*$/);
        if (m) types.add(m[1]);
      }
    } else if (section === 'aliases') {
      const m = stripped.match(/^([\w-]+)\s*:\s*([\w-]+)\s*$/);
      if (m) aliases[m[1]] = m[2];
    }
  }
  return { types, aliases };
}

// \uBCF8\uBB38\uC5D0\uC11C \uC704\uD0A4\uB9C1\uD06C [[...]] \uCE74\uC6B4\uD2B8
function countWikilinks(body) {
  const m = body.match(/\[\[[^\]]+\]\]/g);
  return m ? m.length : 0;
}

// \uBCF8\uBB38\uC5D0\uC11C H1 (# title) \uCD94\uCD9C (\uCCAB \uBC88\uC9F8)
function extractH1(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * Detect scope folder within vault root.
 * @param {string} vaultRoot
 * @returns {string|null} scope name (e.g. 'Contents')
 */
function detectScope(vaultRoot) {
  for (const name of SCOPE_CANDIDATES) {
    if (existsSync(join(vaultRoot, name))) return name;
  }
  return null;
}

/**
 * Recursively collect all .md files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectMdFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Check a single file for UTF-8 validity and U+FFFD chars.
 * @param {string} filePath
 * @returns {Promise<{path: string, utf8Valid: boolean, replacementCount: number}|null>}
 */
async function checkFile(filePath, tagOpts, typeOpts) {
  const buf = await readFile(filePath);

  // Strict UTF-8 decode — throws on invalid sequences
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let utf8Valid = true;
  let text = '';
  try {
    text = decoder.decode(buf);
  } catch {
    utf8Valid = false;
  }

  // Count U+FFFD replacement characters (only if valid UTF-8)
  let replacementCount = 0;
  if (utf8Valid) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === REPLACEMENT_CHAR) replacementCount++;
    }
  }

  // Tag normalization check (5-12 R114 — frontmatter tags PascalCase 위반 검출)
  // tagOpts 미전달 시 검증 스킵 (호환성 유지)
  const tagViolations = [];
  if (utf8Valid && tagOpts) {
    try {
      const fm = parseFrontmatterLight(text);
      const tags = fm?.tags;
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (typeof t !== 'string') continue;
          const r = normalizeTag(t, tagOpts);
          if (r.result !== null && r.result !== t) {
            tagViolations.push({ tag: t, normalized: r.result, rule: r.rule });
          }
          if (r.result === null && r.rule === 'remove') {
            tagViolations.push({ tag: t, normalized: null, rule: 'meta-tag-removed' });
          }
        }
      }
    } catch (e) {
      // frontmatter parse 실패 시 검증 스킵
    }
  }

  // Frontmatter 검증 (R119 노트 작성 플로우 정교화 결정 4 D — 항목별 단계)
  // BAD: frontmatter 자체 없음, type 필드 없음 → 즉시 차단
  // WARN: type 코어 위반, created 누락, tags 5-12 위반, 위키링크 0, H1 없음 → 정보 (1개월 후 BAD 격상 예정)
  const fmIssues = { bad: [], warn: [] };
  if (utf8Valid && typeOpts) {
    if (!/^---\s*\n/.test(text)) {
      fmIssues.bad.push({ rule: 'no-frontmatter' });
    } else {
      let fm = {};
      try { fm = parseFrontmatterLight(text); } catch { /* parse fail = bad */ }
      // type 필드
      if (!fm.type) {
        fmIssues.bad.push({ rule: 'no-type' });
      } else {
        const typeName = String(fm.type).trim();
        const isCore = typeOpts.types.has(typeName);
        const aliasTo = typeOpts.aliases[typeName];
        if (aliasTo) {
          fmIssues.warn.push({ rule: 'type-alias', value: typeName, suggest: aliasTo });
        } else if (!isCore) {
          fmIssues.warn.push({ rule: 'type-not-core', value: typeName });
        }
      }
      // created (R116 viz 의존)
      if (!fm.created) fmIssues.warn.push({ rule: 'no-created' });
      // tags 5-12
      if (fm.tags == null) {
        fmIssues.warn.push({ rule: 'no-tags' });
      } else if (Array.isArray(fm.tags)) {
        const len = fm.tags.length;
        if (len < 5) fmIssues.warn.push({ rule: 'tags-too-few', value: len });
        else if (len > 12) fmIssues.warn.push({ rule: 'tags-too-many', value: len });
      }
      // 본문 검증 (위키링크, H1)
      const body = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
      if (countWikilinks(body) === 0) fmIssues.warn.push({ rule: 'no-wikilink' });
      if (!extractH1(body)) fmIssues.warn.push({ rule: 'no-h1' });
    }
  }

  const hasAny = !utf8Valid || replacementCount > 0 || tagViolations.length > 0
              || fmIssues.bad.length > 0 || fmIssues.warn.length > 0;
  if (hasAny) {
    return { path: filePath, utf8Valid, replacementCount, tagViolations, fmIssues };
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 * @param {string} [opts.scope]
 * @param {boolean} [opts.verbose]
 */
export async function postEditReview(opts = {}) {
  // 1. Resolve vault root
  const vaultRoot = opts.vaultRoot || detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root auto-detect failed');
    process.exitCode = 1;
    return;
  }

  // 2. Resolve scope
  const scopeName = opts.scope || detectScope(vaultRoot);
  if (!scopeName) {
    log.error(`Content folder not found under ${vaultRoot} (Contents/, Project/, docs/)`);
    process.exitCode = 1;
    return;
  }

  const target = join(vaultRoot, scopeName);
  if (!existsSync(target)) {
    log.error(`Scope path not found: ${target}`);
    process.exitCode = 1;
    return;
  }

  // 3. Load tag normalization context (5-12 R111 — PascalCase 검증)
  let tagOpts = null;
  try {
    const aliasesPath = defaultTagAliasesPath();
    if (existsSync(aliasesPath)) {
      const { aliases, removeSet } = await parseTagAliases(aliasesPath);
      // vault_id 동적 추론 — vault 루트의 폴더명 + 같은 부모 디렉토리의 vault 들 자동 발견 (--root 5단계 상승)
      // 가벼운 추론: 현재 vault 의 basename + 같은 Vaults/ 안 의 폴더들
      const vaultIds = new Set([basename(vaultRoot)]);
      try {
        const aimvRoot = dirname(dirname(vaultRoot)); // Vaults/<category>/<vault> → AIMindVaults root 추정
        const vaultsDir = join(aimvRoot, 'Vaults');
        if (existsSync(vaultsDir)) {
          const cats = await readdir(vaultsDir, { withFileTypes: true });
          for (const cat of cats) {
            if (!cat.isDirectory()) continue;
            const catPath = join(vaultsDir, cat.name);
            const vaults = await readdir(catPath, { withFileTypes: true });
            for (const v of vaults) {
              if (v.isDirectory()) vaultIds.add(v.name);
            }
          }
        }
      } catch { /* vault_id 추론 실패 시 현재 vault 만 */ }
      tagOpts = { aliases, removeSet, vaultIds };
    }
  } catch (e) {
    // tag-aliases.yaml load 실패 시 검증 스킵 (환경 독립성)
  }

  // 3-b. Load note-types.yaml (R119 결정 1 — type 정본 + alias)
  let typeOpts = null;
  try {
    const typesPath = defaultNoteTypesPath();
    if (existsSync(typesPath)) typeOpts = loadNoteTypes(typesPath);
  } catch (e) { /* note-types.yaml 부재 시 frontmatter 검증 스킵 */ }

  // 4. Collect and validate files
  const files = await collectMdFiles(target);
  const issues = [];
  for (const f of files) {
    const result = await checkFile(f, tagOpts, typeOpts);
    if (result) issues.push(result);
  }

  // BAD = 즉시 차단 항목 (utf8 fail / fffd / tagViolation / fmIssues.bad)
  // WARN = 정보용 (fmIssues.warn) — 1개월 후 BAD 격상 예정
  const isBad = (i) => !i.utf8Valid || i.replacementCount > 0
                    || (i.tagViolations?.length || 0) > 0
                    || (i.fmIssues?.bad?.length || 0) > 0;
  const bad = issues.filter(isBad);
  const warn = issues.filter((i) => !isBad(i) && (i.fmIssues?.warn?.length || 0) > 0);

  // 5. Output results (envVar format for Shell Commands compatibility)
  log.envVar('POST_EDIT_REVIEW_SCOPE', target);
  log.envVar('POST_EDIT_REVIEW_FILES', files.length);
  log.envVar('POST_EDIT_REVIEW_BAD', bad.length);
  log.envVar('POST_EDIT_REVIEW_WARN', warn.length);

  const tagViolationCount = issues.reduce((s, b) => s + (b.tagViolations?.length || 0), 0);
  if (tagOpts) log.envVar('POST_EDIT_REVIEW_TAG_VIOLATIONS', tagViolationCount);

  const fmWarnCount = issues.reduce((s, b) => s + (b.fmIssues?.warn?.length || 0), 0);
  if (typeOpts) log.envVar('POST_EDIT_REVIEW_FM_WARN', fmWarnCount);

  if (bad.length > 0) {
    log.info('');
    log.info('Bad files (즉시 차단):');
    for (const b of bad.sort((a, c) => a.path.localeCompare(c.path))) {
      const rel = relative(vaultRoot, b.path).split(sep).join('/');
      const parts = [`utf8=${b.utf8Valid}`, `fffd=${b.replacementCount}`];
      if (b.tagViolations?.length) parts.push(`tagViolations=${b.tagViolations.length}`);
      if (b.fmIssues?.bad?.length) parts.push(`fmBad=${b.fmIssues.bad.map(x => x.rule).join(',')}`);
      log.info(`  ${rel}  ${parts.join('  ')}`);
    }
    process.exitCode = 2;
    return;
  }

  if (warn.length > 0) {
    log.info('');
    log.info(`WARN files (정보용, 1개월 후 BAD 격상): ${warn.length}`);
    for (const w of warn.slice(0, 10).sort((a, c) => a.path.localeCompare(c.path))) {
      const rel = relative(vaultRoot, w.path).split(sep).join('/');
      const rules = w.fmIssues.warn.map(x => x.rule + (x.value ? `(${x.value})` : '')).join(',');
      log.info(`  ${rel}  ${rules}`);
    }
    if (warn.length > 10) log.info(`  ... +${warn.length - 10} more`);
  }

  log.envVar('POST_EDIT_REVIEW_OK', 1);

  // 5. Auto-trigger incremental index build
  try {
    const { indexBuild } = await import('./index-build.js');
    await indexBuild({ vaultRoot, incremental: true, verbose: opts.verbose });

    const { getIndexPath } = await import('../lib/vault-path.js');
    const indexPath = getIndexPath(vaultRoot);
    if (existsSync(indexPath)) {
      log.envVar('POST_EDIT_INDEX_UPDATED', 1);
      log.envVar('POST_EDIT_INDEX_PATH', indexPath);
    } else {
      throw new Error(`Index file not created: ${indexPath}`);
    }
  } catch (err) {
    log.envVar('POST_EDIT_INDEX_UPDATED', 0);
    log.envVar('POST_EDIT_INDEX_ERROR', err.message);
  }
}
