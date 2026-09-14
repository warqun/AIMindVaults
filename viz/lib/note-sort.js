/**
 * 노트 목록 정렬 + 시각 표기 공용 모듈 (R187).
 *
 * calendar 일별 영역과 additions notes view 가 같은 정렬 기준을 공유한다.
 *
 * 정렬 모드:
 *   - recent    : 기준 시각 내림차순 (최신 먼저). 동시각은 mtime → 제목 순으로 tie-break.
 *   - catTitle  : 카테고리명 → 제목 오름차순 (ko locale, 가나다/A-Z).
 *
 * 시각 표기:
 *   frontmatter `created: YYYY-MM-DD` 는 인덱서가 `...T00:00:00` 으로 정규화한다 (시각 정보 없음).
 *   이걸 "00:00" 으로 그리면 자정 생성으로 오독되므로 `—` 로 표기한다.
 */

export const SORTS = ['recent', 'catTitle'];
export const SORT_LABELS = { recent: '최신순', catTitle: '카테고리·제목순' };
export const DEFAULT_SORT = 'recent';

/** basis 에 해당하는 타임스탬프. 없으면 반대 필드로 fallback. */
export function stampOf(note, basis) {
  if (!note) return '';
  return (basis === 'created'
    ? (note.created || note.mtime)
    : (note.mtime || note.created)) || '';
}

/**
 * 'HH:MM' 또는 '—'. 시각 정보가 없는 날짜-온리 스탬프는 '—'.
 * @param {string} stamp ISO 문자열
 */
export function timeLabel(stamp) {
  if (!stamp) return '—';
  const s = String(stamp);
  if (/T00:00:00$/.test(s)) return '—';
  const m = s.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

function titleOf(note) {
  return note?.title || (note?.path || '').split('/').pop() || '';
}

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

/**
 * 노트 배열 정렬 (원본 불변 — 새 배열 반환).
 * @param {object[]} notes
 * @param {'recent'|'catTitle'} sort
 * @param {'mtime'|'created'} basis
 * @param {Record<string,string>} [vaultCatMap] catTitle 모드에서 카테고리 해석에 사용
 */
export function sortNotes(notes, sort, basis, vaultCatMap = {}) {
  const list = Array.isArray(notes) ? [...notes] : [];
  if (sort === 'catTitle') {
    return list.sort((a, b) => {
      const ca = vaultCatMap[a?.vault_id] || 'unknown';
      const cb = vaultCatMap[b?.vault_id] || 'unknown';
      if (ca !== cb) return collator.compare(ca, cb);
      return collator.compare(titleOf(a), titleOf(b));
    });
  }
  return list.sort((a, b) => {
    const sa = stampOf(a, basis);
    const sb = stampOf(b, basis);
    if (sa !== sb) return sb.localeCompare(sa);
    const ma = a?.mtime || '';
    const mb = b?.mtime || '';
    if (ma !== mb) return mb.localeCompare(ma);
    return collator.compare(titleOf(a), titleOf(b));
  });
}

/** 카테고리 그룹 배열 정렬. recent = 노트 많은 순, catTitle = 카테고리명 순. */
export function sortGroups(groups, sort) {
  const list = Array.isArray(groups) ? [...groups] : [];
  if (sort === 'catTitle') return list.sort((a, b) => collator.compare(a.cat, b.cat));
  return list.sort((a, b) => b.notes.length - a.notes.length);
}
