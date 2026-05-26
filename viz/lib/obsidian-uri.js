/**
 * Obsidian URI 핸들러 (R120 viz 노트/볼트 열기 트랙).
 *
 * - openVault(vaultName)         → obsidian://open?vault=<name>
 * - openNote(vaultName, filepath) → obsidian://advanced-uri?vault=<name>&filepath=<path>
 *
 * URI 예약문자 (`#`, `%`, `&`, `?`, `+`) 포함 시 alert 안내 (Obsidian URI 구조적 한계).
 *
 * 환경 독립성 § 3 A4 — 절대경로 / vault 이름 박힘 0. master_index.json 동적 추출.
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
