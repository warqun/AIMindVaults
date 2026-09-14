/**
 * 로컬 시각 포맷 유틸 (R190).
 *
 * `Date#toISOString()` 은 UTC 로 변환한다. 한국(UTC+9) 에서 로컬 00:00~08:59 에 만들어진
 * 파일은 UTC 기준 전날이 되어, 인덱스의 mtime/created 날짜가 하루 앞으로 밀린다.
 * 그 결과 viz 캘린더의 일자별 집계와 "그 날 갱신/생성된 노트" 목록이 어긋난다.
 * (2026-08-08 실측: 2,076 노트 중 1,416건 = 68% 가 하루 밀려 집계)
 *
 * 볼트의 날짜는 전부 사용자의 로컬 달력 기준이다 (프론트매터 `created`/`updated`,
 * 버전 로그, 백업 파일명 모두). 따라서 인덱스 타임스탬프도 로컬로 통일한다.
 */

const p2 = (n) => String(n).padStart(2, '0');

/**
 * 로컬 시각 기준 `YYYY-MM-DDTHH:MM:SS`.
 * 인덱스의 mtime/created/built 저장 포맷 — `toISOString().slice(0,19)` 의 로컬 대체재.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function localIso(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
    + `T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/**
 * 로컬 기준 `YYYY-MM-DD`. `toISOString().slice(0,10)` 의 로컬 대체재.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function localDate(d = new Date()) {
  return localIso(d).slice(0, 10);
}

/**
 * 로컬 기준 `YYYYMMDD` — 파일명·버전 태그용.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function localStamp(d = new Date()) {
  return localDate(d).replace(/-/g, '');
}
