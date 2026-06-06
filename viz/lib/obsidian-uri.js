/**
 * AIMindVaults Visualization — Obsidian URI Handler (R120)
 *
 * 역할:
 *   viz 내 "Obsidian 으로 열기" 버튼 클릭 시 obsidian:// URI 호출. 모든 페이지가 위임으로 사용.
 *
 * 두 URI 패턴:
 *   - openVault(vaultName)             → `obsidian://open?vault=<name>`
 *   - openNote(vaultName, filepath)    → `obsidian://advanced-uri?vault=<name>&filepath=<path>`
 *     (advanced-uri 플러그인 필요 — Obsidian 에서 enable 필수)
 *
 * URI 예약문자 (`#`, `%`, `&`, `?`, `+`) 처리:
 *   포함 시 alert 안내 — Obsidian URI 구조적 한계로 인해 리네이밍 후 재시도 필요.
 *   (현재 일반 URI escape 로 우회 불가능 — Obsidian 측 한계)
 *
 * 사용자 노출 alert 메시지 (UI):
 *   "볼트 이름 누락", "URI 예약문자 포함", "파일 경로 누락" 등 — § 6.lib 카탈로그 참조.
 *
 * 환경 독립성:
 *   절대경로 / vault 이름 박힘 0. vaultName 은 호출자가 동적 추출 (master_index.json).
 *
 * 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.lib
 */

const URI_RESERVED = /[#%&?+]/;

function hasReservedChars(s) {
  return URI_RESERVED.test(String(s ?? ''));
}

function encodePathSegments(filepath) {
  // segment 별 encode — `/` 는 path separator 로 보존
  return String(filepath || '')
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function stripMdExt(filepath) {
  return String(filepath || '').replace(/\.md$/i, '');
}

export function openVault(vaultName) {
  if (!vaultName) {
    alert('볼트 이름 누락 — 열 수 없습니다.');
    return;
  }
  if (hasReservedChars(vaultName)) {
    alert(`볼트 이름에 URI 예약문자 (# % & ? +) 포함 — Obsidian 에서 리네이밍 후 재시도.\n볼트: ${vaultName}`);
    return;
  }
  const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  window.location.href = uri;
}

export function openNote(vaultName, filepath) {
  if (!vaultName || !filepath) {
    alert('볼트 이름 또는 파일 경로 누락 — 열 수 없습니다.');
    return;
  }
  if (hasReservedChars(vaultName) || hasReservedChars(filepath)) {
    alert(`경로에 URI 예약문자 (# % & ? +) 포함 — Obsidian 에서 리네이밍 후 재시도.\n${vaultName} / ${filepath}`);
    return;
  }
  const enc = encodePathSegments(stripMdExt(filepath));
  const uri = `obsidian://advanced-uri?vault=${encodeURIComponent(vaultName)}&filepath=${enc}`;
  window.location.href = uri;
}

// 테스트용 internal exports
export const __internal = { hasReservedChars, encodePathSegments, stripMdExt };
