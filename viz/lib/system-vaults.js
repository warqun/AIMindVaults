/**
 * 시스템 Hub 식별 — 시각화 표시 필터링 전용.
 *
 * BasicVaults 폴더에 기본 제공되는 시스템 Hub 와 템플릿 볼트는
 * vault 레지스트리에는 등록되지만 콘텐츠 시각화 (노트·태그·그래프) 에서는 제외한다.
 * 사용자가 `/create-preset-hub` 등으로 만든 커스텀 Hub 는 ID 사전에 없으므로
 * 자동으로 사용자 Hub 로 분류되어 시각화에 포함된다.
 *
 * 예외: calendar 의 `/api/vault-births` (Hub 생성 timeline) 은 시스템 Hub 도
 * 표시한다 — Hub 가 언제 추가됐는지 메타 정보는 시각화 가치가 있다.
 */

export const SYSTEM_HUB_IDS = new Set([
  'CoreHub',
  'AIHubVault',
  'AIHubVault_Minimal',
  'AIHubVault_Domain',
  'AIHubVault_Lab',
  'AIHubVault_Project',
  'AIHubVault_Diary',
  'BasicContentsVault',
  'BasicDomainVault',
  'BasicLabVault',
  'BasicProjectVault',
  'BasicDiaryVault',
]);

/**
 * @param {string} vaultId
 * @returns {boolean}
 */
export function isSystemVault(vaultId) {
  return SYSTEM_HUB_IDS.has(vaultId);
}

/**
 * vault id 목록에서 시스템 Hub 제외.
 * @param {string[]} vaultIds
 * @returns {string[]}
 */
export function filterUserVaults(vaultIds) {
  if (!Array.isArray(vaultIds)) return [];
  return vaultIds.filter((id) => !SYSTEM_HUB_IDS.has(id));
}

/**
 * 노트 배열에서 시스템 Hub 노트 제외.
 * 노트는 `vault` · `vaultId` · `vault_id` 필드 중 하나를 가진다고 가정.
 * 예: server.js `/api/all-notes` 응답은 `vault_id` 사용 (R134 fix).
 * @param {object[]} notes
 * @returns {object[]}
 */
export function filterUserNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.filter((n) => {
    const vid = n?.vault || n?.vaultId || n?.vault_id;
    return vid && !SYSTEM_HUB_IDS.has(vid);
  });
}

/**
 * master_index.vaults 객체에서 시스템 Hub 키 제외.
 * @param {Object<string, object>} vaultsMap
 * @returns {Object<string, object>}
 */
export function filterUserVaultsMap(vaultsMap) {
  if (!vaultsMap || typeof vaultsMap !== 'object') return {};
  const out = {};
  for (const [vid, meta] of Object.entries(vaultsMap)) {
    if (!SYSTEM_HUB_IDS.has(vid)) out[vid] = meta;
  }
  return out;
}

/**
 * 메타 노트 type 사전 — calendar/home/additions 등에서 시각화 제외.
 * 메타 노트는 frontmatter.created 가 없어 birthtime (NTFS) 또는 frontmatter.updated 로
 * 응축되는 경향 (R138/R139 진단). 시각화 측에서 type 필터링하여 응축 해소.
 *
 * 옵션 b 결정 (사용자 2026-05-27): "데이터 수집방식과 형식을 바꾸는 것은 무리,
 * 시각화 측에 필터가 맞겠음"
 */
export const META_NOTE_TYPES = new Set([
  'folder-index',  // Project.md / Domain.md
  'standard',      // CONTENTS_AI_RULES.md / CONTENTS_GLOSSARY.md
]);

/**
 * 메타 노트 path 패턴 — type 만으로 안 잡히는 시드/공통 노트.
 */
export const META_NOTE_PATH_PATTERNS = [
  /\/Juggl_StyleGuide\//,             // 3-04 시드 응축 (updated=2026-03-04 공통)
  /\/CONTENTS_[^/]+\.md$/,            // CONTENTS_AI_RULES.md 등 (type 으로도 잡힘, 안전망)
  /\/Domain\.md$/,                    // folder-index path 보강
  /\/Project\.md$/,                   // folder-index path 보강
];

/**
 * 노트가 메타 노트인지 판정 (type 또는 path 기준).
 * @param {object} note — { type, path, ... }
 * @returns {boolean}
 */
export function isMetaNote(note) {
  if (!note) return false;
  if (META_NOTE_TYPES.has(note.type)) return true;
  const p = note.path || '';
  for (const re of META_NOTE_PATH_PATTERNS) {
    if (re.test(p)) return true;
  }
  return false;
}

/**
 * 노트 배열에서 메타 노트 제외 (R141 옵션 b).
 * @param {object[]} notes
 * @returns {object[]}
 */
export function filterMetaNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.filter((n) => !isMetaNote(n));
}

/**
 * 시각화에 표시할 노트 — 시스템 Hub + 메타 노트 둘 다 제외 (R134 + R141 chain).
 * calendar / home / additions 의 표준 진입점.
 * @param {object[]} notes
 * @returns {object[]}
 */
export function filterVisibleNotes(notes) {
  return filterMetaNotes(filterUserNotes(notes));
}
