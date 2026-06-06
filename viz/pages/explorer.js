/**
 * AIMindVaults Visualization — Vault Explorer 페이지 (W5)
 *
 * 역할:
 *   좌측 트리 (카테고리 → 볼트 → 디렉토리 → 노트) + 우측 preview (frontmatter + body markdown).
 *   카테고리·볼트·디렉토리 각 레벨 접기/펼치기 + 검색 (이름·경로 부분 일치) + Obsidian 열기.
 *
 * 트리 구조:
 *   - 카테고리 (Domains_Game / Projects_Infra / ... — vault meta.path 의 두 번째 segment)
 *     └ 볼트 (vault_id) — 노트 수 표시 + Obsidian 열기 ↗
 *         └ 디렉토리 (notes path 의 segment, 재귀)
 *             └ 노트 (file) — Obsidian 열기 ↗ + 클릭 시 우측 preview
 *
 * 데이터 입력:
 *   - data.master.vaults — vault 메타 (path → categoryOf)
 *   - data.master.notes  — vault_id 별 노트 + path
 *   - GET /api/note?vault=&path= — preview 로드 (raw markdown)
 *
 * 주요 함수 카탈로그:
 *   - initPage                          ← 진입점, state + 트리/검색/click 핸들러
 *   - buildVaultTrees                   ← master → { byVault, byCat } 트리 데이터
 *   - buildVaultPathTree / insertIntoTree ← 노트 path → 디렉토리 트리
 *   - renderTreeNodes / renderPathTreeInto ← 트리 DOM 렌더 (재귀)
 *   - renderEmptyPreview / renderNotePreview ← preview 영역
 *   - CATEGORY_COLOR_VAR                ← 카테고리 → CSS 변수 매핑 (사용자 카테고리 추가 시 보강 필요)
 *
 * 표준 시그니처:
 *   export async function initPage(container, data, userConfig): Promise<PageContext>
 *
 * 참조:
 *   Spec:    [[20260513_시스템스펙_04_시각화]] § 5 page mapping (explorer)
 *   시안:    viz_design_drafts/07_explorer.html
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.7
 */

import { renderMarkdown, splitFrontmatter } from '../lib/markdown.js';
import { openNote, openVault } from '../lib/obsidian-uri.js';

const CATEGORY_COLOR_VAR = {
  BasicVaults: '--basic',
  Domains_Game: '--domain',
  Domains_Infra: '--domain',
  Domains_Dev: '--domain',
  Domains_3D: '--domain',
  Domains_AI_Asset: '--domain',
  Domains_Manufacturing: '--domain',
  Domains_Cooking: '--domain',
  Domains_Business: '--domain',
  Domains_Personal: '--personal',
  Domains_Art: '--art',
  Domain_Art: '--art',
  Lab_Game: '--lab',
  Lab_Infra: '--lab',
  Projects_Infra: '--project',
  Projects_Game: '--project',
  Projects_Toolkit: '--project',
  Personal: '--personal',
};

function categoryOf(vaultMeta) {
  return (vaultMeta?.path || '').split('/')[1] || 'unknown';
}

/**
 * master.{notes, vaults} → 트리 데이터 2 종:
 *   - byVault[vault_id] = [notes...]              ← 빠른 vault → notes lookup
 *   - byCat[category]   = [{vaultId, meta, notes}...] ← 카테고리 그룹 (트리 렌더 source)
 */
function buildVaultTrees(master) {
  const byVault = {};
  for (const n of master.notes) {
    if (!byVault[n.vault_id]) byVault[n.vault_id] = [];
    byVault[n.vault_id].push(n);
  }
  const byCat = {};
  for (const [vaultId, meta] of Object.entries(master.vaults)) {
    const cat = categoryOf(meta);
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ vaultId, meta, notes: byVault[vaultId] || [] });
  }
  return { byVault, byCat };
}

function insertIntoTree(root, parts, leaf) {
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    if (!cur.dirs[seg]) cur.dirs[seg] = { dirs: {}, files: [] };
    cur = cur.dirs[seg];
  }
  cur.files.push(leaf);
}

function buildVaultPathTree(notes) {
  const root = { dirs: {}, files: [] };
  for (const n of notes) {
    const parts = n.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;
    insertIntoTree(root, parts, n);
  }
  return root;
}

/**
 * 트리 DOM 렌더 (in-place innerHTML 갱신). 카테고리 → 볼트 → 디렉토리 → 노트 재귀.
 * 검색 활성 시 filterText 가 file 노드를 (title + path) 부분 일치로 필터.
 * state.collapsedCats / expandedVaults / collapsedDirs / selectedNote 반영.
 */
function renderTreeNodes(state, treeWrap) {
  const frag = document.createDocumentFragment();
  const filterText = (state.filter || '').toLowerCase().trim();

  const cats = Object.keys(state.trees.byCat).sort();
  for (const cat of cats) {
    const catVar = CATEGORY_COLOR_VAR[cat] || '--basic';
    const isCatCollapsed = state.collapsedCats.has(cat);
    const catNode = el('div', 'node', `<span class="ic">${isCatCollapsed ? '▸' : '▾'}</span><span class="d" style="background:var(${catVar})"></span>${escapeHtml(cat)}/<span class="count">${state.trees.byCat[cat].length}</span>`);
    catNode.dataset.kind = 'cat';
    catNode.dataset.catKey = cat;
    frag.appendChild(catNode);
    if (isCatCollapsed) continue;

    for (const v of state.trees.byCat[cat].sort((a, b) => a.vaultId.localeCompare(b.vaultId))) {
      const expanded = state.expandedVaults.has(v.vaultId);
      const vaultNode = el('div', 'node ind1', `<span class="ic">${expanded ? '▾' : '▸'}</span>${escapeHtml(v.vaultId)}<span class="count">${v.notes.length}</span><button class="open-obs" data-open-vault="${escapeHtml(v.vaultId)}" title="Obsidian 으로 볼트 열기">↗</button>`);
      vaultNode.dataset.kind = 'vault';
      vaultNode.dataset.vaultId = v.vaultId;
      frag.appendChild(vaultNode);
      if (expanded) {
        const pathTree = buildVaultPathTree(v.notes);
        renderPathTreeInto(frag, pathTree, v.vaultId, 2, state, filterText, '');
      }
    }
  }
  treeWrap.innerHTML = '';
  treeWrap.appendChild(frag);
}

function renderPathTreeInto(target, node, vaultId, depth, state, filterText, currentPath) {
  const dirs = Object.keys(node.dirs).sort();
  for (const d of dirs) {
    const fullPath = currentPath ? `${currentPath}/${d}` : d;
    const dirKey = `${vaultId}::${fullPath}`;
    const isDirCollapsed = state.collapsedDirs.has(dirKey);
    const dirEl = el('div', `node ind${Math.min(depth, 4)}`, `<span class="ic">${isDirCollapsed ? '▸' : '▾'}</span>${escapeHtml(d)}/`);
    dirEl.dataset.kind = 'dir';
    dirEl.dataset.dirKey = dirKey;
    target.appendChild(dirEl);
    if (!isDirCollapsed) {
      renderPathTreeInto(target, node.dirs[d], vaultId, depth + 1, state, filterText, fullPath);
    }
  }
  for (const f of node.files.sort((a, b) => (a.title || a.path).localeCompare(b.title || b.path))) {
    if (filterText && !((f.title || '') + ' ' + f.path).toLowerCase().includes(filterText)) continue;
    const padPx = 14 + Math.min(depth, 6) * 14;
    const fileEl = el('div', `node file`, `<span class="ic"></span>${escapeHtml(f.title || f.path.split('/').pop())}<button class="open-obs" data-open-note="${escapeHtml(f.vault_id)}|${escapeHtml(f.path)}" title="Obsidian 으로 노트 열기">↗</button>`);
    fileEl.style.paddingLeft = `${padPx}px`;
    fileEl.dataset.kind = 'note';
    fileEl.dataset.vaultId = f.vault_id;
    fileEl.dataset.notePath = f.path;
    if (state.selectedNote && state.selectedNote.vaultId === f.vault_id && state.selectedNote.notePath === f.path) {
      fileEl.classList.add('sel');
    }
    target.appendChild(fileEl);
  }
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderEmptyPreview(previewEl) {
  previewEl.innerHTML = `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
      <div class="hint">좌측 트리에서 노트를 선택하면 frontmatter 와 본문이 여기에 표시됩니다.</div>
    </div>`;
}

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

async function fetchNote(vaultId, notePath) {
  const url = `/api/note?vault=${encodeURIComponent(vaultId)}&path=${encodeURIComponent(notePath)}`;
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`fetch ${r.status}: ${await r.text()}`);
  return r.text();
}

/**
 * Explorer 페이지 진입점. 트리 렌더 + 검색 + click 위임 (카테고리/볼트/디렉토리/노트 분기).
 * 노트 클릭 시 /api/note 로 raw 로드 → renderNotePreview (frontmatter highlight + body markdown).
 * 검색 활성 시 모든 카테고리·볼트·디렉토리 자동 펼침 (매칭 노출).
 */
export async function initPage(container, data, userConfig) {
  container.innerHTML = `
    <div class="explorer-page">
      <div class="toolbar">
        <div class="tool-group">
          <span class="tool-label">검색</span>
          <input type="text" class="search-input" id="exp-search" placeholder="볼트·노트 이름 부분 일치..." />
        </div>
        <div class="tool-group">
          <span class="crumb-path" id="exp-crumb">노트를 선택하세요</span>
        </div>
      </div>
      <div class="main tree-preview">
        <div class="tree-wrap"><div class="tree" id="exp-tree"></div></div>
        <div class="preview" id="exp-preview"></div>
      </div>
    </div>`;

  const treeEl = container.querySelector('#exp-tree');
  const previewEl = container.querySelector('#exp-preview');
  const searchEl = container.querySelector('#exp-search');
  const crumbEl = container.querySelector('#exp-crumb');

  const state = {
    trees: buildVaultTrees(data.master),
    filter: '',
    expandedVaults: new Set(),
    collapsedCats: new Set(),
    collapsedDirs: new Set(),
    selectedNote: null,
  };

  renderEmptyPreview(previewEl);
  renderTreeNodes(state, treeEl);

  const onSearch = () => {
    state.filter = searchEl.value;
    if (state.filter) {
      // 검색 시 모든 카테고리·볼트·폴더 펼쳐서 매칭 노출
      for (const cat of Object.keys(state.trees.byCat)) {
        state.collapsedCats.delete(cat);
        for (const v of state.trees.byCat[cat]) state.expandedVaults.add(v.vaultId);
      }
      state.collapsedDirs.clear();
    }
    renderTreeNodes(state, treeEl);
  };
  searchEl.addEventListener('input', onSearch);

  const onTreeClick = async (ev) => {
    const node = ev.target.closest('.node');
    if (!node) return;
    const kind = node.dataset.kind;
    if (kind === 'cat') {
      const k = node.dataset.catKey;
      if (state.collapsedCats.has(k)) state.collapsedCats.delete(k);
      else state.collapsedCats.add(k);
      renderTreeNodes(state, treeEl);
      return;
    }
    if (kind === 'vault') {
      const vid = node.dataset.vaultId;
      if (state.expandedVaults.has(vid)) state.expandedVaults.delete(vid);
      else state.expandedVaults.add(vid);
      renderTreeNodes(state, treeEl);
      return;
    }
    if (kind === 'dir') {
      const k = node.dataset.dirKey;
      if (state.collapsedDirs.has(k)) state.collapsedDirs.delete(k);
      else state.collapsedDirs.add(k);
      renderTreeNodes(state, treeEl);
      return;
    }
    if (kind === 'note') {
      treeEl.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
      node.classList.add('sel');
      const { vaultId, notePath } = node.dataset;
      state.selectedNote = { vaultId, notePath };
      crumbEl.textContent = `${vaultId} / ${notePath}`;
      previewEl.innerHTML = '<div class="empty"><div class="hint">로드 중...</div></div>';
      try {
        const raw = await fetchNote(vaultId, notePath);
        renderNotePreview(previewEl, vaultId, notePath, raw);
      } catch (err) {
        previewEl.innerHTML = `<div class="empty"><div class="hint">불러오기 실패: ${escapeHtml(err.message)}</div></div>`;
      }
    }
  };
  treeEl.addEventListener('click', onTreeClick);

  // Obsidian 열기 delegate (capture phase 로 onTreeClick 보다 먼저)
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

  return {
    destroy() {
      searchEl.removeEventListener('input', onSearch);
      treeEl.removeEventListener('click', onTreeClick);
      container.removeEventListener('click', onObsidianOpenClick, true);
      container.innerHTML = '';
    },
    refresh(newData) {
      state.trees = buildVaultTrees(newData.master);
      renderTreeNodes(state, treeEl);
    },
  };
}
