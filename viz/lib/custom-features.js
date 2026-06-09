/**
 * AIMindVaults Visualization — 커스텀 기능 정본 Registry (R164)
 *
 * 역할:
 *   사용자가 viz UI 에서 on/off 또는 수동 트리거하는 "커스텀 기능" 의 단일 소스.
 *   settings.js / server.js / scripts/list-custom-features.js 가 공통 import.
 *   새 커스텀 기능 추가 = `CUSTOM_FEATURES` 배열에 객체 1개 push 면 끝
 *   (단 action.endpoint 가 새 endpoint 면 server.js 에 endpoint 구현 필요).
 *
 * 데이터 흐름:
 *   - settings.js (custom-features-settings.js adapter 경유) — surfaces.type='settings-row' 항목 자동 렌더 + 핸들러 부착
 *   - server.js — `defaultsFromFeatures()` + `featureIdSet()` 로 기본값/whitelist 자동 구성
 *   - scripts/list-custom-features.js — registry 출력 + 코드 안 `@custom-feature` 주석 마커 grep cross-check
 *
 * Schema (JSDoc):
 *   @typedef {Object} CustomFeatureAction
 *   @property {string} buttonLabel        - 버튼 라벨 ("▶ 지금" 등)
 *   @property {string} title              - 버튼 title (hover tooltip)
 *   @property {string} endpoint           - server endpoint (예: '/api/viz-sync-now')
 *   @property {'POST'|'GET'} method       - HTTP method
 *   @property {string} [successToast]     - 2xx 응답 시 toast 메시지
 *   @property {string} [conflictToastKey] - 409 응답 body 의 메시지 키 (default: 'error')
 *   @property {string} [postSuccessHook]  - 알려진 후처리 hook 키워드 (adapter 가 매핑) — 예: 'restartSyncBanner'
 *
 *   @typedef {Object} CustomFeatureSurface
 *   @property {'settings-row'|'home-card'|'page-section'} type
 *   @property {string} [section]          - settings 의 어느 섹션인지 (예: 'custom-functions')
 *   @property {CustomFeatureAction} [action] - 토글 옆에 같이 노출되는 수동 액션 버튼
 *
 *   @typedef {Object} CustomFeature
 *   @property {string} id                 - viz-prefs.json key + DOM data-custom-feature
 *   @property {'toggle'|'action'|'composite'} category
 *   @property {string} addedIn            - 추가 시점 R 번호 (예: 'R163')
 *   @property {string} label              - 한국어 라벨 (영문화 시 별도 매핑)
 *   @property {string} sub                - 한국어 부가 설명
 *   @property {boolean} defaultValue      - 기본 상태 (toggle 일 때만 의미)
 *   @property {string} [toggleApplyHint]  - 토글 변경 시 toast 끝에 붙는 적용 시점 안내
 *   @property {CustomFeatureSurface[]} surfaces - 노출 위치 (다중 가능)
 *
 * 알려진 postSuccessHook 키워드 (adapter 가 매핑):
 *   - `restartSyncBanner` : `components/sync-banner.js` dynamic import + `startSyncBanner()` 호출
 *
 * 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.lib (R164 신규 — label/sub/toggleApplyHint/action.* 매핑 추가 필요)
 */

/** @type {CustomFeature[]} */
export const CUSTOM_FEATURES = [
  {
    id: 'gitAutoSync',
    category: 'composite',
    addedIn: 'R163',
    label: 'Git 동기화',
    sub: 'viz 시작 시 git pull --ff-only + sync-all 자동 (R146/R149). 토글 off 상태에서도 ▶ 로 수동 트리거 가능 — 진행은 우상단 banner.',
    defaultValue: true,
    toggleApplyHint: '다음 viz 실행부터 적용',
    surfaces: [
      {
        type: 'settings-row',
        section: 'custom-functions',
        action: {
          buttonLabel: '▶ 지금',
          title: '지금 한 번 수동 동기화',
          endpoint: '/api/viz-sync-now',
          method: 'POST',
          successToast: '동기화 시작 — 우상단 banner 에서 진행',
          postSuccessHook: 'restartSyncBanner',
        },
      },
    ],
  },
];

/** 빠른 id → feature 조회. */
export function featureById(id) {
  return CUSTOM_FEATURES.find((f) => f.id === id) ?? null;
}

/** server.js whitelist 용 — id set. */
export function featureIdSet() {
  return new Set(CUSTOM_FEATURES.map((f) => f.id));
}

/** server.js DEFAULT_VIZ_PREFS 의 feature 영역 자동 구성. */
export function defaultsFromFeatures() {
  const out = {};
  for (const f of CUSTOM_FEATURES) {
    if (f.category === 'toggle' || f.category === 'composite') {
      out[f.id] = !!f.defaultValue;
    }
  }
  return out;
}

/** 특정 surface type 에 노출되는 feature + 해당 surface 만 필터. */
export function featuresForSurface(surfaceType) {
  const out = [];
  for (const f of CUSTOM_FEATURES) {
    for (const s of f.surfaces) {
      if (s.type === surfaceType) {
        out.push({ feature: f, surface: s });
        break; // 같은 type 의 surface 가 한 feature 에 여러 개 박힌 경우는 향후 별도 처리
      }
    }
  }
  return out;
}
