/**
 * AIMindVaults Visualization — Additions (날짜 컨텍스트 4-모드) 페이지 (W-add, R116)
 *
 * 역할:
 *   한 날짜 (기본 = 가장 최근) 기준 그 날 추가/갱신된 데이터를 4 view 로 토글:
 *     - notes        — 그 날 mtime/created 인 노트 리스트 + frontmatter/body preview
 *     - vaults       — 그 날 birthtime 인 vault 카드 그리드
 *     - tags         — 그 날 노트가 가진 태그 빈도 막대 (TOP 40, owner 표시)
 *     - connections  — 그 날 노트로 발생한 cross-vault connection 행 리스트
 *
 * URL 매개변수:
 *   #additions?date=YYYY-MM-DD&basis=mtime|created&view=notes|vaults|tags|connections
 *   - date    : 대상 일자. 미지정 시 server 가 가장 최근 자동 선택.
 *   - basis   : notes·tags·connections 의 일자 기준 (기본 mtime). vaults 는 항상 vault birthtime.
 *   - view    : 4 모드 토글 (기본 notes).
 *
 * 데이터 입력:
 *   - GET /api/additions?date=&basis=  → { date, basis, count, notes: [{...,mtime,created}] }
 *   - GET /api/vault-births            → { vaults: [{vaultId, path, birthtime, note_count}] }
 *   - data.master                       → tag_owners, connections, vaults (router 가 전달)
 *
 * 주요 함수 카탈로그:
 *   - initPage                                       ← 진입점, state + 4 view 동시 mount + 핸들러
 *   - parseQueryFromHash / buildHash                 ← URL 해시 ↔ state 매핑
 *   - fetchAdditions / fetchVaultBirths / fetchNote  ← API 3
 *   - shellHtml / viewSegHtml / basisSegHtml         ← 골격 + 토글
 *   - noteCardHtml / vaultCardHtml                   ← notes / vaults view 카드
 *   - tagBarHtml / connectionRowHtml                 ← tags / connections view 행
 *   - renderNotePreview                              ← 노트 preview (frontmatter highlight + body markdown)
 *   - aggregateTags / aggregateConnections           ← notes → 태그 빈도 / cross-vault connection 집계
 *   - renderNotesView / renderVaultsView / renderTagsView / renderConnectionsView ← 4 view 렌더
 *   - load                                           ← 데이터 로드 (gen counter race 회피)
 *
 * 표준 시그니처:
 *   export async function initPage(container, data, userConfig): Promise<PageContext>
 *   PageContext = { destroy(), refresh(newData) }
 *
 * 외부 의존성:
 *   lib/markdown.js (frontmatter/body 분리 + 미니 파서) · lib/buildOption.js (presetColorByCategory)
 *   · lib/obsidian-uri.js · lib/system-vaults.js
 *
 * 참조:
 *   Spec:    [[20260513_시스템스펙_04_시각화]] § 5 page mapping
 *   R116:    날짜 컨텍스트 4 모드 + 생성일 캘린더 + KPI 라우팅 재배치 (2026-05-13)
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.2
 */

import { renderMarkdown, splitFrontmatter } from '../lib/markdown.js';
import { presetColorByCategory } from '../lib/buildOption.js';
import { openNote, openVault } from '../lib/obsidian-uri.js';
import { isSystemVault, filterVisibleNotes } from '../lib/system-vaults.js';

const VIEWS = ['notes', 'vaults', 'tags', 'connections'];
const BASES = ['mtime', 'created'];
const VIEW_LABELS = { notes: '노트', vaults: '볼트', tags: '태그', connections: '커넥션' };
const BASIS_LABELS = { mtime: '갱신일', created: '생성일' };
const TAGS_TOP_N = 40;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function parseQueryFromHash() {
  const h = window.location.hash || '';
  const q = h.indexOf('?');
  if (q < 0) return { date: '', basis: 'mtime', view: 'notes' };
  const params = new URLSearchParams(h.slice(q + 1));
  const d = params.get('date') || '';
  const bRaw = (params.get('basis') || 'mtime').toLowerCase();
  const vRaw = (params.get('view') || 'notes').toLowerCase();
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '',
    basis: BASES.includes(bRaw) ? bRaw : 'mtime',
    view: VIEWS.includes(vRaw) ? vRaw : 'notes',
  };
}

function buildHash({ date, basis, view }) {
  const parts = [];
  if (date) parts.push(`date=${date}`);
  if (basis && basis !== 'mtime') parts.push(`basis=${basis}`);
  if (view && view !== 'notes') parts.push(`view=${view}`);
  return parts.length ? `#additions?${parts.join('&')}` : '#additions';
}

function categoryOf(vaultMeta) {
  return (vaultMeta?.path || '').split('/')[1] || 'unknown';
}

function buildVaultCategoryMap(masterVaults) {
  const map = {};
  for (const [vid, meta] of Object.entries(masterVaults || {})) {
    map[vid] = categoryOf(meta);
  }
  return map;
}

function timeFromMtime(stamp) {
  if (!stamp) return '—';
  const m = String(stamp).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

async function fetchAdditions(date, basis) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (basis && basis !== 'mtime') params.set('basis', basis);
  const url = params.toString() ? `/api/additions?${params}` : '/api/additions';
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  if (Array.isArray(json?.notes)) {
    json.notes = filterVisibleNotes(json.notes);
    json.count = json.notes.length;
  }
  return json;
}

async function fetchVaultBirths() {
  const r = await fetch('/api/vault-births', { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  if (Array.isArray(json?.vaults)) {
    json.vaults = json.vaults.filter((v) => v && !isSystemVault(v.vaultId));
  }
  return json;
}

async function fetchNote(vaultId, notePath) {
  const url = `/api/note?vault=${encodeURIComponent(vaultId)}&path=${encodeURIComponent(notePath)}`;
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.text();
}

/* ───────────── Shell HTML ───────────── */

/** 4 view 세그먼트 (notes/vaults/tags/connections) 토글 버튼 HTML. */
function viewSegHtml(activeView) {
  return VIEWS.map((v) => {
    const on = v === activeView ? ' on' : '';
    return `<button class="${on.trim()}" data-view-btn="${v}">${escapeHtml(VIEW_LABELS[v])}</button>`;
  }).join('');
}

function basisSegHtml(activeBasis) {
  return BASES.map((b) => {
    const on = b === activeBasis ? ' on' : '';
    return `<button class="${on.trim()}" data-basis-btn="${b}">${escapeHtml(BASIS_LABELS[b])}</button>`;
  }).join('');
}

/**
 * 페이지 골격 HTML. 상단 toolbar (date / basis / view / 검색 / 카테고리 필터 / meta) +
 * main 영역에 4 view-pane (notes + preview, vaults grid, tags bars, connections list) 동시 mount.
 * 활성 view 만 display: ''. state.view 변경 시 applyViewVisibility 가 토글.
 */
function shellHtml(state) {
  return `
    <section class="page page-additions">
      <div class="toolbar">
        <div class="tool-group">
          <span class="tool-label">날짜</span>
          <input type="date" class="search-input" data-role="date" value="${escapeHtml(state.date)}">
        </div>
        <div class="tool-group" data-role="basisGroup">
          <span class="tool-label">기준</span>
          <div class="seg" data-role="basisSeg">${basisSegHtml(state.basis)}</div>
        </div>
        <div class="tool-group">
          <span class="tool-label">뷰</span>
          <div class="seg" data-role="viewSeg">${viewSegHtml(state.view)}</div>
        </div>
        <div class="tool-group" data-role="searchGroup">
          <span class="tool-label">검색</span>
          <input type="text" class="search-input" data-role="search" placeholder="제목·경로·태그 부분 일치...">
        </div>
        <div class="tool-group" data-role="catGroup">
          <span class="tool-label">카테고리</span>
          <div class="cat-filter" data-role="catFilter"></div>
        </div>
        <div class="tool-group" style="margin-left:auto;">
          <span class="chart-meta" data-role="meta">로드 중…</span>
        </div>
      </div>
      <div class="main add-main" data-role="mainArea">
        <div data-view="notes" class="view-pane">
          <div class="add-list" data-role="notesList"></div>
          <aside class="preview" data-role="preview"></aside>
        </div>
        <div data-view="vaults" class="view-pane" style="display:none;">
          <div class="vault-grid" data-role="vaultsGrid"></div>
        </div>
        <div data-view="tags" class="view-pane" style="display:none;">
          <div class="tag-bars" data-role="tagsBars"></div>
        </div>
        <div data-view="connections" class="view-pane" style="display:none;">
          <div class="conn-list" data-role="connList"></div>
        </div>
      </div>
    </section>
  `;
}

function emptyPreviewHtml() {
  return `
    <div class="add-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
      <div class="hint">왼쪽 리스트에서 노트를 선택하면 frontmatter 와 본문이 여기에 표시됩니다.</div>
    </div>
  `;
}

/** 노트 카드 한 줄 — vault 칩 + type 칩 + 시각 + 제목 + path + 태그 (최대 6). Obsidian 열기 버튼 포함. */
function noteCardHtml(n, catColor, basis) {
  const tags = (n.tags || []).slice(0, 6).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const stamp = basis === 'created' ? (n.created || n.mtime) : (n.mtime || n.created);
  const time = timeFromMtime(stamp);
  const title = n.title || (n.path || '').split('/').pop() || '(untitled)';
  const typeChip = n.type ? `<span class="type-chip">${escapeHtml(n.type)}</span>` : '';
  return `
    <div class="add-row" data-vault="${escapeHtml(n.vault_id)}" data-path="${escapeHtml(n.path)}">
      <span class="dot" style="background:${escapeHtml(catColor)}"></span>
      <div class="body">
        <div class="head-line">
          <span class="vault-chip" data-open-vault="${escapeHtml(n.vault_id)}" title="Obsidian 으로 볼트 열기">${escapeHtml(n.vault_id)}</span>
          ${typeChip}
          <span class="time">${escapeHtml(time)}</span>
          <button class="open-obs" data-open-note="${escapeHtml(n.vault_id)}|${escapeHtml(n.path)}" title="Obsidian 으로 노트 열기">↗</button>
        </div>
        <div class="ttl">${escapeHtml(title)}</div>
        <div class="path" title="${escapeHtml(n.path)}">${escapeHtml(n.path)}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
    </div>
  `;
}

/** Vault 카드 (그 날 birthtime 인 vault) — vault 칩 + 카테고리 + birthtime + path + note count. 클릭 시 Obsidian. */
function vaultCardHtml(v, catColor, cat) {
  const noteCount = typeof v.note_count === 'number' ? v.note_count : 0;
  const time = timeFromMtime(v.birthtime);
  return `
    <a class="vault-card" href="#" data-open-vault="${escapeHtml(v.vaultId)}" title="Obsidian 으로 열기">
      <span class="dot" style="background:${escapeHtml(catColor)}"></span>
      <div class="body">
        <div class="head-line">
          <span class="vault-chip">${escapeHtml(v.vaultId)}</span>
          <span class="type-chip">${escapeHtml(cat)}</span>
          <span class="time">${escapeHtml(time)}</span>
        </div>
        <div class="ttl">${escapeHtml(v.vaultId)}</div>
        <div class="path" title="${escapeHtml(v.path)}">${escapeHtml(v.path)}</div>
        <div class="tags"><span class="tag">${noteCount} notes</span></div>
      </div>
    </a>
  `;
}

/** 태그 막대 한 줄 — owner vault 칩 + 태그명 + 빈도 막대 (max 대비 %, 최소 6%). owner 카테고리 색 적용. unowned 는 회색. */
function tagBarHtml({ tag, count, ownerVault, ownerCat, isOwned }, maxCount) {
  const pct = Math.max(6, Math.round((count / maxCount) * 100));
  const ownerColor = ownerCat ? presetColorByCategory(ownerCat) : 'var(--text-3)';
  const ownerLabel = isOwned ? `<span class="vault-chip" style="background:${escapeHtml(ownerColor)};color:#fff;">${escapeHtml(ownerVault || '?')}</span>` : '<span class="type-chip">unowned</span>';
  return `
    <div class="tag-bar" data-tag="${escapeHtml(tag)}">
      <div class="left">${ownerLabel}<span class="ttl">${escapeHtml(tag)}</span></div>
      <div class="bar"><span class="fill" style="width:${pct}%;background:${escapeHtml(ownerColor)};"></span></div>
      <div class="num">${count}</div>
    </div>
  `;
}

/** Cross-vault 커넥션 행 — owner vault → 태그 → user vault → 빈도. 양 vault 클릭 시 Obsidian. */
function connectionRowHtml({ tag, ownerVault, ownerCat, userVault, userCat, count }) {
  const ownerColor = presetColorByCategory(ownerCat);
  const userColor = presetColorByCategory(userCat);
  return `
    <div class="conn-row" data-tag="${escapeHtml(tag)}">
      <span class="vault-chip" style="background:${escapeHtml(ownerColor)};color:#fff;cursor:pointer;" data-open-vault="${escapeHtml(ownerVault)}" title="Obsidian 으로 볼트 열기">${escapeHtml(ownerVault)}</span>
      <span class="arrow">→</span>
      <span class="tag">${escapeHtml(tag)}</span>
      <span class="arrow">→</span>
      <span class="vault-chip" style="background:${escapeHtml(userColor)};color:#fff;cursor:pointer;" data-open-vault="${escapeHtml(userVault)}" title="Obsidian 으로 볼트 열기">${escapeHtml(userVault)}</span>
      <span class="count">${count}×</span>
    </div>
  `;
}

function buildCategoryFilterHtml(catSet, activeCats) {
  return [...catSet].sort().map((cat) => {
    const color = presetColorByCategory(cat);
    const checked = activeCats.has(cat) ? 'checked' : '';
    return `<label><input type="checkbox" data-cat="${escapeHtml(cat)}" ${checked}><span class="d" style="background:${escapeHtml(color)}"></span>${escapeHtml(cat)}</label>`;
  }).join('');
}

/**
 * 노트 raw 텍스트 → preview 영역 렌더. frontmatter 키:값 highlight + body 마크다운 미니 파싱.
 * H1 (`# 제목`) 이 있으면 별도 .ptitle 로, 본문에서 그 줄 제거.
 */
function renderNotePreview(previewEl, vaultId, notePath, raw) {
  const { frontmatter, body } = splitFrontmatter(raw);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = (titleMatch ? titleMatch[1] : notePath.split('/').pop().replace(/\.md$/, '')).trim();
  const fmHtml = frontmatter
    ? frontmatter.split('\n').map((ln) => {
        const m = ln.match(/^(\s*)([\w\-]+)\s*:(.*)$/);
        if (m) return `${m[1]}<span class="k">${escapeHtml(m[2])}</span>:${escapeHtml(m[3])}`;
        return escapeHtml(ln);
      }).join('\n')
    : '(no frontmatter)';
  const bodyHtml = renderMarkdown(body.replace(/^#\s+.+\n/, ''));
  previewEl.innerHTML = `
    <div class="pmeta">${escapeHtml(vaultId)} / ${escapeHtml(notePath)}</div>
    <div class="ptitle">${escapeHtml(title)}</div>
    <div class="pfront">${fmHtml}</div>
    <div class="pbody">${bodyHtml}</div>`;
}

/* ───────────── Aggregations ───────────── */

/** notes 에서 태그 빈도 집계 + owner 매핑. */
function aggregateTags(notes, master) {
  const tagOwners = master?.tag_owners || {};
  const map = new Map(); // tag → { count, ownerVault, ownerCat, isOwned }
  for (const n of notes || []) {
    for (const t of (n.tags || [])) {
      if (!t) continue;
      let entry = map.get(t);
      if (!entry) {
        const owner = tagOwners[t] || null;
        entry = { tag: t, count: 0, ownerVault: owner, ownerCat: null, isOwned: !!owner };
        map.set(t, entry);
      }
      entry.count += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * notes 에서 cross-vault connection events 집계.
 * connection event = note 가 owned 태그를 가졌고 그 태그의 owner 가 note.vault_id 와 다름.
 * 결과: [{ tag, ownerVault, ownerCat, userVault, userCat, count }]
 */
function aggregateConnections(notes, master, vaultCatMap) {
  const tagOwners = master?.tag_owners || {};
  const map = new Map(); // key = `${tag}::${userVault}` → entry
  for (const n of notes || []) {
    const userVault = n.vault_id;
    if (!userVault) continue;
    for (const t of (n.tags || [])) {
      const owner = tagOwners[t];
      if (!owner) continue;
      if (owner === userVault) continue;
      const key = `${t}::${userVault}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          tag: t,
          ownerVault: owner,
          ownerCat: vaultCatMap[owner] || 'unknown',
          userVault,
          userCat: vaultCatMap[userVault] || 'unknown',
          count: 0,
        };
        map.set(key, entry);
      }
      entry.count += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/* ───────────── initPage ───────────── */

/**
 * Additions 페이지 진입점. state 단일 객체 + DOM 참조 + 4 view 동시 mount + 이벤트 핸들러 부착.
 *
 * 흐름:
 *   1. URL 해시 파싱 → state (date/basis/view).
 *   2. shellHtml 렌더 + DOM 참조 캐싱.
 *   3. load() — /api/additions + /api/vault-births 병렬 fetch.
 *   4. applyViewVisibility + rebuildCatSet + renderCategoryFilter + renderCurrentView + renderMeta.
 *   5. 이벤트 (date/basis/view/search/cat/note click/hashchange/Obsidian open) 부착.
 *
 * 상태 race 회피: state.loadGen counter — 직전 fetch 가 다음 fetch 후 도착하면 무시.
 * URL 동기화: setHashFromState({skipReload:true}) — hashchange 핸들러 우회 (state 이미 갱신됨).
 *
 * @param {HTMLElement} container
 * @param {object} data        router 가 전달한 IndexData (master + per-vault)
 * @param {object} userConfig  (현재 미사용 — 표준 시그니처)
 */
export async function initPage(container, data /* , userConfig */) {
  if (!container) throw new Error('additions.initPage: container 필수');

  const vaultCatMap = buildVaultCategoryMap(data?.master?.vaults);

  const initialQuery = parseQueryFromHash();
  const state = {
    date: initialQuery.date,
    basis: initialQuery.basis,
    view: initialQuery.view,
    notes: [],
    vaultBirths: [],     // 전체 vault-births 응답 (필터는 view 단에서)
    catSet: new Set(),
    activeCats: new Set(),
    searchQ: '',
    selected: null,
    loadGen: 0,
    master: data?.master || null,
  };

  container.innerHTML = shellHtml(state);

  const dateInput = container.querySelector('[data-role="date"]');
  const basisSeg = container.querySelector('[data-role="basisSeg"]');
  const viewSeg = container.querySelector('[data-role="viewSeg"]');
  const searchInput = container.querySelector('[data-role="search"]');
  const catWrap = container.querySelector('[data-role="catFilter"]');
  const notesListEl = container.querySelector('[data-role="notesList"]');
  const previewEl = container.querySelector('[data-role="preview"]');
  const vaultsGridEl = container.querySelector('[data-role="vaultsGrid"]');
  const tagsBarsEl = container.querySelector('[data-role="tagsBars"]');
  const connListEl = container.querySelector('[data-role="connList"]');
  const metaEl = container.querySelector('[data-role="meta"]');
  const basisGroup = container.querySelector('[data-role="basisGroup"]');
  const searchGroup = container.querySelector('[data-role="searchGroup"]');
  const catGroup = container.querySelector('[data-role="catGroup"]');

  previewEl.innerHTML = emptyPreviewHtml();
  notesListEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">로드 중…</div>';

  /* ───────── view 별 표시 토글 ───────── */
  function applyViewVisibility() {
    container.querySelectorAll('.view-pane').forEach((el) => {
      const v = el.getAttribute('data-view');
      el.style.display = (v === state.view) ? '' : 'none';
    });
    // basis 토글: vaults 모드에서는 의미 없음
    basisGroup.style.opacity = (state.view === 'vaults') ? '0.4' : '';
    basisGroup.style.pointerEvents = (state.view === 'vaults') ? 'none' : '';
    // 검색 + 카테고리: 모든 view 에서 사용 (vaults 는 카테고리만)
    searchGroup.style.display = (state.view === 'vaults') ? 'none' : '';
    catGroup.style.display = ''; // 항상 표시
  }

  /* ───────── 카테고리 집합 빌드 (view 별) ───────── */
  function rebuildCatSet() {
    state.catSet = new Set();
    if (state.view === 'vaults') {
      const sameDate = state.vaultBirths.filter((v) => v?.birthtime?.slice(0, 10) === state.date);
      for (const v of sameDate) state.catSet.add(vaultCatMap[v.vaultId] || categoryOf({ path: v.path }) || 'unknown');
    } else {
      for (const n of state.notes) state.catSet.add(vaultCatMap[n.vault_id] || 'unknown');
    }
  }

  function renderCategoryFilter() {
    catWrap.innerHTML = buildCategoryFilterHtml(state.catSet, state.activeCats);
  }

  /* ───────── 검색·카테고리 필터 ───────── */
  function filterNotes() {
    const q = state.searchQ.trim().toLowerCase();
    return state.notes.filter((n) => {
      const cat = vaultCatMap[n.vault_id] || 'unknown';
      if (state.activeCats.size > 0 && !state.activeCats.has(cat)) return false;
      if (!q) return true;
      const hay = [(n.title || ''), n.path || '', (n.tags || []).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  /* ───────── view 렌더 ───────── */
  function renderNotesView() {
    const filtered = filterNotes();
    if (filtered.length === 0) {
      notesListEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">표시할 노트가 없습니다.</div>';
    } else {
      notesListEl.innerHTML = filtered.map((n) => {
        const cat = vaultCatMap[n.vault_id] || 'unknown';
        return noteCardHtml(n, presetColorByCategory(cat), state.basis);
      }).join('');
    }
  }

  function renderVaultsView() {
    const sameDate = state.vaultBirths.filter((v) => v?.birthtime?.slice(0, 10) === state.date);
    const filtered = sameDate.filter((v) => {
      const cat = vaultCatMap[v.vaultId] || categoryOf({ path: v.path }) || 'unknown';
      if (state.activeCats.size > 0 && !state.activeCats.has(cat)) return false;
      return true;
    });
    if (filtered.length === 0) {
      vaultsGridEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">생성된 볼트 없음</div>';
    } else {
      vaultsGridEl.innerHTML = filtered.map((v) => {
        const cat = vaultCatMap[v.vaultId] || categoryOf({ path: v.path }) || 'unknown';
        return vaultCardHtml(v, presetColorByCategory(cat), cat);
      }).join('');
    }
  }

  function renderTagsView() {
    const filtered = filterNotes();
    const aggRaw = aggregateTags(filtered, state.master);
    // owner category 채움 (owned 태그만)
    for (const e of aggRaw) {
      if (e.isOwned && e.ownerVault) {
        e.ownerCat = vaultCatMap[e.ownerVault] || 'unknown';
      }
    }
    const top = aggRaw.slice(0, TAGS_TOP_N);
    const maxCount = top[0]?.count || 1;
    if (top.length === 0) {
      tagsBarsEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">태그 없음</div>';
    } else {
      tagsBarsEl.innerHTML = top.map((e) => tagBarHtml(e, maxCount)).join('');
    }
  }

  function renderConnectionsView() {
    const filtered = filterNotes();
    const conns = aggregateConnections(filtered, state.master, vaultCatMap);
    if (conns.length === 0) {
      connListEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">cross-vault 커넥션 없음</div>';
    } else {
      connListEl.innerHTML = conns.map((c) => connectionRowHtml(c)).join('');
    }
  }

  function renderCurrentView() {
    switch (state.view) {
      case 'notes':       return renderNotesView();
      case 'vaults':      return renderVaultsView();
      case 'tags':        return renderTagsView();
      case 'connections': return renderConnectionsView();
    }
  }

  function renderMeta() {
    if (!metaEl) return;
    const dateLabel = state.date || '—';
    const filterParts = [];
    if (state.activeCats.size > 0) filterParts.push(`카테고리 ${state.activeCats.size}`);
    if (state.searchQ && state.view !== 'vaults') filterParts.push(`검색 "${state.searchQ}"`);
    const suffix = filterParts.length ? ` · ${filterParts.join(' · ')}` : '';
    let counts;
    if (state.view === 'vaults') {
      const sameDate = state.vaultBirths.filter((v) => v?.birthtime?.slice(0, 10) === state.date);
      counts = `${sameDate.length} vaults`;
    } else {
      const filtered = filterNotes();
      counts = `${filtered.length} / ${state.notes.length} notes (basis=${state.basis})`;
    }
    metaEl.textContent = `${dateLabel} · ${VIEW_LABELS[state.view]} · ${counts}${suffix}`;
  }

  function renderAll() {
    applyViewVisibility();
    rebuildCatSet();
    renderCategoryFilter();
    renderCurrentView();
    renderMeta();
  }

  /* ───────── 데이터 로드 ───────── */
  /**
   * /api/additions + /api/vault-births 병렬 fetch + state 갱신 + 4 view 재렌더.
   * gen counter 로 race 회피 (직전 호출이 늦게 도착하면 결과 무시).
   * 실패 시 placeholder 에 에러 메시지 표시.
   */
  async function load() {
    const gen = ++state.loadGen;
    notesListEl.innerHTML = '<div class="page-placeholder" style="min-height:120px;">로드 중…</div>';
    if (metaEl) metaEl.textContent = '로드 중…';
    let addJson, birthsJson;
    try {
      [addJson, birthsJson] = await Promise.all([
        fetchAdditions(state.date, state.basis),
        fetchVaultBirths(),
      ]);
    } catch (err) {
      if (gen !== state.loadGen) return;
      notesListEl.innerHTML = `<div class="page-error">불러오기 실패: ${escapeHtml(err.message)}</div>`;
      if (metaEl) metaEl.textContent = '실패';
      return;
    }
    if (gen !== state.loadGen) return;
    state.date = addJson.date || '';
    state.notes = Array.isArray(addJson.notes) ? addJson.notes : [];
    state.vaultBirths = Array.isArray(birthsJson.vaults) ? birthsJson.vaults : [];
    state.activeCats = new Set();
    state.searchQ = '';
    state.selected = null;
    if (dateInput && state.date) dateInput.value = state.date;
    if (searchInput) searchInput.value = '';
    previewEl.innerHTML = emptyPreviewHtml();
    renderAll();
  }

  /* ───────── URL 동기화 ───────── */
  function setHashFromState({ skipReload } = {}) {
    const newHash = buildHash({ date: state.date, basis: state.basis, view: state.view });
    if (window.location.hash !== newHash) {
      // skipReload 시 hashchange 핸들러가 불필요한 재로드 안 하도록 internal flag
      state._suppressHashReload = !!skipReload;
      window.location.hash = newHash;
    }
  }

  /* ───────── 이벤트 핸들러 ───────── */
  // hash indirection 제거 — 토글/입력 시 hash 만 업데이트하고 직접 load()/renderAll() 호출.
  // hashchange listener 는 외부 (브라우저 back/forward, KPI 클릭) 에서 진입할 때만 처리.
  function onDateInput(ev) {
    const v = (ev.target.value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if (v === state.date) return;
    state.date = v;
    setHashFromState({ skipReload: true });
    load();
  }
  function onSearch(ev) {
    state.searchQ = String(ev.target.value || '');
    renderCurrentView();
    renderMeta();
  }
  function onCatChange(ev) {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'checkbox') return;
    const cat = t.getAttribute('data-cat');
    if (!cat) return;
    if (t.checked) state.activeCats.add(cat);
    else state.activeCats.delete(cat);
    renderCurrentView();
    renderMeta();
  }
  function onBasisClick(ev) {
    const btn = ev.target.closest('button[data-basis-btn]');
    if (!btn) return;
    const next = btn.getAttribute('data-basis-btn');
    if (!BASES.includes(next) || next === state.basis) return;
    state.basis = next;
    basisSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-basis-btn') === next));
    setHashFromState({ skipReload: true });
    load();
  }
  function onViewClick(ev) {
    const btn = ev.target.closest('button[data-view-btn]');
    if (!btn) return;
    const next = btn.getAttribute('data-view-btn');
    if (!VIEWS.includes(next) || next === state.view) return;
    state.view = next;
    viewSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-view-btn') === next));
    setHashFromState({ skipReload: true });
    renderAll();
  }
  async function onNotesListClick(ev) {
    const row = ev.target.closest('.add-row');
    if (!row) return;
    notesListEl.querySelectorAll('.add-row.sel').forEach((r) => r.classList.remove('sel'));
    row.classList.add('sel');
    const vaultId = row.dataset.vault;
    const notePath = row.dataset.path;
    state.selected = { vaultId, notePath };
    previewEl.innerHTML = '<div class="add-empty"><div class="hint">로드 중…</div></div>';
    try {
      const raw = await fetchNote(vaultId, notePath);
      if (state.selected?.vaultId !== vaultId || state.selected?.notePath !== notePath) return;
      renderNotePreview(previewEl, vaultId, notePath, raw);
    } catch (err) {
      previewEl.innerHTML = `<div class="add-empty"><div class="hint">불러오기 실패: ${escapeHtml(err.message)}</div></div>`;
    }
  }
  /**
   * hashchange 이벤트 — 외부 진입 (브라우저 back/forward, KPI 클릭 등) 시 처리.
   * state._suppressHashReload 플래그가 켜져 있으면 fetch 생략 (내부 토글이 hash 만 갱신한 경우).
   */
  function onHashChange() {
    const q = parseQueryFromHash();
    const dateChanged = q.date && q.date !== state.date;
    const basisChanged = q.basis !== state.basis;
    const viewChanged = q.view !== state.view;
    state.date = q.date || state.date;
    state.basis = q.basis;
    state.view = q.view;
    if (state._suppressHashReload) {
      state._suppressHashReload = false;
      // 동기화만 — fetch 안 함
      if (basisChanged || viewChanged) renderAll();
      return;
    }
    if (dateChanged || basisChanged) {
      // 서버 응답이 달라짐 → load 재호출
      load();
    } else if (viewChanged) {
      renderAll();
    }
  }

  // Obsidian 열기 delegated handler — capture phase 로 row click (preview) 보다 먼저 잡음
  function onObsidianOpenClick(ev) {
    const noteEl = ev.target.closest('[data-open-note]');
    if (noteEl) {
      ev.preventDefault();
      ev.stopPropagation();
      const [vault, path] = String(noteEl.dataset.openNote || '').split('|');
      openNote(vault, path);
      return;
    }
    const vaultEl = ev.target.closest('[data-open-vault]');
    if (vaultEl) {
      ev.preventDefault();
      ev.stopPropagation();
      openVault(vaultEl.dataset.openVault);
      return;
    }
  }
  container.addEventListener('click', onObsidianOpenClick, true);

  dateInput.addEventListener('change', onDateInput);
  basisSeg.addEventListener('click', onBasisClick);
  viewSeg.addEventListener('click', onViewClick);
  searchInput.addEventListener('input', onSearch);
  catWrap.addEventListener('change', onCatChange);
  notesListEl.addEventListener('click', onNotesListClick);
  window.addEventListener('hashchange', onHashChange);

  await load();

  return {
    destroy() {
      state.loadGen++;
      container.removeEventListener('click', onObsidianOpenClick, true);
      dateInput.removeEventListener('change', onDateInput);
      basisSeg.removeEventListener('click', onBasisClick);
      viewSeg.removeEventListener('click', onViewClick);
      searchInput.removeEventListener('input', onSearch);
      catWrap.removeEventListener('change', onCatChange);
      notesListEl.removeEventListener('click', onNotesListClick);
      window.removeEventListener('hashchange', onHashChange);
      container.innerHTML = '';
    },
    async refresh(newData) {
      if (newData?.master?.vaults) {
        const fresh = buildVaultCategoryMap(newData.master.vaults);
        for (const k of Object.keys(vaultCatMap)) delete vaultCatMap[k];
        Object.assign(vaultCatMap, fresh);
      }
      if (newData?.master) state.master = newData.master;
      await load();
    },
  };
}

export const __internal = {
  parseQueryFromHash,
  buildHash,
  buildVaultCategoryMap,
  timeFromMtime,
  noteCardHtml,
  vaultCardHtml,
  tagBarHtml,
  connectionRowHtml,
  buildCategoryFilterHtml,
  aggregateTags,
  aggregateConnections,
};

// Back-compat — 기존 import 호환성 (router/external) 위해 옛 이름도 노출
export const __legacy = { parseDateFromHash: () => parseQueryFromHash().date };
