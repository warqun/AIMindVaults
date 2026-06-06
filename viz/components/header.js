/**
 * AIMindVaults Visualization — Common Header (W1)
 *
 * 역할:
 *   모든 페이지 상단에 mount 되는 공통 헤더. 홈에서는 brand 모드 (로고 + 타이틀), 다른 페이지에서는
 *   crumb-back 모드 (← 홈 / 부모 페이지 / 현재 페이지) + 우측 meta (built / live 인디케이터) +
 *   theme 토글 버튼 + Settings 진입 버튼.
 *
 * 두 모드:
 *   - 홈 (pageId === 'home') : brand 모드 — "AIMindVaults Visualization"
 *   - 외 페이지              : crumb-back 모드 — `← 홈 / [부모…] / 현재 페이지`
 *
 * Nested crumb:
 *   PAGE_PARENTS 가 페이지 → 부모 매핑 정의 (예: additions ← calendar). 부모 chain 거슬러 표시.
 *
 * Live indicator:
 *   setLiveState('open' | 'error' | 'connecting') — router.js SSE 상태 반영.
 *
 * 주요 함수:
 *   - mountHeader(container, opts)  ← 진입점, render + 반환 { update, setBuilt, setLiveState, destroy }
 *   - buildCrumbHtml                ← nested crumb chain HTML
 *
 * PAGE_TITLES_LOCAL:
 *   router.js 의 PAGE_TITLES 와 동기 필요 — 페이지 추가 시 양쪽 갱신.
 *
 * 표준 시그니처:
 *   export function mountHeader(container, opts): { update(opts), setBuilt(s), setLiveState(s), destroy() }
 *
 * 참조:
 *   Spec:    [[20260513_시스템스펙_04_시각화]] § 5 / Phase 2.5 § 3.1
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.11
 */

import { attachThemeButton } from './theme.js';

const SETTINGS_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const THEME_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"></svg>`;

// 페이지 부모 매핑 — nested crumb 표시 (예: additions 는 calendar 의 하위)
const PAGE_PARENTS = {
  additions: 'calendar',
  // 향후 nested 페이지 추가
};

// header 자체 lookup 용 (router.js 의 PAGE_TITLES 와 동기화 필요)
const PAGE_TITLES_LOCAL = {
  home: '홈',
  connections: '커넥션',
  network: '멀티볼트 그래프',
  distribution: '노트 데이터 분석',
  tags: '태그 탐색기',
  explorer: 'Vault 탐색기',
  rules: 'AI 룰·스킬',
  settings: 'Settings',
  calendar: '캘린더 작업량',
  additions: '날짜별 추가 항목',
};

/** PAGE_PARENTS 체인을 거슬러 nested crumb HTML 빌드 — `← 홈 / [부모…] / 현재`. */
function buildCrumbHtml(pageId, pageTitle) {
  // parent chain 거슬러 빌드
  const chain = [];
  let cur = pageId;
  while (PAGE_PARENTS[cur]) {
    cur = PAGE_PARENTS[cur];
    chain.unshift({ id: cur, title: PAGE_TITLES_LOCAL[cur] || cur });
  }
  let html = `<div class="crumb"><a href="#home" class="crumb-back">← 홈</a>`;
  for (const c of chain) {
    if (c.id === 'home') continue;
    html += `<span class="sep">/</span><a href="#${escapeHtml(c.id)}" class="crumb-back">${escapeHtml(c.title)}</a>`;
  }
  html += `<span class="sep">/</span><span class="here">${escapeHtml(pageTitle || pageId)}</span></div>`;
  return html;
}

/**
 * 헤더 컨테이너에 mount. opts.pageId === 'home' 이면 brand 모드, 외 페이지면 crumb 모드.
 * theme 버튼 + Settings 버튼 자동 부착. 반환 객체로 update/setBuilt/setLiveState/destroy 제공.
 *
 * @param {HTMLElement} container
 * @param {{ pageId: string, pageTitle?: string, built?: string }} opts
 */
export function mountHeader(container, opts) {
  if (!container) throw new Error('mountHeader: container required');
  let detachTheme = null;

  const render = (curOpts) => {
    const { pageId, pageTitle, built } = curOpts;
    const isHome = pageId === 'home';
    const left = isHome
      ? `<div class="brand"><span class="mark"></span><span>AIMindVaults Visualization</span></div>`
      : buildCrumbHtml(pageId, pageTitle);
    container.innerHTML = `
      ${left}
      <div class="header-meta">
        <span data-role="built">${built ? `built ${escapeHtml(built)}` : ''}</span>
        <span class="live" data-role="live">live</span>
        <button class="icon-btn" data-action="theme-toggle" title="테마 전환" aria-label="테마 전환">${THEME_ICON_SVG}</button>
        <button class="icon-btn" data-action="settings" title="Settings" aria-label="Settings">${SETTINGS_ICON_SVG}</button>
      </div>
    `;
    if (detachTheme) detachTheme();
    detachTheme = attachThemeButton(container.querySelector('[data-action="theme-toggle"]'));
    const settingsBtn = container.querySelector('[data-action="settings"]');
    if (settingsBtn) settingsBtn.addEventListener('click', () => { window.location.hash = '#settings'; });
  };

  render(opts);

  return {
    update(newOpts) {
      render({ ...opts, ...newOpts });
      Object.assign(opts, newOpts);
    },
    setBuilt(built) {
      const el = container.querySelector('[data-role="built"]');
      if (el) el.textContent = built ? `built ${built}` : '';
    },
    setLiveState(state) {
      const el = container.querySelector('[data-role="live"]');
      if (!el) return;
      if (state === 'open') {
        el.textContent = 'live';
        el.style.color = 'var(--accent)';
      } else if (state === 'error') {
        el.textContent = 'offline';
        el.style.color = 'var(--text-3)';
      } else {
        el.textContent = 'connecting';
        el.style.color = 'var(--text-3)';
      }
    },
    destroy() {
      if (detachTheme) detachTheme();
      container.innerHTML = '';
    },
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
