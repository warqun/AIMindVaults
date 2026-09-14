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
 *   - router.js (custom-features-router.js adapter 경유) — surfaces.type='page' 항목을 VALID_PAGES/PAGE_TITLES 에 자동 병합 (R193)
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
 *   @property {'settings-row'|'page'|'home-card'|'page-section'} type
 *   @property {string} [page]            - type='page' 일 때 hash id (`#collections`) 겸 `pages/<page>.js` 모듈명
 *   @property {string} [title]           - type='page' 일 때 헤더·네비 표시 제목
 *   @property {boolean} [homeCard]       - type='page' 일 때 홈 카드 목록에 노출할지
 *   @property {string} [section]          - settings 의 어느 섹션인지 (예: 'custom-functions')
 *   @property {CustomFeatureAction} [action] - 토글 옆에 같이 노출되는 수동 액션 버튼
 *
 *   @typedef {Object} CustomFeature
 *   @property {string} id                 - viz-prefs.json key + DOM data-custom-feature
 *   @property {'toggle'|'action'|'composite'|'page'} category
 *   @property {string} addedIn            - 추가 시점 R 번호 (예: 'R163')
 *   @property {string} label              - 한국어 라벨 (영문화 시 별도 매핑)
 *   @property {string} sub                - 한국어 부가 설명
 *   @property {boolean} defaultValue      - 기본 상태 (toggle 일 때만 의미)
 *   @property {string} [toggleApplyHint]  - 토글 변경 시 toast 끝에 붙는 적용 시점 안내
 *   @property {string} [statusEndpoint]  - 읽기 전용 현황 GET endpoint (R204). 응답을 sub 안
 *                                          `[data-feature-status="<id>"]` 에 렌더한다.
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
  {
    id: 'collections',
    category: 'page',
    addedIn: 'R193',
    label: '컬렉션',
    sub: '즐겨찾기 + 노트 묶음. 자주 여는 노트를 모아 두고 viz 에서 바로 연다. 정의는 루트 `_collections.json` (git 추적) 이라 디바이스 간 자동 정합.',
    defaultValue: true,
    surfaces: [
      {
        type: 'page',
        page: 'collections',
        title: '컬렉션',
        homeCard: true,
      },
    ],
  },
  {
    id: 'discordTrigger',
    category: 'toggle',
    addedIn: 'R203',
    label: '무인 인박스 실행',
    sub: '디스코드 #inbox 에서 ▶️ 를 누르면 인박스 항목 1건을 무인 처리 (R200). off 여도 적재(📥)는 계속된다 — 적재까지 끄면 폰에서 다시 켤 명령을 읽을 수단이 없다. 폰 `!trigger on/off` · 이 토글이 같은 값을 본다.<br><span data-feature-status="discordTrigger" style="opacity:.75">현황 확인 중...</span>',
    defaultValue: true,
    toggleApplyHint: '다음 폴링(최대 5분)부터 적용',
    statusEndpoint: '/api/inbox-status',
    surfaces: [
      { type: 'settings-row', section: 'custom-functions' },
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
