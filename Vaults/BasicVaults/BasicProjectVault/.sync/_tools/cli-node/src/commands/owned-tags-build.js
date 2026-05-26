/**
 * owned-tags-build — Aggregate per-vault Tags/OWNED_TAGS.md → root Tags/OWNED_TAGS.md.
 *
 * ─────────────────────────────────────────────────────────────
 * Phase O-4 (owned_tags 옵션 C, 계획서 § 2.1.1 / § 3 B2)
 * ─────────────────────────────────────────────────────────────
 *   - 각 vault 의 `Tags/OWNED_TAGS.md` (frontmatter `type: owned-tags`, `vault: <id>`)
 *     본문 `## 소유 태그` 표 파싱 → owned 태그 + 의도 + 본 vault 사용 + 외부 사용 + 분류 추출
 *   - 1태그 1owner 충돌 검증 (1태그 → 2 vault 이상 owner 후보 시 BAD 마크, 빌드 중단 X)
 *   - 카테고리별 (Domain/Lab/Project/Personal) 섹션 + vault 별 subsection 으로 루트 집합 작성
 *   - envVar 출력으로 Shell Commands·CI 통합 가능
 *
 * ─────────────────────────────────────────────────────────────
 * Path resolution (자기 위치 기반 자동 탐지 — § 3 A4 환경 독립성)
 * ─────────────────────────────────────────────────────────────
 *   This file:  {CoreHub}/.sync/_tools/cli-node/src/commands/owned-tags-build.js
 *                                                 └── __dirname ──┘
 *   CoreHub root  = __dirname + 5 '..'  (commands→src→cli-node→_tools→.sync→CoreHub)
 *   AIMindVaults  = CoreHub + 3 '..'    (CoreHub→BasicVaults→Vaults→root)
 *
 *   `--root` override 시: resolve() 후 Vaults/ 존재 검증
 *
 * ─────────────────────────────────────────────────────────────
 * 절대경로/사용자명/vault_id 하드코딩 0 (판매 배포 대응)
 * ─────────────────────────────────────────────────────────────
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as log from '../lib/logger.js';
import { parseFrontmatterLight } from '../lib/frontmatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ────────────────────────────────────────────────
// Root detection (자기 위치 기반, --root override 가능)
// ────────────────────────────────────────────────

export function detectAIMindVaultsRoot(explicit) {
  if (explicit) {
    const r = resolve(explicit);
    if (!existsSync(join(r, 'Vaults'))) {
      throw new Error(`--root path missing 'Vaults/' directory: ${r}`);
    }
    return r;
  }
  // commands → src → cli-node → _tools → .sync → CoreHub → BasicVaults → Vaults → AIMindVaults
  const root = resolve(__dirname, '..', '..', '..', '..', '..', '..', '..', '..');
  if (existsSync(join(root, 'Vaults'))) return root;
  // Fallback: walk up
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
    if (existsSync(join(dir, 'Vaults'))) return dir;
  }
  throw new Error('AIMindVaults root not found (no ancestor with Vaults/)');
}

// ────────────────────────────────────────────────
// Discover Tags/OWNED_TAGS.md across vaults
// ────────────────────────────────────────────────

/**
 * Recursively scan `Vaults/` for `Tags/OWNED_TAGS.md` files.
 * @param {string} vaultsDir
 * @param {number} maxDepth
 * @returns {Promise<Array<{vaultDir: string, ownedTagsPath: string}>>}
 */
export async function findOwnedTagsFiles(vaultsDir, maxDepth = 4) {
  const results = [];
  if (!existsSync(vaultsDir)) return results;

  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    // Vault candidate: has Tags/OWNED_TAGS.md
    const candidate = join(dir, 'Tags', 'OWNED_TAGS.md');
    if (existsSync(candidate)) {
      results.push({ vaultDir: dir, ownedTagsPath: candidate });
      // Vaults do not nest — stop recursing into a discovered vault
      return;
    }
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden / system directories
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;
      await walk(join(dir, entry.name), depth + 1);
    }
  }

  await walk(vaultsDir, 0);
  return results;
}

// ────────────────────────────────────────────────
// Markdown table parser (## 소유 태그 section only)
// ────────────────────────────────────────────────

/**
 * Parse the `## 소유 태그` markdown table from OWNED_TAGS.md body.
 * Returns one row per data line (skips header + separator).
 *
 * Expected columns (in order):
 *   1. 태그
 *   2. 의도
 *   3. 본 vault 사용
 *   4. 외부 사용 vaults
 *   5. 분류 (자동/명시)
 *
 * Columns 3/4/5 are optional — older files may have 4 cols only.
 *
 * @param {string} body
 * @returns {Array<{tag: string, intent: string, ownUsage: string, externalUsage: string, kind: string}>}
 */
export function parseOwnedTagsTable(body) {
  const rows = [];
  const lines = body.split(/\r?\n/);
  let inSection = false;
  let inTable = false;
  let headerSeen = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Section detection: H2 starting with 소유 태그
    if (/^##\s+소유\s*태그/.test(line)) {
      inSection = true;
      inTable = false;
      headerSeen = false;
      continue;
    }
    // Next H2 ends the section
    if (inSection && /^##\s+/.test(line) && !/^##\s+소유\s*태그/.test(line)) {
      break;
    }
    if (!inSection) continue;

    // Table row detection
    if (line.startsWith('|') && line.endsWith('|')) {
      // Separator row | --- | --- |
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        if (headerSeen) inTable = true;
        continue;
      }
      if (!headerSeen) {
        headerSeen = true;
        continue;
      }
      if (!inTable) continue;
      // Parse cells
      const cells = line
        .slice(1, -1)
        .split('|')
        .map(s => s.trim());
      if (cells.length === 0) continue;
      const tag = stripBackticks(cells[0] || '');
      if (!tag) continue;
      rows.push({
        tag,
        intent: cells[1] || '',
        ownUsage: cells[2] || '',
        externalUsage: cells[3] || '',
        kind: normalizeKind(cells[4] || ''),
      });
    } else if (inTable && line === '') {
      // Blank line ends the table
      inTable = false;
    }
  }
  return rows;
}

function stripBackticks(s) {
  return s.replace(/^`(.+)`$/, '$1').trim();
}

function normalizeKind(s) {
  const t = s.trim();
  if (!t) return '';
  if (t.includes('자동')) return '자동';
  if (t.includes('명시')) return '명시';
  return t;
}

// ────────────────────────────────────────────────
// Vault → category mapping
// ────────────────────────────────────────────────

/**
 * Determine vault category from its path relative to AIMindVaults root.
 * Examples:
 *   Vaults/Domains_Game/Unity      → Domain
 *   Vaults/Domain_Art/ArtInsight   → Domain   (singular Domain_Art also recognized)
 *   Vaults/Lab_Game/CombatToolKit  → Lab
 *   Vaults/Projects_Game/JissouGame → Project
 *   Vaults/Personal/Diary          → Personal
 *
 * Returns { category, parentFolder } where parentFolder is the directory
 * immediately under Vaults/ (e.g. "Domains_Game").
 */
export function classifyVaultPath(relPath) {
  const parts = relPath.split(/[\\/]/).filter(Boolean);
  // Expect: ['Vaults', '<parent>', '<vaultId>', ...]
  if (parts.length < 3 || parts[0] !== 'Vaults') {
    return { category: 'Other', parentFolder: parts[1] || '' };
  }
  const parent = parts[1];
  let category = 'Other';
  if (/^Domains?_/i.test(parent) || /^Domain_/i.test(parent)) category = 'Domain';
  else if (/^Lab_/i.test(parent) || /^Labs_/i.test(parent)) category = 'Lab';
  else if (/^Projects?_/i.test(parent)) category = 'Project';
  else if (parent === 'Personal' || /^Personal_/i.test(parent)) category = 'Personal';
  else if (/^BasicVaults?$/i.test(parent)) category = 'Hub';
  return { category, parentFolder: parent };
}

// ────────────────────────────────────────────────
// Build root OWNED_TAGS.md content
// ────────────────────────────────────────────────

const CATEGORY_ORDER = ['Domain', 'Lab', 'Project', 'Personal', 'Hub', 'Other'];
const CATEGORY_LABEL = {
  Domain: 'Domain Vaults',
  Lab: 'Lab Vaults',
  Project: 'Project Vaults',
  Personal: 'Personal Vaults',
  Hub: 'Hub Vaults',
  Other: 'Other Vaults',
};

/**
 * Build the root Tags/OWNED_TAGS.md content from parsed vault entries.
 *
 * @param {Array} vaultEntries - per-vault parsed records.
 * @param {Array} conflicts    - 1태그→2 owner 충돌 entries.
 * @param {object} meta        - { totalTags, totalVaults, builtIso }
 * @returns {string}
 */
export function renderRootOwnedTagsMd(vaultEntries, conflicts, meta) {
  const today = (meta.builtIso || new Date().toISOString().slice(0, 10));
  const lines = [];

  // Frontmatter
  lines.push('---');
  lines.push('type: owned-tags-index');
  lines.push('updated: ' + today);
  lines.push('total_owned_tags: ' + meta.totalTags);
  lines.push('total_vaults: ' + meta.totalVaults);
  if (conflicts && conflicts.length > 0) {
    lines.push('conflicts: ' + conflicts.length);
  }
  lines.push('generated_by: aimv owned-tags-build');
  lines.push('---');
  lines.push('');

  lines.push('# 멀티볼트 소유 태그 총집합 (자동 빌드)');
  lines.push('');
  lines.push('```juggl');
  lines.push('local: OWNED_TAGS_index');
  lines.push('```');
  lines.push('');
  lines.push('> 자동 빌드 산출물 — 수동 편집 금지. 각 vault `Tags/OWNED_TAGS.md` 정본 수정 후 `aimv owned-tags-build --apply` 재실행.');
  lines.push('');

  // Group by category
  const byCategory = new Map();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const v of vaultEntries) {
    if (!byCategory.has(v.category)) byCategory.set(v.category, []);
    byCategory.get(v.category).push(v);
  }

  for (const cat of CATEGORY_ORDER) {
    const entries = byCategory.get(cat) || [];
    if (entries.length === 0) continue;
    lines.push('## ' + CATEGORY_LABEL[cat]);
    lines.push('');
    // Sort by parentFolder then vault id
    entries.sort((a, b) => {
      const p = (a.parentFolder || '').localeCompare(b.parentFolder || '');
      if (p !== 0) return p;
      return (a.vault || '').localeCompare(b.vault || '');
    });
    for (const v of entries) {
      lines.push(`### ${v.vault} (\`${v.relPath.replace(/\\/g, '/')}/\`)`);
      lines.push('');
      if (v.theme) {
        lines.push(`주제: ${v.theme}`);
        lines.push('');
      }
      const auto = v.rows.filter(r => r.kind === '자동');
      const explicit = v.rows.filter(r => r.kind === '명시');
      const other = v.rows.filter(r => r.kind !== '자동' && r.kind !== '명시');

      if (auto.length > 0) {
        lines.push('- 자동 (vault_id 일치): ' + auto.map(r => '`' + r.tag + '`').join(', '));
      }
      if (explicit.length > 0) {
        lines.push('- 명시: ' + explicit.map(r => '`' + r.tag + '`').join(', '));
      }
      if (other.length > 0) {
        lines.push('- 기타: ' + other.map(r => '`' + r.tag + '`').join(', '));
      }
      if (v.rows.length === 0) {
        lines.push('- (소유 태그 없음)');
      }
      lines.push('');
    }
  }

  // Conflicts
  if (conflicts && conflicts.length > 0) {
    lines.push('## 1태그 1owner 충돌 (사용자 확정 필요)');
    lines.push('');
    lines.push('| 태그 | 후보 vault | 분류 |');
    lines.push('|------|-----------|------|');
    for (const c of conflicts) {
      const ownersStr = c.owners.map(o => `${o.vault} (${o.kind || '명시'})`).join(', ');
      lines.push(`| \`${c.tag}\` | ${ownersStr} | 충돌 |`);
    }
    lines.push('');
    lines.push('> 우선순위: vault_id 정확 일치 = 자동 우선. 사용자가 정본 OWNED_TAGS.md 수정 후 재빌드.');
    lines.push('');
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} [opts.root]       AIMindVaults root path (auto-detect if omitted)
 * @param {boolean} [opts.dryRun]    Preview without writing output
 * @param {boolean} [opts.apply]     Force apply (default if neither given)
 * @param {string} [opts.outputPath] Override output path (testing)
 */
export async function ownedTagsBuild(opts = {}) {
  const start = Date.now();
  let aimvRoot;
  try {
    aimvRoot = detectAIMindVaultsRoot(opts.root);
  } catch (err) {
    log.error(err.message);
    process.exitCode = 1;
    return;
  }

  // Default mode = apply (per spec). Only dry-run when explicitly requested
  // and apply was not also passed.
  const dryRun = !!opts.dryRun && !opts.apply;
  const vaultsDir = join(aimvRoot, 'Vaults');
  const outputPath = opts.outputPath
    ? resolve(opts.outputPath)
    : join(aimvRoot, 'Tags', 'OWNED_TAGS.md');

  log.info(`[owned-tags-build] root=${aimvRoot}`);
  log.info(`[owned-tags-build] mode=${dryRun ? 'DRY-RUN' : 'APPLY'}`);

  // 1) Discover vault OWNED_TAGS.md files
  const found = await findOwnedTagsFiles(vaultsDir);
  if (found.length === 0) {
    log.warn(`No Tags/OWNED_TAGS.md found under ${vaultsDir}`);
    log.envVar('OWNED_TAGS_BUILD_RESULT', 'BAD');
    log.envVar('OWNED_TAGS_BUILD_VAULTS', 0);
    log.envVar('OWNED_TAGS_BUILD_TAGS', 0);
    log.envVar('OWNED_TAGS_BUILD_CONFLICTS', 0);
    process.exitCode = 1;
    return;
  }

  // 2) Parse each file
  const vaultEntries = [];
  const ownerMap = new Map(); // tag → [{ vault, kind }]
  let parseErrors = 0;

  for (const { vaultDir, ownedTagsPath } of found) {
    let raw;
    try {
      raw = await readFile(ownedTagsPath, 'utf8');
    } catch (err) {
      log.warn(`Failed to read ${ownedTagsPath}: ${err.message}`);
      parseErrors++;
      continue;
    }
    const fm = parseFrontmatterLight(raw);
    if (fm.type !== 'owned-tags') {
      log.warn(`Skipping ${relative(aimvRoot, ownedTagsPath)} — frontmatter type != 'owned-tags' (got '${fm.type || ''}')`);
      parseErrors++;
      continue;
    }
    if (!fm.vault) {
      log.warn(`Skipping ${relative(aimvRoot, ownedTagsPath)} — frontmatter missing 'vault' field`);
      parseErrors++;
      continue;
    }

    // Extract body (after closing ---)
    const body = stripFrontmatter(raw);
    const theme = extractTheme(body);
    const rows = parseOwnedTagsTable(body);

    const relPath = relative(aimvRoot, vaultDir);
    const { category, parentFolder } = classifyVaultPath(relPath);

    vaultEntries.push({
      vault: fm.vault,
      relPath,
      category,
      parentFolder,
      theme,
      rows,
      sourcePath: ownedTagsPath,
    });

    // Record ownership for conflict check
    for (const r of rows) {
      if (!r.tag) continue;
      if (!ownerMap.has(r.tag)) ownerMap.set(r.tag, []);
      ownerMap.get(r.tag).push({ vault: fm.vault, kind: r.kind, source: ownedTagsPath });
    }
  }

  // 3) Conflict detection (1태그 → 2 vault 이상)
  const conflicts = [];
  for (const [tag, owners] of ownerMap.entries()) {
    if (owners.length <= 1) continue;
    // Dedup by vault — same vault listing the tag twice is not a conflict
    const uniqueByVault = new Map();
    for (const o of owners) {
      if (!uniqueByVault.has(o.vault)) uniqueByVault.set(o.vault, o);
    }
    if (uniqueByVault.size <= 1) continue;
    conflicts.push({ tag, owners: [...uniqueByVault.values()] });
  }

  // 4) Build root OWNED_TAGS.md
  const totalTags = ownerMap.size;
  const totalVaults = vaultEntries.length;
  const content = renderRootOwnedTagsMd(vaultEntries, conflicts, {
    totalTags,
    totalVaults,
    builtIso: new Date().toISOString().slice(0, 10),
  });

  // 5) Write or preview
  if (dryRun) {
    log.info('');
    log.info('── DRY-RUN preview (first 60 lines) ──');
    const preview = content.split('\n').slice(0, 60).join('\n');
    log.info(preview);
    log.info(`...(${content.split('\n').length} lines total)`);
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf8');
    log.info(`Wrote: ${outputPath}`);
  }

  // 6) Conflict report
  if (conflicts.length > 0) {
    log.info('');
    log.warn(`충돌 ${conflicts.length}건 발견:`);
    for (const c of conflicts) {
      const ownersStr = c.owners.map(o => `${o.vault}(${o.kind || '명시'})`).join(' vs ');
      log.warn(`  - ${c.tag}: ${ownersStr}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const result = (parseErrors === 0 && conflicts.length === 0) ? 'OK' : 'BAD';
  log.summary('Owned Tags Build', {
    Mode: dryRun ? 'DRY-RUN' : 'APPLY',
    Vaults: totalVaults,
    Tags: totalTags,
    Conflicts: conflicts.length,
    ParseErrors: parseErrors,
    Time: `${elapsed}s`,
    Output: dryRun ? '(not written)' : outputPath,
  });

  log.envVar('OWNED_TAGS_BUILD_RESULT', result);
  log.envVar('OWNED_TAGS_BUILD_VAULTS', totalVaults);
  log.envVar('OWNED_TAGS_BUILD_TAGS', totalTags);
  log.envVar('OWNED_TAGS_BUILD_CONFLICTS', conflicts.length);

  if (result === 'BAD' && !dryRun) {
    // Non-zero exit only on apply path so dry-run doesn't break CI checks
    process.exitCode = 2;
  }
}

// ────────────────────────────────────────────────
// Small body helpers
// ────────────────────────────────────────────────

function stripFrontmatter(raw) {
  if (!/^---\s*\n/.test(raw)) return raw;
  const m = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  return m ? raw.slice(m[0].length) : raw;
}

/**
 * Extract the `## 볼트 주제` body (1~3 lines summary).
 */
export function extractTheme(body) {
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !/^##\s+볼트\s*주제/.test(lines[i].trim())) i++;
  if (i >= lines.length) return '';
  i++;
  const buf = [];
  while (i < lines.length) {
    const ln = lines[i].trim();
    if (/^##\s+/.test(ln)) break;
    if (ln) buf.push(ln);
    i++;
  }
  return buf.join(' ').trim();
}
