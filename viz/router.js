/**
 * AIMindVaults Visualization — Router (W1)
 * Spec § 4 — vanilla JS hashchange + dynamic import + EventSource SSE.
 *
 * 페이지 매핑 (§ 4.2):
 *   #home / (빈)   → pages/home.js
 *   #connections   → pages/connections.js (Phase 5, 구 concepts)
 *   #concepts      → #connections 자동 redirect (1세대 북마크 호환)
 *   #network       → pages/network.js    (W3)
 *   #distribution  → pages/distribution.js (W4)
 *   #tags          → pages/tags.js       (W4)
 *   #explorer      → pages/explorer.js   (W5)
 *   #rules         → pages/rules.js      (W5)
 *   #settings      → pages/settings.js   (W5)
 *
 * 페이지 모듈 표준:
 *   export async function initPage(container, data, userConfig): Promise<PageContext>
 *   PageContext = { destroy(), refresh?(data) }
 */

import { loadIndex, validateIndex } from './lib/loadIndex.js';
import { mountHeader } from './components/header.js';
import { initTheme } from './components/theme.js';
import { loadUserConfig } from './lib/user-config.js';
import { applyTheme as applyThemeEngine } from './lib/theme-engine.js';

const VALID_PAGES = ['home', 'connections', 'network', 'distribution', 'tags', 'explorer', 'rules', 'settings', 'calendar', 'additions'];
const PAGE_TITLES = {
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

const state = {
  pageRoot: null,
  headerCtl: null,
  currentPage: null,        // string id
  currentContext: null,     // PageContext
  data: null,               // IndexData
  userConfig: null,
  sse: null,
};

/* ───────────── UserConfig 정본 = lib/user-config.js ───────────── */

/** html[data-layout] 갱신 — settings 페이지 토글 + 진입 시 동기. */
function applyLayout(cfg) {
  document.documentElement.setAttribute('data-layout', cfg && cfg.wideLayout ? 'wide' : 'normal');
}

/* ───────────── Page lifecycle ───────────── */
function parseHash() {
  // hash 형식: #page 또는 #page?key=val&... (page 단위만 추출, 쿼리는 페이지 자체 파싱)
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  if (!raw) return 'home';
  const pageId = raw.split('?')[0];
  // 1세대 호환 — #concepts 북마크 자동 redirect → #connections
  if (pageId === 'concepts') {
    const rest = raw.slice('concepts'.length);
    try { window.history.replaceState(null, '', `#connections${rest}`); } catch (_) { /* noop */ }
    return 'connections';
  }
  return VALID_PAGES.includes(pageId) ? pageId : 'home';
}

async function loadPageModule(pageId) {
  const url = `./pages/${pageId}.js`;
  try {
    return await import(url);
  } catch (err) {
    console.warn(`[router] pages/${pageId}.js dynamic import 실패:`, err.message);
    return null;
  }
}

function showPlaceholder(message) {
  state.pageRoot.innerHTML = `<div class="page-placeholder">${escapeHtml(message)}</div>`;
}

function showError(message) {
  state.pageRoot.innerHTML = `<div class="page-error">${escapeHtml(message)}</div>`;
}

async function activatePage(pageId) {
  // 같은 페이지면 destroy/init 스킵 — 페이지 내부 hash 쿼리 변경 (예: #additions?date=...) 은 페이지 자체 hashchange 리스너가 처리
  if (state.currentPage === pageId && state.currentContext) return;

  // 1. destroy 이전 페이지
  if (state.currentContext && typeof state.currentContext.destroy === 'function') {
    try { state.currentContext.destroy(); } catch (err) { console.warn('[router] previous destroy failed:', err); }
  }
  state.currentContext = null;

  state.currentPage = pageId;
  if (state.headerCtl) {
    state.headerCtl.update({ pageId, pageTitle: PAGE_TITLES[pageId] });
  }

  // 2. 페이지 슬롯 비우기 + placeholder
  showPlaceholder(`loading ${pageId}…`);

  // 3. 페이지 모듈 dynamic import
  const mod = await loadPageModule(pageId);
  if (!mod) {
    showPlaceholder(`pages/${pageId}.js 미구현 (Phase 2.5 다른 워커 산출 대기)`);
    return;
  }
  if (typeof mod.initPage !== 'function') {
    showError(`pages/${pageId}.js 에 initPage export 없음`);
    return;
  }

  // 4. initPage 호출 — 빈 컨테이너 전달 (페이지가 자유롭게 채움)
  state.pageRoot.innerHTML = '';
  try {
    const ctx = await mod.initPage(state.pageRoot, state.data, state.userConfig);
    state.currentContext = ctx || { destroy() {} };
  } catch (err) {
    console.error(`[router] initPage(${pageId}) failed:`, err);
    showError(`pages/${pageId} initPage 실패: ${err.message}`);
  }
}

/* ───────────── SSE — data-changed → reload + refresh ───────────── */
function attachSSE() {
  let es;
  try {
    es = new EventSource('/sse');
  } catch (err) {
    console.error('[router] EventSource 초기화 실패:', err);
    return;
  }
  state.sse = es;
  es.addEventListener('open', () => {
    if (state.headerCtl) state.headerCtl.setLiveState('open');
  });
  es.addEventListener('error', () => {
    if (state.headerCtl) state.headerCtl.setLiveState('error');
  });
  es.addEventListener('hello', (ev) => console.debug('[sse] hello', ev.data));
  es.addEventListener('heartbeat', (ev) => console.debug('[sse] heartbeat', ev.data));
  es.addEventListener('data-changed', async (ev) => {
    console.debug('[sse] data-changed', ev.data);
    try {
      state.data = await loadIndex({ masterUrl: '/data/master_index.json' });
      if (state.headerCtl) state.headerCtl.setBuilt(state.data.master.built);
      const ctx = state.currentContext;
      if (ctx && typeof ctx.refresh === 'function') {
        try { ctx.refresh(state.data); } catch (err) { console.warn('[router] refresh failed:', err); }
      }
    } catch (err) {
      console.error('[router] reload after data-changed failed:', err);
    }
  });
}

/* ───────────── Public API ───────────── */
export async function init() {
  state.pageRoot = document.getElementById('page-root');
  if (!state.pageRoot) throw new Error('[router] #page-root 누락');
  const headerEl = document.getElementById('app-header');
  if (!headerEl) throw new Error('[router] #app-header 누락');

  initTheme();
  state.userConfig = loadUserConfig();
  applyLayout(state.userConfig);

  // settings 페이지에서 wideLayout 토글 시 즉시 반영 (broadcastChange 이벤트)
  window.addEventListener('aimv:user-config-changed', (ev) => {
    if (ev?.detail?.config) {
      state.userConfig = ev.detail.config;
      applyLayout(state.userConfig);
      applyThemeEngine(state.userConfig.themeBase || 'light', state.userConfig.themeOverrides || {});
    }
  });

  state.headerCtl = mountHeader(headerEl, { pageId: parseHash(), pageTitle: PAGE_TITLES[parseHash()] });

  // 1) 데이터 1회 로드
  try {
    state.data = await loadIndex({ masterUrl: '/data/master_index.json' });
    const report = await validateIndex(state.data);
    if (!report.ok) console.warn('[router] validateIndex errors:', report.errors);
    state.headerCtl.setBuilt(state.data.master.built);
  } catch (err) {
    console.error('[router] 초기 loadIndex 실패:', err);
    showError(`master_index.json 로드 실패: ${err.message}\n서버가 실행 중인지 확인.`);
    state.data = null;
  }

  // 2) SSE 연결 (1회)
  attachSSE();

  // 3) hashchange 리스너 + 첫 페이지 진입
  window.addEventListener('hashchange', () => activatePage(parseHash()));
  await activatePage(parseHash());

  // 4) 디버깅 핸들
  window.__aimv_router = {
    state,
    navigate: (page) => { window.location.hash = `#${page}`; },
    current: () => state.currentPage,
  };
  console.info('[router] init complete →', state.currentPage);
}

export function navigate(page) {
  if (!VALID_PAGES.includes(page)) page = 'home';
  window.location.hash = `#${page}`;
}

export function current() {
  return state.currentPage;
}

/* ───────────── Bootstrap ───────────── */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init().catch((err) => console.error('[router] init failed:', err)); });
  } else {
    init().catch((err) => console.error('[router] init failed:', err));
  }
}
