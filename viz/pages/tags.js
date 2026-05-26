/**
 * W4-R126 — 태그 탐색기 (구 태그 순위 페이지 폐기, 태그 전용 뷰로 재설계)
 *
 * 좌측: 태그 리스트 (검색·필터·정렬) — owned/unowned 시각 구분
 *   - owned: owner 카테고리 색 dot + 볼트 chip
 *   - unowned: 회색 dot + "unowned" 점선 chip
 * 우측: 선택 태그 detail
 *   - 헤더: 태그 이름 + owner badge + 통계 pill
 *   - 본문: 그 태그 가진 노트를 카테고리(볼트 귀속)별 섹션으로 그룹
 *   - 각 카테고리 섹션 헤더 ▾/▸ 클릭 시 접기/펼치기
 *   - toolbar 의 "모두 접기/펼치기" 버튼이 카테고리 섹션 전체 토글
 *   - 새 태그 선택 시 collapse 상태 자동 리셋 (모두 펼침)
 */

import { presetColorByCategory } from '../lib/buildOption.js';
import { openNote, openVault } from '../lib/obsidian-uri.js';

const SORT_OPTIONS = ['count', 'name', 'recent', 'owner'];
const SORT_LABELS = { count: '노트 수', name: '이름', recent: '최근', owner: '볼트별' };
const FILTER_OPTIONS = ['all', 'owned', 'unowned'];
const FILTER_LABELS = { all: '전체', owned: 'owned', unowned: 'unowned' };

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function dateFromStamp(stamp) {
  if (!stamp) return '—';
  const m = String(stamp).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '—';
}

function buildTagList(data, vaultCatMap) {
  const master = data?.master || {};
  const tagIndex = master.tag_index || {};
  const tagOwners = master.tag_owners || {};
  const notes = Array.isArray(master.notes) ? master.notes : [];

  const tagMtime = new Map();
  for (const n of notes) {
    if (!Array.isArray(n.tags)) continue;
    const m = n.mtime || '';
    for (const t of n.tags) {
      const cur = tagMtime.get(t);
      if (!cur || m > cur) tagMtime.set(t, m);
    }
  }

  const list = [];
  for (const [tag, refs] of Object.entries(tagIndex)) {
    const arr = Array.isArray(refs) ? refs : [];
    const owner = tagOwners[tag] || null;
    const ownerCat = owner ? (vaultCatMap[owner] || 'unknown') : null;
    const ownerColor = owner ? presetColorByCategory(ownerCat) : null;
    const vaults = new Set();
    for (const r of arr) {
      const i = typeof r === 'string' ? r.indexOf(':') : -1;
      if (i > 0) vaults.add(r.slice(0, i));
    }
    list.push({
      name: tag,
      count: arr.length,
      vaultCount: vaults.size,
      owner,
      ownerCat,
      ownerColor,
      isOwned: !!owner,
      lastMtime: tagMtime.get(tag) || '',
    });
  }
  return list;
}

function applyFilters(list, { searchQ, filter, sortBy }) {
  const q = (searchQ || '').trim().toLowerCase();
  let arr = q ? list.filter((t) => t.name.toLowerCase().includes(q)) : list.slice();
  if (filter === 'owned') arr = arr.filter((t) => t.isOwned);
  else if (filter === 'unowned') arr = arr.filter((t) => !t.isOwned);
  if (sortBy === 'name') {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'recent') {
    arr.sort((a, b) => (b.lastMtime || '').localeCompare(a.lastMtime || ''));
  } else if (sortBy === 'owner') {
    // 볼트별 — owned 먼저 (owner 알파벳 순), 같은 owner 내부는 노트 수 많은 순, unowned 마지막
    arr.sort((a, b) => {
      if (a.isOwned !== b.isOwned) return a.isOwned ? -1 : 1;
      if (a.isOwned && b.isOwned && a.owner !== b.owner) return a.owner.localeCompare(b.owner);
      return b.count - a.count;
    });
  } else {
    arr.sort((a, b) => b.count - a.count);
  }
  return arr;
}

function tagRowHtml(tag, isSelected) {
  const sel = isSelected ? ' sel' : '';
  const dotColor = tag.ownerColor || 'var(--text-3)';
  const ownerChip = tag.isOwned
    ? `<span class="owner-chip" style="background:${escapeHtml(tag.ownerColor)};" title="owned by ${escapeHtml(tag.owner)}">${escapeHtml(tag.owner)}</span>`
    : '<span class="unowned-chip" title="볼트 ID와 일치하지 않는 일반 태그">unowned</span>';
  return `
    <div class="tag-row${sel}" data-tag="${escapeHtml(tag.name)}">
      <span class="dot" style="background:${escapeHtml(dotColor)};"></span>
      <span class="name" title="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</span>
      ${ownerChip}
      <span class="count">${tag.count}</span>
    </div>
  `;
}

function groupNotesByCategory(notes, vaultCatMap) {
  const groups = new Map();
  for (const n of notes || []) {
    const cat = vaultCatMap[n.vault_id] || 'unknown';
    if (!groups.has(cat)) {
      groups.set(cat, { cat, color: presetColorByCategory(cat), notes: [] });
    }
    groups.get(cat).notes.push(n);
  }
  for (const g of groups.values()) {
    g.notes.sort((a, b) => (b.mtime || '').localeCompare(a.mtime || ''));
  }
  return [...groups.values()].sort((a, b) => b.notes.length - a.notes.length);
}

function noteCardHtml(n, catColor) {
  const title = n.title || (n.path || '').split('/').pop() || '(untitled)';
  const date = dateFromStamp(n.mtime);
  const tags = (n.tags || []).slice(0, 4).map((t) =>
    `<span class="tag">${escapeHtml(t)}</span>`
  ).join('');
  const typeChip = n.type ? `<span class="type-chip">${escapeHtml(n.type)}</span>` : '';
  return `
    <div class="note-card" style="--cat-color:${escapeHtml(catColor)};">
      <div class="head">
        <span class="vault-chip" data-open-vault="${escapeHtml(n.vault_id)}" title="Obsidian 으로 볼트 열기">${escapeHtml(n.vault_id)}</span>
        ${typeChip}
        <span class="date">${escapeHtml(date)}</span>
        <button class="open-btn" data-open-note="${escapeHtml(n.vault_id)}|${escapeHtml(n.path)}" title="Obsidian 으로 노트 열기">↗</button>
      </div>
      <div class="ttl" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
      <div class="path" title="${escapeHtml(n.path)}">${escapeHtml(n.path)}</div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
    </div>
  `;
}

function categorySectionHtml(group, collapsedCategories) {
  const collapsed = collapsedCategories.has(group.cat);
  const ic = collapsed ? '▸' : '▾';
  const collapsedCls = collapsed ? ' collapsed' : '';
  const cardsHtml = collapsed
    ? ''
    : `<div class="note-cards">${group.notes.map((n) => noteCardHtml(n, group.color)).join('')}</div>`;
  return `
    <section class="cat-section${collapsedCls}">
      <header class="cat-head" data-cat-head="${escapeHtml(group.cat)}">
        <span class="ic">${ic}</span>
        <span class="cat-dot" style="background:${escapeHtml(group.color)};"></span>
        <span class="cat-name">${escapeHtml(group.cat)}</span>
        <span class="cat-count">${group.notes.length} 노트</span>
      </header>
      ${cardsHtml}
    </section>
  `;
}

function emptyDetailHtml() {
  return `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      <div class="hint">좌측에서 태그를 클릭하면 그 태그를 가진 노트가 카테고리(볼트 귀속)별 카드 섹션으로 펼쳐집니다.<br/>각 섹션 헤더 ▾/▸ 클릭으로 접기/펼치기.</div>
    </div>
  `;
}

function detailHtml(tag, notes, vaultCatMap, collapsedCategories) {
  const ownerBadge = tag.isOwned
    ? `<span class="owner-badge" style="background:${escapeHtml(tag.ownerColor)};" data-open-vault="${escapeHtml(tag.owner)}" title="Obsidian 으로 볼트 열기">owned by ${escapeHtml(tag.owner)}</span>`
    : '<span class="unowned-badge">unowned</span>';
  const groups = groupNotesByCategory(notes, vaultCatMap);
  const groupsHtml = groups.length === 0
    ? `<div class="empty"><div class="hint">이 태그를 가진 노트가 없습니다.</div></div>`
    : `<div class="cat-sections">${groups.map((g) => categorySectionHtml(g, collapsedCategories)).join('')}</div>`;
  return `
    <header class="detail-head">
      <span class="tag-name">#${escapeHtml(tag.name)}</span>
      ${ownerBadge}
      <span class="stat-pill">${tag.count} 노트</span>
      <span class="stat-pill">${tag.vaultCount} 볼트</span>
      ${tag.lastMtime ? `<span class="stat-pill">최근 ${escapeHtml(tag.lastMtime.slice(0, 10))}</span>` : ''}
    </header>
    ${groupsHtml}
  `;
}

function shellHtml(state) {
  const filterSegHtml = FILTER_OPTIONS.map((f) =>
    `<button data-filter="${f}" class="${f === state.filter ? 'on' : ''}">${escapeHtml(FILTER_LABELS[f])}</button>`
  ).join('');
  const sortSegHtml = SORT_OPTIONS.map((s) =>
    `<button data-sort="${s}" class="${s === state.sortBy ? 'on' : ''}">${escapeHtml(SORT_LABELS[s])}</button>`
  ).join('');
  return `
    <section class="page page-tags">
      <div class="toolbar">
        <div class="tool-group">
          <span class="tool-label">검색</span>
          <input type="text" class="search-input" data-role="search" placeholder="태그 부분 일치..." value="${escapeHtml(state.searchQ)}">
        </div>
        <div class="tool-group">
          <span class="tool-label">필터</span>
          <div class="seg" data-role="filterSeg">${filterSegHtml}</div>
        </div>
        <div class="tool-group">
          <span class="tool-label">정렬</span>
          <div class="seg" data-role="sortSeg">${sortSegHtml}</div>
        </div>
        <div class="tool-group" data-role="catToggleGroup">
          <button class="btn" data-role="collapseAll" title="우측의 모든 카테고리 섹션 접기">모두 접기</button>
          <button class="btn" data-role="expandAll" title="우측의 모든 카테고리 섹션 펼치기">모두 펼치기</button>
        </div>
        <div class="tool-group" style="margin-left:auto;">
          <span class="chart-meta" data-role="counts">집계 중…</span>
        </div>
      </div>
      <div class="main tag-main">
        <div class="tag-list" data-role="tagList"></div>
        <div class="tag-detail" data-role="tagDetail">${emptyDetailHtml()}</div>
      </div>
    </section>
  `;
}

export async function initPage(container, data /*, userConfig */) {
  if (!container) throw new Error('tags.initPage: container 필수');

  const master = data?.master || {};
  const vaultCatMap = buildVaultCategoryMap(master.vaults);
  const allNotes = Array.isArray(master.notes) ? master.notes : [];

  const state = {
    searchQ: '',
    filter: 'all',
    sortBy: 'count',
    selectedTag: null,
    tagList: buildTagList(data, vaultCatMap),
    collapsedCategories: new Set(), // 우측 detail 의 접힌 카테고리 키
  };

  container.innerHTML = shellHtml(state);

  const tagListEl = container.querySelector('[data-role="tagList"]');
  const tagDetailEl = container.querySelector('[data-role="tagDetail"]');
  const searchEl = container.querySelector('[data-role="search"]');
  const filterSeg = container.querySelector('[data-role="filterSeg"]');
  const sortSeg = container.querySelector('[data-role="sortSeg"]');
  const countsEl = container.querySelector('[data-role="counts"]');
  const collapseAllBtn = container.querySelector('[data-role="collapseAll"]');
  const expandAllBtn = container.querySelector('[data-role="expandAll"]');

  function renderTagList() {
    const filtered = applyFilters(state.tagList, state);
    if (filtered.length === 0) {
      tagListEl.innerHTML = `<div class="empty"><div class="hint">조건에 맞는 태그가 없습니다.</div></div>`;
    } else {
      tagListEl.innerHTML = filtered.map((t) => tagRowHtml(t, t.name === state.selectedTag)).join('');
    }
    const ownedCount = filtered.filter((t) => t.isOwned).length;
    if (countsEl) {
      countsEl.textContent = `${filtered.length} / ${state.tagList.length} 태그 · ${ownedCount} owned`;
    }
  }

  function renderDetail() {
    if (!state.selectedTag) {
      tagDetailEl.innerHTML = emptyDetailHtml();
      return;
    }
    const tag = state.tagList.find((t) => t.name === state.selectedTag);
    if (!tag) {
      tagDetailEl.innerHTML = emptyDetailHtml();
      return;
    }
    const notes = allNotes.filter((n) => Array.isArray(n.tags) && n.tags.includes(state.selectedTag));
    tagDetailEl.innerHTML = detailHtml(tag, notes, vaultCatMap, state.collapsedCategories);
  }

  renderTagList();
  renderDetail();

  function onSearchInput(e) {
    state.searchQ = String(e.target.value || '');
    renderTagList();
  }
  function onFilterClick(e) {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    const next = btn.getAttribute('data-filter');
    if (!FILTER_OPTIONS.includes(next) || next === state.filter) return;
    state.filter = next;
    filterSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-filter') === next));
    renderTagList();
  }
  function onSortClick(e) {
    const btn = e.target.closest('button[data-sort]');
    if (!btn) return;
    const next = btn.getAttribute('data-sort');
    if (!SORT_OPTIONS.includes(next) || next === state.sortBy) return;
    state.sortBy = next;
    sortSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-sort') === next));
    renderTagList();
  }
  function onTagListClick(e) {
    const row = e.target.closest('.tag-row');
    if (!row) return;
    const tag = row.getAttribute('data-tag');
    if (!tag) return;
    if (state.selectedTag !== tag) {
      state.selectedTag = tag;
      state.collapsedCategories.clear(); // 새 태그 선택 시 모두 펼침
    }
    renderTagList();
    renderDetail();
  }
  function onDetailClick(e) {
    const head = e.target.closest('[data-cat-head]');
    if (!head) return;
    const cat = head.getAttribute('data-cat-head');
    if (!cat) return;
    if (state.collapsedCategories.has(cat)) state.collapsedCategories.delete(cat);
    else state.collapsedCategories.add(cat);
    renderDetail();
  }
  function onCollapseAll() {
    if (!state.selectedTag) return;
    const tag = state.tagList.find((t) => t.name === state.selectedTag);
    if (!tag) return;
    const notes = allNotes.filter((n) => Array.isArray(n.tags) && n.tags.includes(state.selectedTag));
    const groups = groupNotesByCategory(notes, vaultCatMap);
    for (const g of groups) state.collapsedCategories.add(g.cat);
    renderDetail();
  }
  function onExpandAll() {
    state.collapsedCategories.clear();
    renderDetail();
  }
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

  searchEl.addEventListener('input', onSearchInput);
  filterSeg.addEventListener('click', onFilterClick);
  sortSeg.addEventListener('click', onSortClick);
  tagListEl.addEventListener('click', onTagListClick);
  tagDetailEl.addEventListener('click', onDetailClick);
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', onCollapseAll);
  if (expandAllBtn) expandAllBtn.addEventListener('click', onExpandAll);
  container.addEventListener('click', onObsidianOpenClick, true);

  return {
    destroy() {
      searchEl.removeEventListener('input', onSearchInput);
      filterSeg.removeEventListener('click', onFilterClick);
      sortSeg.removeEventListener('click', onSortClick);
      tagListEl.removeEventListener('click', onTagListClick);
      tagDetailEl.removeEventListener('click', onDetailClick);
      if (collapseAllBtn) collapseAllBtn.removeEventListener('click', onCollapseAll);
      if (expandAllBtn) expandAllBtn.removeEventListener('click', onExpandAll);
      container.removeEventListener('click', onObsidianOpenClick, true);
      container.innerHTML = '';
    },
    refresh(newData) {
      const m = newData?.master || {};
      const fresh = buildVaultCategoryMap(m.vaults);
      for (const k of Object.keys(vaultCatMap)) delete vaultCatMap[k];
      Object.assign(vaultCatMap, fresh);
      state.tagList = buildTagList(newData, vaultCatMap);
      renderTagList();
      renderDetail();
    },
  };
}

export const __internal = {
  buildTagList,
  applyFilters,
  buildVaultCategoryMap,
  tagRowHtml,
  detailHtml,
  groupNotesByCategory,
  categorySectionHtml,
};
