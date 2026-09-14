/**
 * AIMindVaults Visualization — 커스텀 기능 router adapter (R193)
 *
 * 역할:
 *   `custom-features.js` registry 중 `surfaces.type === 'page'` 인 항목을 router 가 쓰는
 *   형태로 변환. router.js / components/header.js / pages/home.js 가 본 모듈만 import 하면
 *   커스텀 페이지가 자동으로 붙는다 — **새 커스텀 페이지 추가 = registry 에 객체 1개 push**.
 *
 *   R164 의 settings adapter (`custom-features-settings.js`) 와 같은 층. registry 는 정본,
 *   adapter 는 표면별 변환만 한다.
 *
 * 왜 필요했나:
 *   R164 시점에 surface 타입으로 `page-section` 이 JSDoc 에 선언돼 있었지만 **어댑터 구현이
 *   없어 실제로는 `settings-row` 만 동작**했다. 컬렉션 기능이 "core 내장 페이지로 박지 말고
 *   커스텀 기능으로" 라는 요구를 받으면서 이 공백을 메운다.
 *
 * 페이지 모듈 계약:
 *   `pages/<page>.js` 가 router 표준 시그니처를 따라야 한다 —
 *   `export async function initPage(container, data, userConfig): Promise<PageContext>`
 *   router 의 `loadPageModule()` 이 `./pages/${pageId}.js` 를 그대로 dynamic import 하므로
 *   별도 등록 경로는 없다.
 *
 * @custom-feature: collections
 */

import { featuresForSurface } from './custom-features.js';

/**
 * 커스텀 페이지 목록.
 * @returns {{ id: string, title: string, featureId: string, homeCard: boolean, sub: string }[]}
 */
export function customPages() {
  return featuresForSurface('page')
    .filter(({ surface }) => typeof surface.page === 'string' && surface.page)
    .map(({ feature, surface }) => ({
      id: surface.page,
      title: surface.title || feature.label || surface.page,
      featureId: feature.id,
      homeCard: !!surface.homeCard,
      sub: feature.sub || '',
    }));
}

/** router VALID_PAGES 병합용 — 커스텀 페이지 hash id 배열. */
export function customPageIds() {
  return customPages().map((p) => p.id);
}

/** router/header PAGE_TITLES 병합용 — `{ [id]: title }`. */
export function customPageTitles() {
  const out = {};
  for (const p of customPages()) out[p.id] = p.title;
  return out;
}

/** 홈 카드 노출 대상만. */
export function customHomeCards() {
  return customPages().filter((p) => p.homeCard);
}
