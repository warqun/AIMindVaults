/**
 * AIMindVaults Visualization — Common Header (W1)
 * Spec § 3.1 — brand 모드 (홈) / crumb-back 모드 (다른 페이지) + meta + theme/settings 버튼.
 *
 * mountHeader(container, opts) → { update(opts), destroy() }
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
