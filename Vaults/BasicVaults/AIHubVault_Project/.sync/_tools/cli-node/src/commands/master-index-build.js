/**
 * master_index_build — Cross-vault master index aggregation.
 *
 * ─────────────────────────────────────────────────────────────
 * Phase O-5 (owned_tags 옵션 C, 계획서 § 2.5 / § 3 B2 / § 4.2)
 * ─────────────────────────────────────────────────────────────
 *   - 옛 `concept_map` (2+ vault 공유 태그) 유지 (호환성 / viz fallback)
 *   - 신규 `tag_owners` = 1계층 자동 (tag key == vault_id 정확 일치)
 *                       + 2계층 명시 ({vault}/Tags/OWNED_TAGS.md 본문 표)
 *   - 신규 `tag_aliases` = tag-aliases.yaml `aliases` 매핑 1회 로드
 *   - 신규 `connections` = owner != null AND 외부 vault 가 그 태그 사용 케이스만
 *   - 신규 `connection_count` = Object.keys(connections).length (timeseries 정합)
 *   - 신규 `owner_conflicts` = 1태그 → 2 owner 이상 충돌 리스트 (자동 우선)
 *
 * ─────────────────────────────────────────────────────────────
 * Path resolution (자기 위치 기반 자동 탐지 — § 3 A4 환경 독립성)
 * ─────────────────────────────────────────────────────────────
 *   This file:  {CoreHub}/.sync/_tools/cli-node/src/commands/master-index-build.js
 *   AIMindVaults root  = walk up until directory containing `Vaults/` is found
 *   tag-aliases.yaml   = via defaultTagAliasesPath() from tag-migrate.js
 *
 *   절대경로/사용자명/vault_id 하드코딩 0 (판매 배포 대응)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as log from '../lib/logger.js';
import { updateTimeseries } from '../lib/timeseries.js';
import { parseFrontmatterLight } from '../lib/frontmatter.js';
import {
  findOwnedTagsFiles,
  parseOwnedTagsTable,
} from './owned-tags-build.js';
import {
  loadTagAliasesFile,
  defaultTagAliasesPath,
} from './tag-migrate.js';

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

    // Aggregate notes (R137 Gap 5 — mtime/created 포함, master.notes 만으로 시계열 시각화 가능)
    for (const note of vIndex.notes) {
      masterNotes.push({
        vault_id: vName,
        title: note.title,
        path: note.path,
        type: note.type,
        tags: Array.isArray(note.tags) ? note.tags : [],
        mtime: note.mtime || null,
        created: note.created || null,
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

  // concept_map: tags spanning 2+ vaults (옛 모델, 호환성 유지 — viz fallback)
  const conceptMap = {};
  for (const [tagName, entries] of Object.entries(masterTagIndex)) {
    const vaultIds = [...new Set(entries.map(e => e.split(':')[0]))].sort();
    if (vaultIds.length >= 2) {
      conceptMap[tagName] = { vaults: vaultIds, count: entries.length };
    }
  }

  // ────────────────────────────────────────────────
  // Phase O-5: tag_owners / tag_aliases / connections
  // ────────────────────────────────────────────────

  const vaultIds = new Set(Object.keys(masterVaults));

  // tag_owners — 1계층 자동 (tag key == vault_id) + 2계층 명시 (OWNED_TAGS.md)
  const tagOwners = {};
  const ownerConflicts = []; // { tag, autoOwner, explicit: [{vault, kind, source}] }

  // 1계층 자동: tag_index key 가 vault_id 와 정확 일치 → 자동 owned
  for (const tag of Object.keys(masterTagIndex)) {
    if (vaultIds.has(tag)) {
      tagOwners[tag] = tag;
    }
  }

  // 2계층 명시: 각 vault 의 Tags/OWNED_TAGS.md 파싱
  // Single-vault partial 모드일 때는 기존 master 의 명시 owned 도 보존해야 하지만
  // OWNED_TAGS.md 는 전체 vault 를 매번 새로 스캔하므로 항상 fresh 도출.
  const explicitOwnedByTag = new Map(); // tag → [{vault, kind, sourcePath}]
  let explicitParseErrors = 0;

  try {
    const ownedFiles = await findOwnedTagsFiles(vaultsDir);
    for (const { vaultDir, ownedTagsPath } of ownedFiles) {
      let raw;
      try {
        raw = await readFile(ownedTagsPath, 'utf8');
      } catch (err) {
        log.warn(`OWNED_TAGS read failed (${ownedTagsPath}): ${err.message}`);
        explicitParseErrors++;
        continue;
      }
      const fm = parseFrontmatterLight(raw);
      if (fm.type !== 'owned-tags' || !fm.vault) {
        // Skip non-conforming files quietly — owned-tags-build emits its own warnings.
        continue;
      }
      const body = stripFrontmatter(raw);
      const rows = parseOwnedTagsTable(body);
      const declVault = fm.vault;
      for (const r of rows) {
        if (!r.tag) continue;
        if (!explicitOwnedByTag.has(r.tag)) explicitOwnedByTag.set(r.tag, []);
        explicitOwnedByTag.get(r.tag).push({
          vault: declVault,
          kind: r.kind || '명시',
          sourcePath: ownedTagsPath,
        });
      }
    }
  } catch (err) {
    log.warn(`OWNED_TAGS aggregation failed: ${err.message}`);
  }

  // Merge explicit ownership into tagOwners with conflict detection.
  // Priority: vault_id 정확 일치 (자동) 우선. 명시 owned 가 다른 vault 면 충돌 기록.
  for (const [tag, owners] of explicitOwnedByTag.entries()) {
    // Dedup same-vault duplicate rows
    const uniqueByVault = new Map();
    for (const o of owners) if (!uniqueByVault.has(o.vault)) uniqueByVault.set(o.vault, o);

    const autoOwner = tagOwners[tag] || null; // already set by 1계층 자동
    const explicitVaults = [...uniqueByVault.keys()];

    if (autoOwner) {
      // 1계층 자동 우선. 명시가 autoOwner 와 일치하면 정합 OK.
      const mismatchedExplicit = explicitVaults.filter(v => v !== autoOwner);
      if (mismatchedExplicit.length > 0) {
        ownerConflicts.push({
          tag,
          autoOwner,
          explicit: [...uniqueByVault.values()],
        });
        // Keep autoOwner as winner — don't override.
      }
    } else if (explicitVaults.length === 1) {
      // 자동 없음 + 명시 1 vault → 명시 owner 채택
      tagOwners[tag] = explicitVaults[0];
    } else if (explicitVaults.length >= 2) {
      // 자동 없음 + 명시 2+ vault → 충돌 (사용자 확정 필요, owner 미선정)
      ownerConflicts.push({
        tag,
        autoOwner: null,
        explicit: [...uniqueByVault.values()],
      });
      // Do not set tagOwners[tag] — leave unowned until user resolves.
    }
  }

  // tag_aliases — tag-aliases.yaml 1회 로드
  let tagAliases = {};
  try {
    const aliasesPath = defaultTagAliasesPath();
    if (existsSync(aliasesPath)) {
      const { aliases } = loadTagAliasesFile(aliasesPath);
      tagAliases = aliases || {};
    } else {
      log.warn(`tag-aliases.yaml not found at ${aliasesPath}`);
    }
  } catch (err) {
    log.warn(`Failed to load tag-aliases.yaml: ${err.message}`);
  }

  // connections — owner 가 있고 외부 vault 가 사용한 케이스만
  const connections = {};
  for (const [tag, owner] of Object.entries(tagOwners)) {
    const entries = masterTagIndex[tag] || [];
    const vaultsUsing = [...new Set(entries.map(e => e.split(':')[0]))];
    const users = vaultsUsing.filter(v => v !== owner).sort();
    if (users.length === 0) continue;

    const ownedNotes = entries.filter(e => e.startsWith(`${owner}:`)).length;
    const userNotes = entries.length - ownedNotes;

    connections[tag] = {
      owner,
      users,
      ownedNotes,
      userNotes,
    };
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
    // Phase O-5 신규 필드
    tag_owners: tagOwners,
    tag_aliases: tagAliases,
    connections,
    connection_count: Object.keys(connections).length,
    owner_conflicts: ownerConflicts,
  };

  await writeFile(masterIndexPath, JSON.stringify(masterIndex, null, 2), 'utf8');

  let timeseriesInfo = '-';
  try {
    const ts = await updateTimeseries(masterDataDir, masterIndex);
    const latest = ts.snapshots[ts.snapshots.length - 1];
    timeseriesInfo = `${ts.snapshots.length} snapshots (latest: ${latest?.date || '-'})`;
  } catch (err) {
    log.warn(`timeseries update failed: ${err.message}`);
  }

  // Conflict report
  if (ownerConflicts.length > 0) {
    log.warn(`1태그 1owner 충돌 ${ownerConflicts.length}건:`);
    for (const c of ownerConflicts.slice(0, 10)) {
      const explicitStr = c.explicit
        .map(e => `${e.vault}(${e.kind || '명시'})`)
        .join(' vs ');
      const auto = c.autoOwner ? ` auto=${c.autoOwner}` : '';
      log.warn(`  - ${c.tag}:${auto} explicit=${explicitStr}`);
    }
    if (ownerConflicts.length > 10) {
      log.warn(`  ... ${ownerConflicts.length - 10} more (see master_index.json owner_conflicts)`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const mode = vaultName ? `PARTIAL (${vaultName})` : 'FULL';
  log.summary('Master Index Build Complete', {
    Mode: mode,
    Vaults: Object.keys(masterVaults).length,
    Notes: masterNotes.length,
    Tags: Object.keys(masterTagIndex).length,
    Concepts: `${Object.keys(conceptMap).length} (cross-vault, legacy)`,
    Connections: `${Object.keys(connections).length} (owner→users, Phase O-5)`,
    TagOwners: `${Object.keys(tagOwners).length} (auto + explicit)`,
    TagAliases: Object.keys(tagAliases).length,
    OwnerConflicts: ownerConflicts.length,
    Timeseries: timeseriesInfo,
    Time: `${elapsed}s`,
    Output: masterIndexPath,
  });

  log.envVar('MASTER_INDEX_BUILD_RESULT', ownerConflicts.length === 0 && explicitParseErrors === 0 ? 'OK' : 'BAD');
  log.envVar('MASTER_INDEX_TAG_OWNERS', Object.keys(tagOwners).length);
  log.envVar('MASTER_INDEX_CONNECTIONS', Object.keys(connections).length);
  log.envVar('MASTER_INDEX_OWNER_CONFLICTS', ownerConflicts.length);
  log.envVar('MASTER_INDEX_TAG_ALIASES', Object.keys(tagAliases).length);
}

/**
 * Detect AIMindVaults root by walking up from current file location.
 */
function detectAIMindVaultsRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
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

function stripFrontmatter(raw) {
  if (!/^---\s*\n/.test(raw)) return raw;
  const m = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  return m ? raw.slice(m[0].length) : raw;
}
