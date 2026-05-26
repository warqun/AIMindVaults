/**
 * AIMindVaults Visualization — 시맨틱 테마 엔진 (Phase 1)
 * Spec: Contents/Project/spec/20260525_viz_테마_엔진_설계.md
 *
 * data-theme(base) 위에 사용자 색 오버라이드 레이어를 setProperty 로 얹는다.
 * 인라인 스타일이 :root[data-theme=..] CSS 변수보다 우선하므로 즉시 반영된다.
 *
 * Phase 1 = 핵심 4그룹 (surface/text/accent/border, 12 변수).
 * category/rules 색은 Phase 4 에서 확장. 기존 코드 영향 0 인 독립 모듈.
 */

/** 커스텀 노출 대상 변수 — 그룹별 메타 (UI 색 편집기가 사용). */
export const THEME_VAR_GROUPS = [
  { group: 'surface', label: '표면', vars: [
    { name: '--bg', label: '배경' },
    { name: '--surface', label: '표면' },
    { name: '--surface-2', label: '표면 2' },
    { name: '--surface-hover', label: '표면 hover' },
  ] },
  { group: 'text', label: '텍스트', vars: [
    { name: '--text', label: '본문' },
    { name: '--text-2', label: '보조' },
    { name: '--text-3', label: '흐림' },
  ] },
  { group: 'accent', label: '액센트', vars: [
    { name: '--accent', label: '액센트' },
    { name: '--accent-bg', label: '액센트 배경' },
    { name: '--accent-fg', label: '액센트 전경' },
  ] },
  { group: 'border', label: '보더', vars: [
    { name: '--border', label: '보더' },
    { name: '--border-strong', label: '강한 보더' },
  ] },
];

/** 관리 대상 변수명 평탄화 목록. */
export const THEME_VAR_NAMES = THEME_VAR_GROUPS.flatMap((g) => g.vars.map((v) => v.name));

/** 내장 base 테마 id. Phase 3 에서 nord/solarized/high-contrast 추가. */
export const BUILTIN_BASES = ['light', 'dark', 'auto'];

export function isBuiltinBase(id) {
  return BUILTIN_BASES.includes(id);
}

/** base 테마 적용 — data-theme attribute. 'auto' 는 OS 설정 따라. */
export function applyBase(themeBase) {
  const root = document.documentElement;
  if (themeBase === 'auto') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', themeBase || 'light');
  }
}

/** 현재 적용된 data-theme (auto 해석 후 light|dark|<내장id>). */
export function resolvedTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * 변수의 base 기본값 — 인라인 override 를 임시 제거하고 computed 를 읽은 뒤 복원.
 * UI 색 편집기의 "초기값" 및 reset 표시용.
 */
export function baseValue(varName) {
  const root = document.documentElement;
  const had = root.style.getPropertyValue(varName);
  if (had) root.style.removeProperty(varName);
  const val = getComputedStyle(root).getPropertyValue(varName).trim();
  if (had) root.style.setProperty(varName, had);
  return val;
}

/** override 맵 일괄 적용 — 관리 대상 변수 전부 clear 후 주어진 것만 set. */
export function applyOverrides(overrides) {
  const root = document.documentElement;
  for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
  if (!overrides) return;
  for (const [name, val] of Object.entries(overrides)) {
    if (THEME_VAR_NAMES.includes(name) && val) root.style.setProperty(name, val);
  }
}

/** 단일 변수 override. */
export function setOverride(name, val) {
  if (THEME_VAR_NAMES.includes(name) && val) {
    document.documentElement.style.setProperty(name, val);
  }
}

/** 단일 변수 override 해제 → base 값 복원. */
export function clearOverride(name) {
  document.documentElement.style.removeProperty(name);
}

/** 전체 override 해제. */
export function clearAllOverrides() {
  for (const name of THEME_VAR_NAMES) document.documentElement.style.removeProperty(name);
}

/**
 * base + 해당 테마의 override 를 한 번에 적용.
 * @param {string} themeBase - 'light'|'dark'|'auto'|<내장id>
 * @param {Record<string, Record<string,string>>} themeOverrides - { themeId: { '--bg': '#..' } }
 */
export function applyTheme(themeBase, themeOverrides) {
  applyBase(themeBase);
  const theme = resolvedTheme();
  applyOverrides((themeOverrides && themeOverrides[theme]) || {});
}
