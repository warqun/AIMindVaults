/**
 * W1 — 데이터 로딩
 * spec § 3.2: loadIndex(opts: LoadIndexOpts): Promise<IndexData>
 *           validateIndex(data: IndexData): Promise<ValidationReport>
 *
 * 외부 의존성 0. ES Modules.
 * 브라우저(fetch) / Node(fs) 양쪽 지원.
 *
 * 시스템 Hub 필터링:
 *   master.vaults · master.notes 에서 BasicVaults 안 기본 제공 Hub/템플릿 (CoreHub,
 *   AIHubVault*, Basic*Vault) 를 제거한다. 사용자가 만든 커스텀 Hub 는 SYSTEM_HUB_IDS
 *   사전에 없으므로 자동 포함. calendar 의 /api/vault-births 는 server.js 가 raw
 *   master_index.json 을 직접 읽으므로 영향 없음 (Hub 생성 timeline 보존).
 */

import { SYSTEM_HUB_IDS } from './system-vaults.js';

/**
 *
 * @typedef {string} VaultId
 * @typedef {string} TagName
 *
 * @typedef {Object} VaultMeta
 * @property {string} path
 * @property {number} note_count
 * @property {TagName[]} domain_tags
 * @property {string} built
 *
 * @typedef {Object} NoteLite
 * @property {VaultId} vault_id
 * @property {string} title
 * @property {string} path
 * @property {string} type
 * @property {TagName[]} tags
 *
 * @typedef {Object} ConceptEntry
 * @property {VaultId[]} vaults
 * @property {number} count
 *
 * @typedef {Object} MasterIndex
 * @property {string} built
 * @property {number} vault_count
 * @property {number} note_count
 * @property {Record<VaultId, VaultMeta>} vaults
 * @property {NoteLite[]} notes
 * @property {Record<TagName, string[]>} tag_index
 * @property {Record<TagName, ConceptEntry>} concept_map
 *
 * @typedef {Object} VaultIndex
 * @property {VaultId} vault
 * @property {string} built
 * @property {Object[]} notes
 * @property {Record<TagName, string[]>} tag_index
 * @property {Record<string, string[]>} link_graph
 *
 * @typedef {Object} IndexData
 * @property {MasterIndex} master
 * @property {Record<VaultId, VaultIndex>=} vaults
 *
 * @typedef {Object} LoadIndexOpts
 * @property {string=} masterUrl
 * @property {string=} masterPath
 * @property {Record<VaultId, string>=} vaultUrls
 * @property {Record<VaultId, string>=} vaultPaths
 * @property {AbortSignal=} signal
 *
 * @typedef {Object} ValidationReport
 * @property {boolean} ok
 * @property {string[]} errors
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const isBrowser = typeof window !== 'undefined' && typeof fetch === 'function';

async function readJsonByUrl(url, signal) {
  const res = await fetch(url, { signal, cache: 'no-cache' });
  if (!res.ok) throw new Error(`loadIndex: HTTP ${res.status} for ${url}`);
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`loadIndex: JSON 파싱 실패 (${url}): ${e.message}`);
  }
}

/**
 * 시스템 Hub (BasicVaults 안 기본 제공 Hub/템플릿) 를 master 에서 제거.
 * vaults · notes · 카운트를 in-place 갱신. SYSTEM_HUB_IDS 사전 외 vault 는 보존.
 * @param {Object} master
 */
function filterSystemHubsInPlace(master) {
  if (!master) return;
  if (master.vaults && typeof master.vaults === 'object' && !Array.isArray(master.vaults)) {
    const filtered = {};
    for (const [id, meta] of Object.entries(master.vaults)) {
      if (!SYSTEM_HUB_IDS.has(id)) filtered[id] = meta;
    }
    master.vaults = filtered;
    master.vault_count = Object.keys(filtered).length;
  }
  if (Array.isArray(master.notes)) {
    master.notes = master.notes.filter((n) => {
      const vid = n?.vault || n?.vaultId || n?.vault_id;
      return vid && !SYSTEM_HUB_IDS.has(vid);
    });
    master.note_count = master.notes.length;
  }
}

async function readJsonByPath(filePath) {
  const { readFile } = await import('node:fs/promises');
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      throw new Error(`loadIndex: 파일 부재 (${filePath})`);
    }
    throw new Error(`loadIndex: 파일 읽기 실패 (${filePath}): ${e.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`loadIndex: JSON 파싱 실패 (${filePath}): ${e.message}`);
  }
}

/**
 * @param {LoadIndexOpts} opts
 * @returns {Promise<IndexData>}
 */
export async function loadIndex(opts = {}) {
  const { masterUrl, masterPath, vaultUrls, vaultPaths, signal } = opts;
  if (!masterUrl && !masterPath) {
    throw new Error('loadIndex: masterUrl 또는 masterPath 중 하나 필수');
  }

  const master = masterPath
    ? await readJsonByPath(masterPath)
    : await readJsonByUrl(masterUrl, signal);

  filterSystemHubsInPlace(master);

  /** @type {IndexData} */
  const data = { master };

  const vaultSources = vaultPaths || vaultUrls;
  if (vaultSources && Object.keys(vaultSources).length > 0) {
    const vaults = {};
    const useFs = !!vaultPaths;
    const entries = Object.entries(vaultSources);
    const results = await Promise.allSettled(
      entries.map(([id, src]) =>
        useFs ? readJsonByPath(src) : readJsonByUrl(src, signal)
      )
    );
    const failures = [];
    results.forEach((r, i) => {
      const [id] = entries[i];
      if (r.status === 'fulfilled') {
        vaults[id] = r.value;
      } else {
        failures.push(`${id}: ${r.reason.message}`);
      }
    });
    if (failures.length === entries.length) {
      throw new Error(`loadIndex: 모든 vault 인덱스 로딩 실패 — ${failures.join('; ')}`);
    }
    data.vaults = vaults;
  }

  return data;
}

/**
 * @param {IndexData} data
 * @returns {Promise<ValidationReport>}
 */
export async function validateIndex(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['validateIndex: data 가 객체 아님'] };
  }
  const { master } = data;
  if (!master || typeof master !== 'object') {
    return { ok: false, errors: ['validateIndex: master 누락'] };
  }
  for (const key of ['built', 'vault_count', 'note_count', 'vaults', 'notes', 'tag_index', 'concept_map']) {
    if (!(key in master)) errors.push(`master.${key} 누락`);
  }
  if (typeof master.built === 'string' && !ISO_DATE_RE.test(master.built)) {
    errors.push(`master.built ISO 형식 아님: ${master.built}`);
  }
  if (master.vaults && typeof master.vaults === 'object') {
    const actual = Object.keys(master.vaults).length;
    if (typeof master.vault_count === 'number' && master.vault_count !== actual) {
      errors.push(`vault_count 불일치: 선언 ${master.vault_count} vs 실제 ${actual}`);
    }
  }
  if (Array.isArray(master.notes) && typeof master.note_count === 'number' && master.note_count !== master.notes.length) {
    errors.push(`note_count 불일치: 선언 ${master.note_count} vs 실제 ${master.notes.length}`);
  }
  return { ok: errors.length === 0, errors };
}

export const __internal = { ISO_DATE_RE, isBrowser, readJsonByUrl, readJsonByPath };
