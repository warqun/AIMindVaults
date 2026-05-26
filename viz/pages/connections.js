/**
 * Phase 2.9 Phase 5 — Cross-Vault Connections 페이지 (구 concepts.js)
 * 5-12 결정 (concept_map → connections, 의미 명확화) 반영.
 *
 * Sankey 3-단 (owner vault → tag → user vault) + topN 슬라이더 (3~20, default 8) +
 * 검색 (tag 이름 부분 일치) + 우측 패널 (owner · tag · user 세 모드).
 *
 * 데이터 모델: master.concept_map + master.vaults + master.tag_index 로부터
 * `deriveConnections(master)` 가 `{tag, owner, users, ownedNotes, userNotes}` 도출.
 * owner = vault_id 가 tag 와 정확 일치하는 vault. owner-null 자동 제외.
 *
 * 외부 의존성 0. ECharts 는 index.html 의 CDN 으로 window.echarts 글로벌 사용.
 *
 * @typedef {import('../lib/loadIndex.js').IndexData} IndexData
 * @typedef {Object} UserConfig — viz/lib/buildOption.js DEFAULT_USER_CONFIG 와 동일 구조
 *
 * @typedef {Object} PageContext
 * @property {() => void} destroy
 * @property {(data: IndexData) => void} refresh
 */

import { buildOptionConnections, deriveConnections, buildVaultColor } from '../lib/buildOption.js';
import { saveUserConfig } from '../lib/user-config.js';

const TOP_N_DEFAULT = 8;
const TOP_N_MIN = 3;
const TOP_N_MAX = 20;

const TEMPLATE = `
<div class="toolbar">
  <div class="tool-group">
    <span class="tool-label">상위 connection (user 노트 합산 순)</span>
    <div class="range-wrap">
      <input type="range" data-role="topn" min="${TOP_N_MIN}" max="${TOP_N_MAX}" value="${TOP_N_DEFAULT}">
      <span class="val" data-role="topn-val">${TOP_N_DEFAULT}</span>
    </div>
  </div>
  <div class="tool-group">
    <span class="tool-label">검색</span>
    <input type="text" class="search-input" data-role="search" placeholder="태그 이름 부분 일치...">
  </div>
  <div class="tool-group swatches">
    <span class="sw"><span class="d" style="background:var(--domain)"></span>Domains</span>
    <span class="sw"><span class="d" style="background:var(--project)"></span>Projects</span>
    <span class="sw"><span class="d" style="background:var(--lab)"></span>Lab</span>
    <span class="sw"><span class="d" style="background:var(--basic)"></span>Basic</span>
    <span class="sw"><span class="d" style="background:var(--personal)"></span>Personal</span>
    <span class="sw"><span class="d" style="background:var(--art)"></span>Art</span>
  </div>
</div>
<div class="main">
  <div class="chart-wrap" style="position:relative">
    <div class="chart-head">
      <span class="chart-title">Cross-Vault Connections (owner → tag → user)</span>
      <span style="display:flex;align-items:center;gap:10px">
        <span class="chart-meta">left: owner vault · middle: tag · right: user vault · width: notes</span>
        <button data-color-panel-toggle style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 10px;cursor:pointer;color:var(--text-2);font-size:11px;white-space:nowrap">볼트 색</button>
      </span>
    </div>
    <div class="vault-color-panel" data-color-panel hidden style="position:absolute;top:50px;right:18px;z-index:10;width:264px;max-height:calc(100% - 70px);overflow-y:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:8px;box-shadow:var(--shadow-hover);padding:12px">
      <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--text)">볼트 색</span>
        <span style="font-size:10px;color:var(--text-3)">개별 색 지정 · 빈 칸은 카테고리 기본색</span>
      </div>
      <div data-color-panel-list></div>
    </div>
    <div class="chart" data-role="sankey"></div>
  </div>
  <aside class="side" data-role="side">
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>
      <div class="hint">좌측 owner, 중간 tag, 우측 user 를 클릭하면 상세가 펼쳐집니다.</div>
    </div>
  </aside>
</div>
`;

function cssVar(name) {
  if (typeof document === 'undefined') return '';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v || '').trim();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function categoryOf(vaultMeta) {
  if (!vaultMeta || typeof vaultMeta.path !== 'string') return '';
  const parts = vaultMeta.path.split('/');
  return parts[1] || '';
}

function categoryGroupVar(category) {
  if (!category) return '--basic';
  if (category === 'Domain_Art') return '--art';
  if (category.startsWith('Domains_') || category.startsWith('Domain_')) return '--domain';
  if (category.startsWith('Projects_')) return '--project';
  if (category.startsWith('Lab_')) return '--lab';
  if (category === 'Personal') return '--personal';
  if (category === 'BasicVaults') return '--basic';
  return '--basic';
}

function categoryGroupColor(category) {
  return cssVar(categoryGroupVar(category));
}

export function filterBySearch(connections, searchQ) {
  const q = (searchQ || '').trim().toLowerCase();
  if (!q) return connections;
  return connections.filter((c) => String(c.tag).toLowerCase().includes(q));
}

export function pickTopByUserNotes(connections, n) {
  const limit = Math.max(0, Number.isFinite(n) ? n : 0);
  return [...connections]
    .sort((a, b) => {
      const aSum = a.userNotes.reduce((s, x) => s + x.count, 0);
      const bSum = b.userNotes.reduce((s, x) => s + x.count, 0);
      if (bSum !== aSum) return bSum - aSum;
      return (b.totalCount || 0) - (a.totalCount || 0);
    })
    .slice(0, limit);
}

function applyOverlay(option) {
  if (!option || !Array.isArray(option.series) || !option.series[0]) return option;
  const series = option.series[0];
  const labelColor = cssVar('--text-2') || '#888';

  series.label = {
    ...(series.label || {}),
    color: labelColor,
    fontSize: 11,
    fontFamily: 'Inter',
    formatter: (p) => {
      const nm = String(p.name || '');
      const i = nm.indexOf(':');
      return i > 0 ? nm.slice(i + 1) : nm;
    },
  };
  series.emphasis = { ...(series.emphasis || {}), focus: 'adjacency', lineStyle: { opacity: 0.85 } };

  return option;
}

function renderOwnerPanel(side, data, ownerId, conn) {
  const masterIn = (data && data.master) || {};
  const vaultsObj = masterIn.vaults || {};
  const meta = vaultsObj[ownerId] || {};
  const userItems = (conn?.userNotes || [])
    .filter((u) => u.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((u) => {
      const col = categoryGroupColor(categoryOf(vaultsObj[u.vault]));
      return `<li><span class="nm"><span class="d" style="background:${col}"></span>${escapeHtml(u.vault)}</span><span class="ct">${u.count} 노트</span></li>`;
    }).join('');
  const userSum = (conn?.userNotes || []).reduce((s, x) => s + x.count, 0);
  side.innerHTML = `
    <div class="panel">
      <span class="kind">OWNER</span>
      <div class="ttl">${escapeHtml(ownerId)}</div>
      <div class="meta">tag: ${escapeHtml(conn?.tag || '-')} · category: ${escapeHtml(categoryOf(meta) || '-')}</div>
      <div class="stats">
        <div class="s"><div class="v">${conn?.ownedNotes ?? 0}</div><div class="l">Owned Notes</div></div>
        <div class="s"><div class="v">${userSum}</div><div class="l">User Notes</div></div>
      </div>
      <h4>이 owned tag 를 쓰는 user 볼트</h4>
      <ul>${userItems || '<li><span class="nm" style="color:var(--text-3)">user 없음</span></li>'}</ul>
    </div>`;
}

function renderTagPanel(side, conn) {
  const userSum = (conn?.userNotes || []).reduce((s, x) => s + x.count, 0);
  const userItems = (conn?.userNotes || [])
    .filter((u) => u.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((u) => `<li><span class="nm">${escapeHtml(u.vault)}</span><span class="ct">${u.count} 노트</span></li>`)
    .join('');
  side.innerHTML = `
    <div class="panel">
      <span class="kind">TAG</span>
      <div class="ttl">${escapeHtml(conn?.tag || '-')}</div>
      <div class="meta">owner: ${escapeHtml(conn?.owner || '-')} · ${(conn?.users || []).length} user 볼트</div>
      <div class="stats">
        <div class="s"><div class="v">${conn?.ownedNotes ?? 0}</div><div class="l">Owner</div></div>
        <div class="s"><div class="v">${userSum}</div><div class="l">Users</div></div>
      </div>
      <h4>분포</h4>
      <ul>${userItems || '<li><span class="nm" style="color:var(--text-3)">user 분포 없음</span></li>'}</ul>
    </div>`;
}

function renderUserPanel(side, data, userId, connections) {
  const masterIn = (data && data.master) || {};
  const vaultsObj = masterIn.vaults || {};
  const meta = vaultsObj[userId] || {};
  const involved = [];
  for (const c of connections) {
    const cnt = (c.userNotes.find((u) => u.vault === userId) || {}).count || 0;
    if (cnt > 0) involved.push({ tag: c.tag, owner: c.owner, count: cnt });
  }
  involved.sort((a, b) => b.count - a.count);
  const total = involved.reduce((s, x) => s + x.count, 0);
  const items = involved.slice(0, 8).map((d) =>
    `<li><span class="nm">${escapeHtml(d.tag)} <small style="color:var(--text-3)">← ${escapeHtml(d.owner)}</small></span><span class="ct">${d.count} 노트</span></li>`
  ).join('');
  side.innerHTML = `
    <div class="panel">
      <span class="kind">USER</span>
      <div class="ttl">${escapeHtml(userId)}</div>
      <div class="meta">category: ${escapeHtml(categoryOf(meta) || '-')}</div>
      <div class="stats">
        <div class="s"><div class="v">${involved.length}</div><div class="l">Used owned tags</div></div>
        <div class="s"><div class="v">${total}</div><div class="l">Note refs</div></div>
      </div>
      <h4>이 볼트가 참조하는 owned tag (top 8)</h4>
      <ul>${items || '<li><span class="nm" style="color:var(--text-3)">참조 없음</span></li>'}</ul>
    </div>`;
}

/**
 * spec § 5.1 표준 시그니처.
 *
 * @param {HTMLElement} container
 * @param {IndexData} data
 * @param {UserConfig} [userConfig]
 * @returns {Promise<PageContext>}
 */
export async function initPage(container, data, userConfig) {
  if (!container || typeof container.querySelector !== 'function') {
    throw new Error('initPage(connections): container 누락 또는 HTMLElement 아님');
  }
  if (typeof window === 'undefined' || !window.echarts) {
    throw new Error('initPage(connections): ECharts 미로드 (index.html CDN 확인)');
  }

  container.innerHTML = TEMPLATE;
  const elTopN = container.querySelector('[data-role="topn"]');
  const elTopNVal = container.querySelector('[data-role="topn-val"]');
  const elSearch = container.querySelector('[data-role="search"]');
  const elSankey = container.querySelector('[data-role="sankey"]');
  const elSide = container.querySelector('[data-role="side"]');

  const state = {
    data: data || { master: {} },
    userConfig: userConfig || {},
    topN: TOP_N_DEFAULT,
    searchQ: '',
  };

  const chart = window.echarts.init(elSankey);

  function currentConnections() {
    const master = (state.data && state.data.master) || {};
    return deriveConnections(master).filter((c) => c.owner !== null);
  }

  function render() {
    const all = currentConnections();
    const filtered = filterBySearch(all, state.searchQ);
    const picked = pickTopByUserNotes(filtered, state.topN);
    // buildOptionConnections 자체 topNConcepts 절단을 우회 — 검색·topN 사전 적용 결과를
    // master.connections 로 주입 (Array.isArray 우선 분기 활용)
    const subset = {
      ...state.data,
      master: {
        ...(state.data?.master || {}),
        connections: picked,
      },
    };
    const cfg = { ...state.userConfig, topNConcepts: Math.max(picked.length, 1) };
    const option = applyOverlay(buildOptionConnections(subset, cfg));
    chart.setOption(option, true);
  }

  function onClick(p) {
    if (!p || p.dataType !== 'node') return;
    const nm = String(p.name || '');
    const i = nm.indexOf(':');
    if (i <= 0) return;
    const kind = nm.slice(0, i);
    const id = nm.slice(i + 1);
    const all = currentConnections();
    if (kind === 'owner') {
      const conn = all.find((c) => c.owner === id);
      renderOwnerPanel(elSide, state.data, id, conn);
    } else if (kind === 'tag') {
      const conn = all.find((c) => c.tag === id);
      renderTagPanel(elSide, conn);
    } else if (kind === 'user') {
      renderUserPanel(elSide, state.data, id, all);
    }
  }

  function onTopN(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v)) return;
    state.topN = v;
    elTopNVal.textContent = String(v);
    render();
  }

  function onSearch(e) {
    state.searchQ = String(e.target.value || '').trim();
    render();
  }

  function onResize() { chart.resize(); }

  const themeObserver = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-theme') { render(); break; }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  elTopN.addEventListener('input', onTopN);
  elSearch.addEventListener('input', onSearch);
  window.addEventListener('resize', onResize);
  chart.on('click', onClick);

  // ── 볼트 색 패널 ── network 와 동일 패턴. input 중 패널 DOM 은 유지하고 차트만 재빌드 → color picker 보존.
  const colorPanel = container.querySelector('[data-color-panel]');
  const colorToggle = container.querySelector('[data-color-panel-toggle]');
  const colorList = container.querySelector('[data-color-panel-list]');
  function renderColorPanel() {
    if (!colorList) return;
    const vaultsObj = (state.data && state.data.master && state.data.master.vaults) || {};
    const colors = (state.userConfig && state.userConfig.colors) || {};
    const ids = Object.keys(vaultsObj).sort();
    colorList.innerHTML = ids.map((id) => {
      const cur = buildVaultColor(id, state.userConfig, vaultsObj[id]);
      const isOv = !!colors[id];
      return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
        <input type="color" data-vc="${escapeHtml(id)}" value="${escapeHtml(cur)}" style="width:28px;height:22px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:transparent;padding:0;flex-shrink:0" />
        <span title="${escapeHtml(id)}" style="flex:1;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(id)}</span>
        ${isOv ? `<span data-vc-reset="${escapeHtml(id)}" title="카테고리 기본색으로" style="font-size:12px;color:var(--text-3);cursor:pointer;flex-shrink:0">↺</span>` : ''}
      </div>`;
    }).join('');
  }
  function broadcastUserConfig() {
    try { window.dispatchEvent(new CustomEvent('aimv:user-config-changed', { detail: { config: state.userConfig } })); } catch (e) { /* noop */ }
  }
  if (colorToggle) colorToggle.addEventListener('click', () => {
    if (!colorPanel) return;
    if (colorPanel.hasAttribute('hidden')) { renderColorPanel(); colorPanel.removeAttribute('hidden'); }
    else colorPanel.setAttribute('hidden', '');
  });
  if (colorPanel) {
    colorPanel.addEventListener('input', (ev) => {
      const inp = ev.target.closest('input[data-vc]');
      if (!inp) return;
      if (!state.userConfig.colors) state.userConfig.colors = {};
      state.userConfig.colors[inp.dataset.vc] = inp.value;
      render();
      saveUserConfig(state.userConfig);
    });
    colorPanel.addEventListener('change', (ev) => {
      if (ev.target.closest('input[data-vc]')) { broadcastUserConfig(); renderColorPanel(); }
    });
    colorPanel.addEventListener('click', (ev) => {
      const rb = ev.target.closest('[data-vc-reset]');
      if (!rb) return;
      if (state.userConfig.colors) delete state.userConfig.colors[rb.dataset.vcReset];
      render();
      saveUserConfig(state.userConfig);
      broadcastUserConfig();
      renderColorPanel();
    });
  }
  function onDocClickOutside(ev) {
    if (!colorPanel || colorPanel.hasAttribute('hidden')) return;
    if (colorPanel.contains(ev.target)) return;
    if (colorToggle && colorToggle.contains(ev.target)) return;
    colorPanel.setAttribute('hidden', '');
  }
  document.addEventListener('click', onDocClickOutside);

  render();

  return {
    destroy() {
      try { chart.off('click', onClick); } catch (_) { /* noop */ }
      try { chart.dispose(); } catch (_) { /* noop */ }
      window.removeEventListener('resize', onResize);
      document.removeEventListener('click', onDocClickOutside);
      elTopN.removeEventListener('input', onTopN);
      elSearch.removeEventListener('input', onSearch);
      themeObserver.disconnect();
      container.innerHTML = '';
    },
    refresh(newData) {
      if (newData && typeof newData === 'object') state.data = newData;
      render();
    },
  };
}

export const __internal = {
  TOP_N_DEFAULT,
  TOP_N_MIN,
  TOP_N_MAX,
  filterBySearch,
  pickTopByUserNotes,
  applyOverlay,
  categoryOf,
  categoryGroupVar,
};
