/**
 * AIMindVaults Visualization — UserConfig 정본 (단일 소스)
 *
 * 역할:
 *   UI 토글 + 색 + 두께 + 테마 + 레이아웃 등 사용자 설정 단일 localStorage 키 (`aimv_viz_user_config`).
 *   settings.js (편집 UI) · router.js (부트 + applyTheme) · theme.js (헤더 토글) · 페이지들이 공통 의존.
 *
 * Schema v2 (2026-05-25):
 *   - v1 → v2 마이그레이션: `theme` (단일 문자열) → `themeBase` + `themeOverrides` 분리 (시맨틱 테마 엔진).
 *   - 미지의 미래 버전 (v > 2) 은 migrate 가 null 반환 → loadUserConfig 가 defaultUserConfig 로 fallback.
 *
 * Default 필드:
 *   - colors / customPalette (PRESET_PALETTE 20색 builtin)
 *   - thicknessMultiplier / nodeMul / edgeMul / autoScale
 *   - toggles (chartA/B/C/kpiRow) / homeToggles (kpiHero/recentActivity/vizCards/exploreCards)
 *   - themeBase (light/dark/auto) / themeOverrides ({themeId: {var: value}})
 *   - wideLayout / topNTags / topNConcepts
 *
 * 주요 export:
 *   - STORAGE_KEY / SCHEMA_VERSION / PRESET_PALETTE  ← 상수
 *   - defaultUserConfig()             ← 기본값 (loadUserConfig 의 fallback)
 *   - loadUserConfig()                ← localStorage 읽기 + migrate + mergeWithDefaults
 *   - saveUserConfig(cfg)             ← JSON.stringify + localStorage.setItem
 *   - normalizeUserConfig(obj)        ← 외부 객체 (Import 파일) → 호환 cfg (실패 시 null)
 *
 * 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.lib
 */

export const STORAGE_KEY = 'aimv_viz_user_config';
export const SCHEMA_VERSION = 2;

// 차트 팔레트 기본 20색 (시안 09 hex). builtin = 사용자 삭제 불가.
export const PRESET_PALETTE = [
  { id: 'preset-01', name: 'Slate Blue',     hex: '#4e79a7', builtin: true },
  { id: 'preset-02', name: 'Burnt Orange',   hex: '#f28e2c', builtin: true },
  { id: 'preset-03', name: 'Coral Red',      hex: '#e15759', builtin: true },
  { id: 'preset-04', name: 'Teal',           hex: '#76b7b2', builtin: true },
  { id: 'preset-05', name: 'Forest Green',   hex: '#59a14f', builtin: true },
  { id: 'preset-06', name: 'Mustard',        hex: '#edc948', builtin: true },
  { id: 'preset-07', name: 'Mauve',          hex: '#b07aa1', builtin: true },
  { id: 'preset-08', name: 'Rose',           hex: '#ff9da7', builtin: true },
  { id: 'preset-09', name: 'Brown',          hex: '#9c755f', builtin: true },
  { id: 'preset-10', name: 'Warm Gray',      hex: '#bab0ac', builtin: true },
  { id: 'preset-11', name: 'Pastel Blue',    hex: '#a0cbe8', builtin: true },
  { id: 'preset-12', name: 'Pastel Orange',  hex: '#ffbe7d', builtin: true },
  { id: 'preset-13', name: 'Pastel Coral',   hex: '#f1adb5', builtin: true },
  { id: 'preset-14', name: 'Sky Blue',       hex: '#a7c7e7', builtin: true },
  { id: 'preset-15', name: 'Pastel Teal',    hex: '#86bcb6', builtin: true },
  { id: 'preset-16', name: 'Pastel Green',   hex: '#8cd17d', builtin: true },
  { id: 'preset-17', name: 'Pastel Yellow',  hex: '#f1ce63', builtin: true },
  { id: 'preset-18', name: 'Pastel Mauve',   hex: '#d4a6c8', builtin: true },
  { id: 'preset-19', name: 'Pastel Pink',    hex: '#fabfd2', builtin: true },
  { id: 'preset-20', name: 'Pastel Brown',   hex: '#d7b5a6', builtin: true },
];

export function defaultUserConfig() {
  return {
    schemaVersion: SCHEMA_VERSION,
    colors: {},
    customPalette: PRESET_PALETTE.map((p) => ({ ...p })),
    thicknessMultiplier: 1.0,
    nodeMul: 1.0,
    edgeMul: 1.0,
    autoScale: true,
    toggles: { chartA: true, chartB: true, chartC: true, kpiRow: true },
    homeToggles: { kpiHero: true, recentActivity: true, vizCards: true, exploreCards: true },
    themeBase: 'light',      // 구 theme 필드 (light|dark|auto|<내장테마id>)
    themeOverrides: {},      // { '<resolvedTheme>': { '--bg': '#..', ... } }
    wideLayout: false,
    topNTags: 20,
    topNConcepts: 30,
  };
}

/**
 * 저장본을 현재 schema 로 마이그레이션. 미지의 미래 버전은 null 반환(호출부 default).
 * 입력 객체를 직접 수정하므로 parse 결과나 사본을 넘긴다.
 */
function migrate(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  let v = Number(parsed.schemaVersion) || 1;
  if (v < 2) {
    // v1 → v2: theme → themeBase, themeOverrides 신설
    if (parsed.theme != null && parsed.themeBase == null) parsed.themeBase = parsed.theme;
    delete parsed.theme;
    if (!parsed.themeOverrides || typeof parsed.themeOverrides !== 'object') parsed.themeOverrides = {};
    v = 2;
  }
  if (v > SCHEMA_VERSION) return null;
  parsed.schemaVersion = SCHEMA_VERSION;
  return parsed;
}

function mergeWithDefaults(parsed) {
  const def = defaultUserConfig();
  return {
    ...def,
    ...parsed,
    toggles: { ...def.toggles, ...(parsed.toggles || {}) },
    homeToggles: { ...def.homeToggles, ...(parsed.homeToggles || {}) },
    themeOverrides: { ...(parsed.themeOverrides || {}) },
  };
}

export function loadUserConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultUserConfig();
    const parsed = migrate(JSON.parse(raw));
    if (!parsed) return defaultUserConfig();
    return mergeWithDefaults(parsed);
  } catch {
    return defaultUserConfig();
  }
}

export function saveUserConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('[user-config] save failed:', err);
  }
}

/** 외부 객체(import 파일 등)를 schema 호환 cfg 로 정규화. 실패 시 null. */
export function normalizeUserConfig(obj) {
  const parsed = migrate(obj && typeof obj === 'object' ? { ...obj } : null);
  if (!parsed) return null;
  return mergeWithDefaults(parsed);
}
