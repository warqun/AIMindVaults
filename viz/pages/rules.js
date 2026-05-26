// AIMindVaults Visualization — AI 룰·스킬 뷰어 페이지 (W5)
// Spec: Phase 2.5 § 5.3 rules · 시안 viz_design_drafts/08_rules.html
// Interface: export async function initPage(container, data, userConfig): Promise<PageContext>

import { renderMarkdown } from '../lib/markdown.js';

const KIND_VAR = { core: '--core', custom: '--custom', hook: '--hook' };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function categoryFromPath(p) {
  const segs = p.split('/').filter(Boolean);
  const root = segs[0] || '';
  let agent = 'other';
  if (root === '.claude') agent = 'claude';
  else if (root === '.codex') agent = 'codex';
  const top = segs[1] || 'other';
  const sub = segs.length >= 4 ? segs[2] : null;
  return [agent, top, sub];
}

function buildRulesTree(items) {
  const tree = {};
  for (const item of items) {
    const [agent, top, sub] = categoryFromPath(item.path);
    if (!tree[agent]) tree[agent] = {};
    if (!tree[agent][top]) tree[agent][top] = {};
    const k = sub || '_';
    if (!tree[agent][top][k]) tree[agent][top][k] = [];
    tree[agent][top][k].push(item);
  }
  return tree;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function renderTree(state, treeEl) {
  treeEl.innerHTML = '';
  const filterText = (state.filter || '').toLowerCase().trim();
  const tree = state.tree;
  const agentOrder = ['claude', 'codex', 'other'];
  const agentLabels = { claude: '.claude/', codex: '.codex/', other: 'other/' };
  const topOrder = { claude: ['rules', 'commands', 'hooks'], codex: ['rules', 'skills'], other: [] };

  for (const agent of agentOrder) {
    const tops = tree[agent];
    if (!tops || Object.keys(tops).length === 0) continue;
    const isAgentCollapsed = state.collapsedAgents.has(agent);
    const agentEl = el('div', 'node', `<span class="ic">${isAgentCollapsed ? '▸' : '▾'}</span>${escapeHtml(agentLabels[agent] || agent)}`);
    agentEl.dataset.kind = 'agent';
    agentEl.dataset.agentKey = agent;
    treeEl.appendChild(agentEl);
    if (isAgentCollapsed) continue;

    const order = topOrder[agent] && topOrder[agent].length ? topOrder[agent] : Object.keys(tops).sort();
    for (const top of order) {
      const subs = tops[top];
      if (!subs) continue;
      const topKey = `${agent}::${top}`;
      const isTopCollapsed = state.collapsedTops.has(topKey);
      const topEl = el('div', 'node ind1', `<span class="ic">${isTopCollapsed ? '▸' : '▾'}</span>${escapeHtml(top)}/`);
      topEl.dataset.kind = 'top';
      topEl.dataset.topKey = topKey;
      treeEl.appendChild(topEl);
      if (isTopCollapsed) continue;

      const subKeys = Object.keys(subs).sort();
      for (const sub of subKeys) {
        const items = subs[sub].slice().sort((a, b) => a.name.localeCompare(b.name));
        const isHookGroup = top === 'hooks';
        const kind = isHookGroup ? 'hook' : (sub === '_' ? 'core' : sub);
        const colorVar = KIND_VAR[kind] || '--core';
        const label = sub === '_' ? '' : `${escapeHtml(sub)}/`;
        const subKey = `${agent}::${top}::${sub}`;
        const isSubCollapsed = !!label && state.collapsedSubs.has(subKey);
        if (label) {
          const subEl = el('div', 'node ind2', `<span class="ic">${isSubCollapsed ? '▸' : '▾'}</span><span class="d" style="background:var(${colorVar})"></span>${label}<span class="count">${items.length}</span>`);
          subEl.dataset.kind = 'sub';
          subEl.dataset.subKey = subKey;
          treeEl.appendChild(subEl);
          if (isSubCollapsed) continue;
        }
        for (const it of items) {
          if (filterText && !it.name.toLowerCase().includes(filterText) && !it.path.toLowerCase().includes(filterText)) continue;
          const fileEl = el('div', 'node file', `<span class="ic"></span>${escapeHtml(it.name)}`);
          fileEl.style.paddingLeft = (isHookGroup || sub === '_') ? '28px' : '42px';
          fileEl.dataset.path = it.path;
          if (it.path === state.selectedPath) fileEl.classList.add('sel');
          treeEl.appendChild(fileEl);
        }
      }
    }
  }
}

function renderEmpty(previewEl) {
  previewEl.innerHTML = `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
      <div class="hint">좌측 트리에서 룰·스킬·후크를 선택하면 마크다운이 여기에 표시됩니다.</div>
    </div>`;
}

function renderItemPreview(previewEl, item) {
  const colorVar = KIND_VAR[item.kind] || '--core';
  const isPython = item.name.endsWith('.py');
  const bodyHtml = isPython
    ? `<pre class="md-code" data-lang="python"><code>${escapeHtml(item.content)}</code></pre>`
    : renderMarkdown(item.content);
  const titleMatch = item.content.match(/^#\s+(.+)$/m);
  const title = (titleMatch ? titleMatch[1] : item.name).trim();
  previewEl.innerHTML = `
    <div class="pmeta">
      <span class="kind" style="background:var(${colorVar})">${escapeHtml(item.kind)}</span>
      <span class="path">${escapeHtml(item.path)}</span>
    </div>
    <div class="ptitle">${escapeHtml(title)}</div>
    <div class="pbody">${bodyHtml}</div>`;
}

export async function initPage(container, data, userConfig) {
  container.innerHTML = `
    <div class="rules-page">
      <div class="toolbar">
        <div class="tool-group">
          <span class="tool-label">검색</span>
          <input type="text" class="search-input" id="rules-search" placeholder="룰·스킬 이름 부분 일치..." />
        </div>
        <div class="tool-group kind-legend">
          <span class="l"><span class="d" style="background:var(--core)"></span>core (배포)</span>
          <span class="l"><span class="d" style="background:var(--custom)"></span>custom (개인)</span>
          <span class="l"><span class="d" style="background:var(--hook)"></span>hook (자동)</span>
        </div>
      </div>
      <div class="main tree-preview">
        <div class="tree-wrap"><div class="tree" id="rules-tree"></div></div>
        <div class="preview" id="rules-preview"></div>
      </div>
    </div>`;

  const treeEl = container.querySelector('#rules-tree');
  const previewEl = container.querySelector('#rules-preview');
  const searchEl = container.querySelector('#rules-search');

  const state = {
    items: [], byPath: {}, tree: {}, filter: '',
    collapsedAgents: new Set(),
    collapsedTops: new Set(),
    collapsedSubs: new Set(),
    selectedPath: null,
  };

  treeEl.innerHTML = '<div class="empty"><div class="hint">로드 중...</div></div>';
  renderEmpty(previewEl);

  try {
    const r = await fetch('/api/rules', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    state.items = await r.json();
    for (const it of state.items) state.byPath[it.path] = it;
    state.tree = buildRulesTree(state.items);
    renderTree(state, treeEl);
  } catch (err) {
    treeEl.innerHTML = `<div class="empty"><div class="hint">/api/rules 실패: ${escapeHtml(err.message)}</div></div>`;
  }

  const onSearch = () => {
    state.filter = searchEl.value;
    if (state.filter) {
      // 검색 시 모든 레벨 펼쳐 매칭 노출
      state.collapsedAgents.clear();
      state.collapsedTops.clear();
      state.collapsedSubs.clear();
    }
    renderTree(state, treeEl);
  };
  searchEl.addEventListener('input', onSearch);

  const onTreeClick = (ev) => {
    const node = ev.target.closest('.node');
    if (!node) return;
    const kind = node.dataset.kind;
    if (kind === 'agent') {
      const k = node.dataset.agentKey;
      if (state.collapsedAgents.has(k)) state.collapsedAgents.delete(k);
      else state.collapsedAgents.add(k);
      renderTree(state, treeEl);
      return;
    }
    if (kind === 'top') {
      const k = node.dataset.topKey;
      if (state.collapsedTops.has(k)) state.collapsedTops.delete(k);
      else state.collapsedTops.add(k);
      renderTree(state, treeEl);
      return;
    }
    if (kind === 'sub') {
      const k = node.dataset.subKey;
      if (state.collapsedSubs.has(k)) state.collapsedSubs.delete(k);
      else state.collapsedSubs.add(k);
      renderTree(state, treeEl);
      return;
    }
    // file 클릭
    if (!node.dataset.path) return;
    treeEl.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
    node.classList.add('sel');
    state.selectedPath = node.dataset.path;
    const item = state.byPath[node.dataset.path];
    if (item) renderItemPreview(previewEl, item);
  };
  treeEl.addEventListener('click', onTreeClick);

  return {
    destroy() {
      searchEl.removeEventListener('input', onSearch);
      treeEl.removeEventListener('click', onTreeClick);
      container.innerHTML = '';
    },
  };
}
