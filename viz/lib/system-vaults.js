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
