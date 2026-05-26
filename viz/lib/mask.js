/**
 * 사용자 개인 볼트명 마스킹 — 시각화 표시 전용.
 * 디렉토리 rename 없이 화면에서만 다른 이름으로 보이게 함.
 *
 * 마스킹 종료 시 VAULT_NAME_MASK 의 해당 항목 삭제.
 * 디렉토리·태그·노트 본문은 별도 (이 모듈은 시각화 라벨만 변경).
 */

export const VAULT_NAME_MASK = {
  JissouGame: 'IndieGame',
};

/**
 * vault id 를 표시명으로 변환. 매핑 없으면 원본 그대로.
 * @param {string} id
 * @returns {string}
 */
export function maskVaultName(id) {
  if (!id) return id;
  return VAULT_NAME_MASK[id] || id;
}
