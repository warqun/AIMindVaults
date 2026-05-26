/**
 * AIMindVaults Visualization — Theme toggle component
 * 정본 = user_config(themeBase + themeOverrides). theme-engine 으로 base+override 적용.
 *
 * 구 aimv_viz_theme 별도 키는 initTheme 에서 1회 흡수 후 제거(레거시 마이그레이션).
 * 헤더 토글은 base 만 light↔dark 전환하고 현재 테마의 override 는 유지한다.
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
