/**
 * tag-migrate — Cross-vault tag normalization (CoreHub CLI).
 *
 * ─────────────────────────────────────────────────────────────
 * Policy (owned_tags 계획서 § 3 A1 / 2026-05-12 확정)
 * ─────────────────────────────────────────────────────────────
 *   - 전 태그 PascalCase + 약어 대문자 유지 + 다국어 자유 (CJK 그대로)
 *   - 약어 결합 = JSONParser (전통 PascalCase, 약어 보존) — aliases 사전 등록
 *   - 메타 태그 (domain, Meta, meta, (볼트 태그)) → 삭제
 *   - vault_id 정합 케이스 (AI_Coding, Project_AIMindVaults) → snake_case 유지
 *   - 환경 독립성 § 3 A4 — 절대경로/사용자명/볼트명 하드코딩 0
 *
 * ─────────────────────────────────────────────────────────────
 * Path resolution (자기 위치 기반 자동 탐지)
 * ─────────────────────────────────────────────────────────────
 *   This file:  {CoreHub}/.sync/_tools/cli-node/src/commands/tag-migrate.js
 *                                                 └── __dirname ──┘
 *   CoreHub root  = __dirname + 5 '..' (src→cli-node→_tools→.sync→CoreHub)
 *   AIMindVaults  = CoreHub + 3 '..'  (CoreHub→BasicVaults→Vaults→root)
 *   tag-aliases   = __dirname + 2 '..' / data / tag-aliases.yaml
 *
 *   `--root` override 시: resolve() 후 Vaults/ 존재 검증
 */

import { readFile, writeFile, readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import * as log from '../lib/logger.js';
import { parseFrontmatterLight } from '../lib/frontmatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ────────────────────────────────────────────────
// YAML loader (tag-aliases.yaml 전용 미니 파서)
// 의존성 추가 없이 본 파일 구조만 처리:
//   aliases:
//     key: value
//     "quoted": value
//   remove:
//     - item
//     - "(quoted)"
//   rules:
//     description: |
//       block scalar (skipped)
// ────────────────────────────────────────────────

export function loadTagAliasesFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  return parseTagAliases(text);
}

export function parseTagAliases(text) {
  const result = { aliases: {}, remove: [] };
  const lines = text.split(/\r?\n/);
  let section = null; // 'aliases' | 'remove' | null (others ignored)
  let inBlockScalar = false;
  let blockIndent = -1;

  for (const rawLine of lines) {
    let line = rawLine;
    // strip comments outside quotes
    const ci = findCommentStart(line);
    if (ci >= 0) line = line.slice(0, ci);
    if (!line.trim()) continue;

    const indent = countLeading(line, ' ', '\t');

    // Exit block scalar when indent returns to top level
    if (inBlockScalar && indent <= blockIndent) {
      inBlockScalar = false;
    } else if (inBlockScalar) {
      continue;
    }

    // Top-level section header
    if (indent === 0) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (key === 'aliases') section = 'aliases';
        else if (key === 'remove') section = 'remove';
        else section = null;
        if (val === '|' || val === '>') {
          inBlockScalar = true;
          blockIndent = 0;
        }
        continue;
      }
    }

    if (section === 'aliases') {
      // "  key: value" or "  \"q-key\": value"
      const m = line.match(/^\s+("[^"]+"|'[^']+'|[^:]+?)\s*:\s*(.*?)\s*$/);
      if (m) {
        const k = stripQuotes(m[1].trim());
        const v = stripQuotes(m[2].trim());
        // skip nested block scalar in description
        if (v === '|' || v === '>') {
          inBlockScalar = true;
          blockIndent = indent;
          continue;
        }
        if (k && v) result.aliases[k] = v;
      }
    } else if (section === 'remove') {
      const m = line.match(/^\s+-\s+(.+?)\s*$/);
      if (m) {
        const v = stripQuotes(m[1].trim());
        if (v) result.remove.push(v);
      }
    }
  }
  return result;
}

function stripQuotes(s) {
  if (!s) return s;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function countLeading(s, ...chars) {
  let i = 0;
  while (i < s.length && chars.includes(s[i])) i++;
  return i;
}

function findCommentStart(line) {
  let inQuote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else {
      if (c === '"' || c === "'") inQuote = c;
      else if (c === '#') {
        // require # at line start or after whitespace
        if (i === 0 || /\s/.test(line[i - 1])) return i;
      }
    }
  }
  return -1;
}

// ────────────────────────────────────────────────
// Tag normalization core
// ────────────────────────────────────────────────

// CJK ranges: Hangul Syllables · Hangul Jamo · Hiragana · Katakana · CJK Unified
const NON_LATIN_RE = /[ᄀ-ᇿ぀-ゟ゠-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/;

export function hasNonLatin(tag) {
  return NON_LATIN_RE.test(String(tag));
}

/**
 * Normalize a single tag string.
 * @param {string} tag
 * @param {object} opts
 * @param {object} [opts.aliases]   - exact-match alias map
 * @param {Set}    [opts.removeSet] - tags to remove
 * @param {Set}    [opts.vaultIds]  - vault_id list (snake_case preservation)
 * @returns {{ result: string|null, rule: string }}
 *   result === null when tag is removed (alias→removed, or in remove list)
 */
export function normalizeTag(tag, opts = {}) {
  const aliases = opts.aliases || {};
  const removeSet = opts.removeSet || new Set();
  const vaultIds = opts.vaultIds || new Set();

  if (typeof tag !== 'string') return { result: null, rule: 'invalid-type' };
  const t = tag.trim();
  if (!t) return { result: null, rule: 'empty' };

  // 0.0. strip leading `#` if user typo'd inline syntax into frontmatter
  //      (e.g., `tags: [#Unity, #Tutorial]` → re-normalize as `Unity`, `Tutorial`)
  if (t.startsWith('#') && t.length > 1) {
    const inner = normalizeTag(t.slice(1), opts);
    return { result: inner.result, rule: `hash-stripped+${inner.rule}` };
  }

  // 0. aliases dictionary first (takes precedence)
  if (Object.prototype.hasOwnProperty.call(aliases, t)) {
    const v = aliases[t];
    if (!v) return { result: null, rule: 'alias→null' };
    if (removeSet.has(v)) return { result: null, rule: 'alias→remove' };
    return { result: v, rule: 'alias' };
  }

  // 0.5. remove list
  if (removeSet.has(t)) return { result: null, rule: 'remove' };

  // 1. CJK (non-Latin) — keep verbatim
  if (hasNonLatin(t)) return { result: t, rule: 'cjk-keep' };

  // 1.5. nested slash → PascalCase concat (5-12 결정: '/' 슬래시 계층 금지, segments 합쳐 PascalCase)
  //      예: `unity/dots` → `UnityDOTS`, `doc/index` → `DocIndex`, `vault/idea` → `VaultIdea`
  if (t.includes('/')) {
    const segs = t.split('/').filter(s => s);
    if (segs.length === 0) return { result: null, rule: 'nested-empty' };
    const out = [];
    for (const s of segs) {
      const r = normalizeTag(s, opts);
      if (r.result === null) return { result: null, rule: 'nested-segment-removed' };
      out.push(r.result);
    }
    return { result: out.join(''), rule: 'nested-slash→pascal-concat' };
  }

  // 2. vault_id snake_case preservation (e.g., AI_Coding)
  if (vaultIds.has(t)) return { result: t, rule: 'vault_id-keep' };

  // 3. all-uppercase acronym → keep
  if (/^[A-Z]+$/.test(t)) return { result: t, rule: 'acronym-keep' };

  // 4. already PascalCase → keep
  if (/^[A-Z][a-zA-Z0-9]*$/.test(t)) return { result: t, rule: 'pascal-keep' };

  // 5. PascalCase + underscore (vault_id-like, not in vaultIds yet) → keep
  //    Matches AI_Coding, Project_AIMindVaults, USA_2026
  if (/^[A-Z][a-zA-Z0-9]*(_[A-Za-z0-9]+)+$/.test(t)) {
    return { result: t, rule: 'underscore-pascal-keep' };
  }

  // 6. digit-leading composite → keep (3D, 3DModeling, 2DArt)
  //    when starts with digit and remainder is alphanumeric
  if (/^[0-9]+[A-Z][a-zA-Z0-9]*$/.test(t) || /^[0-9]+$/.test(t)) {
    return { result: t, rule: 'digit-leading-keep' };
  }

  // 7. kebab-case or snake_case → PascalCase (segment-wise capitalization)
  //    Per policy item 9, acronym segments preserve uppercase via alias lookup
  //    (e.g., `2d-game` → `2DGame` when `2d → 2D` is in aliases).
  if (/[-_]/.test(t)) {
    const parts = t.split(/[-_]/);
    let out = '';
    for (const p of parts) {
      if (!p) continue;
      // segment-level alias lookup (catches 2d → 2D, ai → AI, etc.)
      if (Object.prototype.hasOwnProperty.call(aliases, p)) {
        out += aliases[p];
        continue;
      }
      if (/^[A-Z]+$/.test(p)) out += p;                     // acronym segment kept
      else if (/^[0-9]+$/.test(p)) out += p;                // numeric segment kept
      else if (/^[0-9]/.test(p)) out += p;                  // digit-leading segment kept
      else out += p.charAt(0).toUpperCase() + p.slice(1);
    }
    return { result: out, rule: 'kebab/snake→pascal' };
  }

  // 8. camelCase → PascalCase (capitalize first char only)
  if (/^[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*$/.test(t)) {
    return { result: t.charAt(0).toUpperCase() + t.slice(1), rule: 'camel→pascal' };
  }

  // 9. single lowercase word → capitalize first char
  if (/^[a-z][a-z0-9]*$/.test(t)) {
    return { result: t.charAt(0).toUpperCase() + t.slice(1), rule: 'lowercase→capitalize' };
  }

  // 10. fallback — keep verbatim, flag ambiguous
  return { result: t, rule: 'ambiguous-keep' };
}

/**
 * Normalize an array of tags + dedup. Order preserved (first occurrence wins).
 * @returns {{ tags: string[], changes: Array<{from:string,to:string|null,rule:string}>, dedup: string[] }}
 */
export function normalizeTagsArray(tagsInput, opts) {
  const tags = Array.isArray(tagsInput) ? tagsInput : (tagsInput ? [tagsInput] : []);
  const changes = [];
  const dedup = [];
  const result = [];
  const seen = new Set();
  for (const orig of tags) {
    const { result: out, rule } = normalizeTag(orig, opts);
    if (out === null) {
      changes.push({ from: orig, to: null, rule });
      continue;
    }
    if (out !== orig) changes.push({ from: orig, to: out, rule });
    if (seen.has(out)) {
      dedup.push(orig);
      if (out !== orig) {
        // already tracked transform above; mark dedup separately
      } else {
        changes.push({ from: orig, to: out, rule: 'dedup' });
      }
      continue;
    }
    seen.add(out);
    result.push(out);
  }
  return { tags: result, changes, dedup };
}

/**
 * Normalize an inline `#tag` (may contain `/` for nested).
 * 5-12 정책: '/' 슬래시 계층 금지 → normalizeTag 가 통합 처리 (segments 합쳐 PascalCase).
 */
export function normalizeInlineTag(tagFragment, opts) {
  if (typeof tagFragment !== 'string') return { result: null, rule: 'invalid-type' };
  return normalizeTag(tagFragment, opts);
}

// ────────────────────────────────────────────────
// Frontmatter `tags:` patcher
// 형식 보존: inline `[a, b]`, block list, scalar
// ────────────────────────────────────────────────

export function patchFrontmatterTags(content, newTags) {
  const fmMatch = content.match(/^(---\s*\r?\n)([\s\S]*?\r?\n)(---)/);
  if (!fmMatch) return content;

  const opening = fmMatch[1];
  const rawYaml = fmMatch[2];
  const closing = fmMatch[3];
  const afterFm = content.slice(fmMatch[0].length);

  // inline array: tags: [a, b]
  const inlineRe = /^(tags\s*:\s*)\[[^\]]*\]\s*$/m;
  if (inlineRe.test(rawYaml)) {
    const updatedYaml = rawYaml.replace(inlineRe, `$1[${newTags.join(', ')}]`);
    return opening + updatedYaml + closing + afterFm;
  }

  // block list: tags:\n  - a\n  - b\n
  const blockRe = /^(tags\s*:\s*)\r?\n((?:[ \t]+-[ \t]+[^\r\n]*\r?\n)+)/m;
  const blockMatch = rawYaml.match(blockRe);
  if (blockMatch) {
    const indent = blockMatch[2].match(/^([ \t]+)/)?.[1] || '  ';
    const lineEnd = blockMatch[2].includes('\r\n') ? '\r\n' : '\n';
    const newBlock = newTags.length === 0
      ? ''
      : newTags.map(t => `${indent}- ${t}`).join(lineEnd) + lineEnd;
    const updatedYaml = rawYaml.replace(blockRe, `${blockMatch[1]}${lineEnd}${newBlock}`);
    return opening + updatedYaml + closing + afterFm;
  }

  // scalar: tags: single-value
  const scalarRe = /^(tags\s*:\s*)[^\r\n]+$/m;
  if (scalarRe.test(rawYaml)) {
    const updatedYaml = rawYaml.replace(scalarRe, `$1[${newTags.join(', ')}]`);
    return opening + updatedYaml + closing + afterFm;
  }

  return content;
}

// ────────────────────────────────────────────────
// Inline `#tag` body rewriter
// 코드 펜스 · 헤딩 라인 제외
// ────────────────────────────────────────────────

const INLINE_TAG_RE = /(^|[^\w/`])#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu;

export function rewriteInlineTags(body, opts) {
  const lines = body.split(/\r?\n/);
  const lineEnd = body.includes('\r\n') ? '\r\n' : '\n';
  let inFence = false;
  const out = [];
  const changes = [];
  let removed = 0;

  for (const line of lines) {
    // toggle code fence
    if (/^[ \t]{0,3}```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) { out.push(line); continue; }
    // heading line — skip (markdown heading, not a tag)
    if (/^#{1,6}\s/.test(line)) { out.push(line); continue; }

    const newLine = line.replace(INLINE_TAG_RE, (match, prefix, tag) => {
      const r = normalizeInlineTag(tag, opts);
      if (r.result === null) {
        removed++;
        changes.push({ from: tag, to: null, rule: r.rule });
        return prefix;
      }
      if (r.result !== tag) {
        changes.push({ from: tag, to: r.result, rule: r.rule });
      }
      return `${prefix}#${r.result}`;
    });
    out.push(newLine);
  }
  return { body: out.join(lineEnd), changes, removed };
}

// ────────────────────────────────────────────────
// AIMindVaults root + vault discovery
// ────────────────────────────────────────────────

export function detectAIMindVaultsRoot() {
  // CLI file at {CoreHub}/.sync/_tools/cli-node/src/commands/tag-migrate.js
  // Ascend until a directory containing `Vaults/` is found (max 10 levels)
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
    if (existsSync(join(dir, 'Vaults'))) return dir;
  }
  return null;
}

export function defaultTagAliasesPath() {
  // __dirname + 2 '..' (commands → src) + data/tag-aliases.yaml
  return resolve(__dirname, '..', '..', 'data', 'tag-aliases.yaml');
}

async function findVaultsByIndex(vaultsDir, maxDepth, depth = 0) {
  const results = [];
  if (depth > maxDepth || !existsSync(vaultsDir)) return results;

  const indexPath = join(vaultsDir, '.vault_data', 'vault_index.json');
  if (existsSync(indexPath)) {
    results.push({ dir: vaultsDir, indexPath });
  }
  try {
    const entries = await readdir(vaultsDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        results.push(...await findVaultsByIndex(join(vaultsDir, e.name), maxDepth, depth + 1));
      }
    }
  } catch { /* ignore */ }
  return results;
}

async function globMarkdown(dir, baseLen, results = []) {
  if (!existsSync(dir)) return results;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await globMarkdown(full, baseLen, results);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// ────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} [opts.root]        - AIMindVaults root (auto-detect if omitted)
 * @param {string} [opts.vault]       - Single vault name filter
 * @param {string} [opts.scope]       - 'frontmatter' | 'inline' | 'all' (default 'all')
 * @param {boolean} [opts.dryRun]     - default true
 * @param {boolean} [opts.apply]      - actually rewrite files
 * @param {boolean} [opts.reindex]    - after apply: rebuild vault + master index
 * @param {string}  [opts.report]     - report output path (default stdout)
 * @param {string}  [opts.backupDir]  - backup destination (default $TEMP/aimv_tag_migrate_<ts>)
 * @param {string}  [opts.aliasesFile]- override tag-aliases.yaml path (testing)
 */
export async function tagMigrate(opts = {}) {
  const start = Date.now();
  const scope = (opts.scope || 'all').toLowerCase();
  if (!['frontmatter', 'inline', 'all'].includes(scope)) {
    log.error(`Invalid --scope: ${opts.scope} (expected frontmatter|inline|all)`);
    process.exitCode = 1;
    return;
  }
  const apply = !!opts.apply;
  const dryRun = !apply;  // default = dry-run

  // ── Root resolution ──
  const root = opts.root ? resolve(opts.root) : detectAIMindVaultsRoot();
  if (!root) {
    log.error('AIMindVaults root not detected (no Vaults/ ancestor found).');
    process.exitCode = 1;
    return;
  }
  const vaultsDir = join(root, 'Vaults');
  if (!existsSync(vaultsDir)) {
    log.error(`Invalid --root: Vaults/ not found under ${root}`);
    process.exitCode = 1;
    return;
  }

  // ── Aliases load ──
  const aliasesPath = opts.aliasesFile ? resolve(opts.aliasesFile) : defaultTagAliasesPath();
  if (!existsSync(aliasesPath)) {
    log.error(`tag-aliases.yaml not found: ${aliasesPath}`);
    process.exitCode = 1;
    return;
  }
  let aliasesData;
  try {
    aliasesData = loadTagAliasesFile(aliasesPath);
  } catch (err) {
    log.error(`Failed to parse tag-aliases.yaml: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  const aliases = aliasesData.aliases || {};
  const removeSet = new Set(aliasesData.remove || []);

  // ── Vault discovery ──
  const vaultEntries = await findVaultsByIndex(vaultsDir, 4);
  if (vaultEntries.length === 0) {
    log.error(`No vault indices found under ${vaultsDir}. Run \`aimv index build\` first.`);
    process.exitCode = 1;
    return;
  }
  const vaultIds = new Set(vaultEntries.map(v => v.dir.split(/[\\/]/).pop()));
  const normOpts = { aliases, removeSet, vaultIds };

  // ── Backup dir (only if apply) ──
  let backupRoot = null;
  if (apply) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    backupRoot = opts.backupDir
      ? resolve(opts.backupDir)
      : join(tmpdir(), `aimv_tag_migrate_${stamp}`);
    await mkdir(backupRoot, { recursive: true });
  }

  // ── Per-vault scan ──
  const stats = {
    totalVaults: 0,
    totalNotes: 0,
    notesChanged: 0,
    fmTagChanges: 0,
    fmTagRemoved: 0,
    fmDedupCount: 0,
    inlineTagChanges: 0,
    inlineTagRemoved: 0,
    ambiguousNotes: [],
    perVault: {},
    tagMap: new Map(),       // 'old → new (rule)' → noteCount
    removedTagMap: new Map(), // 'old (rule)' → noteCount
  };

  for (const v of vaultEntries) {
    const vName = v.dir.split(/[\\/]/).pop();
    if (opts.vault && vName !== opts.vault) continue;
    stats.totalVaults++;

    const contentsDir = join(v.dir, 'Contents');
    const mdFiles = await globMarkdown(contentsDir, contentsDir.length);
    stats.totalNotes += mdFiles.length;
    const vStat = { notes: mdFiles.length, changed: 0, fmChanges: 0, inlineChanges: 0 };

    for (const file of mdFiles) {
      let content;
      try { content = await readFile(file, 'utf8'); }
      catch (err) { log.warn(`read failed: ${file} (${err.message})`); continue; }

      const fm = parseFrontmatterLight(content);
      const originalTags = Array.isArray(fm.tags) ? fm.tags
        : (typeof fm.tags === 'string' && fm.tags ? [fm.tags] : []);

      // Frontmatter tags
      let fmChanged = false;
      let newFmTags = originalTags;
      if (scope === 'frontmatter' || scope === 'all') {
        const norm = normalizeTagsArray(originalTags, normOpts);
        newFmTags = norm.tags;
        if (norm.changes.length > 0 || norm.dedup.length > 0) {
          fmChanged = !sameArray(originalTags, newFmTags);
          for (const ch of norm.changes) {
            if (ch.to === null) {
              stats.fmTagRemoved++;
              tally(stats.removedTagMap, `${ch.from} (${ch.rule})`);
            } else if (ch.from !== ch.to) {
              stats.fmTagChanges++;
              tally(stats.tagMap, `${ch.from} → ${ch.to} (${ch.rule})`);
            }
            if (ch.rule === 'ambiguous-keep' && ch.from === ch.to) {
              stats.ambiguousNotes.push({ vault: vName, file: relative(root, file), tag: ch.from });
            }
          }
          stats.fmDedupCount += norm.dedup.length;
        }
        // also detect ambiguous tags from unchanged set (rule never produces change record)
        for (const t of originalTags) {
          const r = normalizeTag(t, normOpts);
          if (r.rule === 'ambiguous-keep') {
            stats.ambiguousNotes.push({ vault: vName, file: relative(root, file), tag: t });
          }
        }
      }

      // Inline `#tag` in body
      let inlineChanges = [];
      let inlineRemoved = 0;
      let newBody = null;
      if (scope === 'inline' || scope === 'all') {
        const fmEnd = content.match(/^---\s*\r?\n[\s\S]*?\r?\n---\r?\n?/);
        const bodyStart = fmEnd ? fmEnd[0].length : 0;
        const body = content.slice(bodyStart);
        const rew = rewriteInlineTags(body, normOpts);
        inlineChanges = rew.changes;
        inlineRemoved = rew.removed;
        if (rew.changes.length > 0 || rew.removed > 0) {
          newBody = content.slice(0, bodyStart) + rew.body;
          for (const ch of rew.changes) {
            if (ch.to === null) {
              stats.inlineTagRemoved++;
              tally(stats.removedTagMap, `#${ch.from} (inline, ${ch.rule})`);
            } else {
              stats.inlineTagChanges++;
              tally(stats.tagMap, `#${ch.from} → #${ch.to} (inline, ${ch.rule})`);
            }
          }
        }
      }

      const noteChanged = fmChanged || newBody !== null;
      if (noteChanged) {
        stats.notesChanged++;
        vStat.changed++;
        if (fmChanged) vStat.fmChanges++;
        if (newBody !== null) vStat.inlineChanges++;

        if (apply) {
          // backup original
          const relPath = relative(root, file);
          const backupPath = join(backupRoot, relPath);
          await mkdir(dirname(backupPath), { recursive: true });
          await copyFile(file, backupPath);

          // build final content
          let updated = newBody !== null ? newBody : content;
          if (fmChanged) updated = patchFrontmatterTags(updated, newFmTags);
          await writeFile(file, updated, 'utf8');
        }
      }
    }
    stats.perVault[vName] = vStat;
  }

  // ── Report ──
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const report = buildReport({
    mode: apply ? 'APPLY' : 'DRY_RUN',
    root,
    aliasesPath,
    scope,
    vaultFilter: opts.vault || '(all)',
    backupRoot,
    elapsed,
    stats,
  });

  if (opts.report) {
    const reportPath = resolve(opts.report);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, report, 'utf8');
    log.info(`Report written: ${reportPath}`);
  } else {
    process.stdout.write(report);
  }

  log.summary(`Tag Migrate Complete (${apply ? 'APPLY' : 'DRY_RUN'})`, {
    Vaults: stats.totalVaults,
    Notes: stats.totalNotes,
    Changed: stats.notesChanged,
    FmTagChanges: stats.fmTagChanges,
    FmTagRemoved: stats.fmTagRemoved,
    InlineChanges: stats.inlineTagChanges,
    InlineRemoved: stats.inlineTagRemoved,
    Dedup: stats.fmDedupCount,
    Ambiguous: stats.ambiguousNotes.length,
    Time: `${elapsed}s`,
  });

  // ── Reindex hook (apply only) ──
  if (apply && opts.reindex) {
    log.info('Reindex requested — main session should run `aimv index master-build`.');
  }
}

function tally(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function buildReport({ mode, root, aliasesPath, scope, vaultFilter, backupRoot, elapsed, stats }) {
  const lines = [];
  lines.push(`# Tag Migrate Report — ${mode}`);
  lines.push('');
  lines.push(`- root: \`${root}\``);
  lines.push(`- aliases: \`${aliasesPath}\``);
  lines.push(`- scope: ${scope}`);
  lines.push(`- vault filter: ${vaultFilter}`);
  if (backupRoot) lines.push(`- backup: \`${backupRoot}\``);
  lines.push(`- elapsed: ${elapsed}s`);
  lines.push('');
  lines.push(`## 영향 요약`);
  lines.push('');
  lines.push(`- 전체 볼트: ${stats.totalVaults}`);
  lines.push(`- 전체 노트: ${stats.totalNotes}`);
  lines.push(`- 변경 노트: ${stats.notesChanged}`);
  lines.push(`- frontmatter tag 변환: ${stats.fmTagChanges}`);
  lines.push(`- frontmatter tag 제거 (메타): ${stats.fmTagRemoved}`);
  lines.push(`- frontmatter dedup: ${stats.fmDedupCount}`);
  lines.push(`- inline #tag 변환: ${stats.inlineTagChanges}`);
  lines.push(`- inline #tag 제거: ${stats.inlineTagRemoved}`);
  lines.push(`- 모호 (ambiguous-keep): ${stats.ambiguousNotes.length}`);
  lines.push('');
  lines.push(`## 볼트별 변경`);
  lines.push('');
  lines.push('| 볼트 | 노트 수 | 변경 노트 | fm 변경 | inline 변경 |');
  lines.push('|------|--------|----------|---------|------------|');
  for (const [vName, vStat] of Object.entries(stats.perVault).sort()) {
    lines.push(`| ${vName} | ${vStat.notes} | ${vStat.changed} | ${vStat.fmChanges} | ${vStat.inlineChanges} |`);
  }
  lines.push('');
  lines.push(`## 태그 변환 매핑 (영향 노트 수)`);
  lines.push('');
  if (stats.tagMap.size === 0) {
    lines.push('(없음)');
  } else {
    const sorted = [...stats.tagMap.entries()].sort((a, b) => b[1] - a[1]);
    lines.push('| 변환 | 노트 수 |');
    lines.push('|------|--------|');
    for (const [k, v] of sorted) lines.push(`| ${escapePipe(k)} | ${v} |`);
  }
  lines.push('');
  lines.push(`## 제거 대상 (메타 태그)`);
  lines.push('');
  if (stats.removedTagMap.size === 0) {
    lines.push('(없음)');
  } else {
    const sorted = [...stats.removedTagMap.entries()].sort((a, b) => b[1] - a[1]);
    lines.push('| 태그 | 노트 수 |');
    lines.push('|------|--------|');
    for (const [k, v] of sorted) lines.push(`| ${escapePipe(k)} | ${v} |`);
  }
  lines.push('');
  lines.push(`## 모호 케이스 (사용자 확인 권장)`);
  lines.push('');
  if (stats.ambiguousNotes.length === 0) {
    lines.push('(없음)');
  } else {
    // dedup by (vault, tag) — show first 100 distinct tag occurrences with counts
    const tagCounts = new Map();
    const tagSamples = new Map();
    for (const { vault, file, tag } of stats.ambiguousNotes) {
      const key = `${tag}`;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      if (!tagSamples.has(key)) tagSamples.set(key, `${vault}: ${file}`);
    }
    lines.push('| 태그 | 노트 수 | 샘플 위치 |');
    lines.push('|------|--------|-----------|');
    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100);
    for (const [tag, count] of sorted) {
      lines.push(`| ${escapePipe(tag)} | ${count} | ${escapePipe(tagSamples.get(tag))} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function escapePipe(s) {
  return String(s).replace(/\|/g, '\\|');
}
