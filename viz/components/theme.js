/**
 * AIMindVaults Visualization — Theme Toggle Component
 *
 * 역할:
 *   헤더의 ☀/☾ 토글 버튼 동작 + 부트 시점 1회 테마 적용 (initTheme).
 *   정본 = `user_config.themeBase` (light/dark/auto) + `themeOverrides[theme][var]` (시맨틱 색 override).
 *   theme-engine 이 base + override 합성해 CSS 변수 주입.
 *
 * 헤더 토글 동작:
 *   - 클릭 시 base 만 light ↔ dark 전환 (auto 는 토글 무시 — 다음 토글 시 resolvedTheme 의 반대).
 *   - 현재 테마의 themeOverrides 는 유지 (예: dark 에서 빨강 강조색 설정 → dark 다시 진입 시 빨강 유지).
 *   - `aimv:theme-changed` + `aimv:user-config-changed` 이벤트 dispatch — Settings 페이지 / 라우터 동기화.
 *
 * 레거시 마이그레이션:
 *   구 `aimv_viz_theme` localStorage 키 (단일 light/dark) 가 있으면 initTheme 에서 1회 흡수 →
 *   user_config.themeBase 에 복사 + 레거시 키 제거. 다음 부트 부터는 단일 정본.
 *
 * 주요 함수:
 *   - attachThemeButton(btn) → detach()    ← 헤더 토글 버튼 이벤트 부착 (호출자가 unmount 시 detach)
 *   - initTheme() → resolvedTheme           ← 부트 시 1회 — 레거시 흡수 + applyThemeEngine + setLabel
 *
 * 참조:
 *   Spec:    [[20260525_viz_테마_엔진_설계]]
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.13
 */

import { loadUserConfig, saveUserConfig } from '../lib/user-config.js';
import { applyTheme as applyThemeEngine, resolvedTheme } from '../lib/theme-engine.js';

const LEGACY_KEY = 'aimv_viz_theme';

const SUN_PATH = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
const MOON_PATH = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function setLabel() {
  const lbl = document.getElementById('theme-label');
  if (lbl) lbl.textContent = resolvedTheme();
}

/**
 * 헤더 또는 다른 컨테이너의 테마 토글 버튼에 연결.
 * @param {HTMLButtonElement} btn
 */
export function attachThemeButton(btn) {
  if (!btn) return;
  syncIcon(btn);
  const handler = () => {
    const cfg = loadUserConfig();
    const cur = resolvedTheme(); // light | dark (auto/내장테마는 해석값)
    const next = cur === 'dark' ? 'light' : 'dark';
    cfg.themeBase = next;
    saveUserConfig(cfg);
    applyThemeEngine(next, cfg.themeOverrides || {});
    syncIcon(btn);
    setLabel();
    // 다른 컴포넌트(헤더 아이콘) + Settings 페이지·라우터 동기화
    window.dispatchEvent(new CustomEvent('aimv:theme-changed', { detail: { theme: next } }));
    window.dispatchEvent(new CustomEvent('aimv:user-config-changed', { detail: { config: cfg } }));
  };
  btn.addEventListener('click', handler);
  return () => btn.removeEventListener('click', handler);
}

function syncIcon(btn) {
  const cur = resolvedTheme();
  const svg = btn.querySelector('svg');
  if (!svg) return;
  // 라이트 = ☀ (다음 클릭 시 dark) / 다크 = ☾ (다음 클릭 시 light)
  svg.innerHTML = cur === 'dark' ? MOON_PATH : SUN_PATH;
}

/** 부트 시 1회 호출 — user_config 로드(+레거시 키 흡수) 후 base+override 적용. */
export function initTheme() {
  const cfg = loadUserConfig();
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      cfg.themeBase = legacy;
      saveUserConfig(cfg);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // ignore
  }
  applyThemeEngine(cfg.themeBase || 'light', cfg.themeOverrides || {});
  setLabel();
  return resolvedTheme();
}
