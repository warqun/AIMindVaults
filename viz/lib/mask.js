/**
 * AIMindVaults Visualization — Vault Name Mask
 *
 * 역할:
 *   사용자 개인 볼트명을 시각화 표시 라벨에서만 마스킹 (디렉토리 rename 없이 화면 라벨 변경).
 *   network 페이지 노드 라벨 등에서 maskVaultName(vault_id) 호출.
 *
 * 매핑 사전 (VAULT_NAME_MASK):
 *   `{ vault_id: 'displayName' }` 형태 — 사용자 환경에 따라 다름 (F 카테고리 = 데이터 자체).
 *   배포 대상 파일이므로 SellingVault 배포 시 빈 객체 또는 일반 예시로 정리 필요.
 *   마스킹 종료 시 해당 항목 삭제 (디렉토리·태그·노트 본문은 별도 — 이 모듈은 라벨만).
 *
 * 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.lib + F 카테고리 (사용자 데이터)
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
