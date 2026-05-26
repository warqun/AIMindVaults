/**
 * Phase 2.7 — network 페이지 본체 (모듈 통합)
 * spec § 3: Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/spec/20260508_그래프뷰_안정화_인터페이스_명세.md
 *
 * 책임:
 *  - DOM 삽입 (toolbar + chart + side-panel) + 시안 04 정합
 *  - W3 hubs / W1 handlers / W2 sliders / W4 labels / W5 sse-diff 모듈 통합
 *  - buildOptionFromData wrapper (buildOptionA + addCategoryHubs + applyPerformanceOptions + force 슬라이더 값)
 *  - 카테고리 필터 + node/edge multiplier 슬라이더 (toolbar 별도 핸들러)
 *  - destroy / refresh API 유지 (router 호환)
 *
 * 외부 의존성: ECharts CDN (window.echarts)
 *
 * @typedef {import('../lib/loadIndex.js').IndexData} IndexData
 * @typedef {Object} PageContext
 * @property {() => void} destroy
 * @property {(data: IndexData) => void} refresh
 */

import { buildOptionA, deriveConnections } from '../lib/buildOption.js';
import { addCategoryHubs, HUB_ID_PREFIX } from '../lib/hubs.js';
import { maskVaultName } from '../lib/mask.js';
import { setupConditionalFreeze, setupDragLock, setupThemeObserver } from './network/handlers.js';
import { setupSliders, loadNetworkConfig, DEFAULT_NETWORK_CONFIG } from './network/sliders.js';
import { setupLabels } from './network/labels.js';
import { applyPerformanceOptions, setupSseDiff } from './network/sse-diff.js';
import { saveUserConfig } from '../lib/user-config.js';

const COARSE_CATS = ['domain', 'project', 'lab', 'basic', 'personal', 'art'];
const PAGE_STYLE_ID = 'aimv-network-page-styles';

function coarseCategory(rawCategory) {
  if (!rawCategory) return 'basic';
  if (rawCategory === 'Domain_Art') return 'art';
  if (rawCategory.startsWith('Domains_')) return 'domain';
  if (rawCategory.startsWith('Projects_')) return 'project';
  if (rawCategory.startsWith('Lab_')) return 'lab';
  if (rawCategory === 'Personal') return 'personal';
  if (rawCategory === 'BasicVaults') return 'basic';
  return 'basic';
}

function clampRange(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensurePageStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PAGE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = `
.network-page{display:flex;flex-direction:column;flex:1;min-height:0;gap:16px}
.network-page .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);flex-wrap:wrap}
.network-page .tool-group{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.network-page .tool-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-3);letter-spacing:.08em;text-transform:uppercase}
.network-page .range-wrap{display:flex;align-items:center;gap:6px}
.network-page .range-wrap input[type=range]{accent-color:var(--accent);width:100px}
.network-page .range-wrap .val{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2);min-width:32px;text-align:right;font-weight:500}
.network-page .slider-reset{background:none;border:1px solid var(--border);border-radius:3px;padding:1px 6px;cursor:pointer;color:var(--text-3);font-size:11px;line-height:1.2;transition:.15s}
.network-page .slider-reset:hover{color:var(--accent);border-color:var(--accent)}
.network-page .cat-filter{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.network-page .cat-filter label{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2);padding:3px 8px;border:1px solid var(--border);border-radius:4px;cursor:pointer;transition:.15s}
.network-page .cat-filter label:hover{border-color:var(--border-strong)}
.network-page .cat-filter input{accent-color:var(--accent);width:11px;height:11px}
.network-page .cat-filter .d{width:8px;height:8px;border-radius:50%;display:inline-block}
.network-page .main{display:grid;grid-template-columns:1fr 320px;gap:16px;flex:1;min-height:0}
.network-page .chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);padding:16px;display:flex;flex-direction:column;min-height:0;position:relative}
.network-page .vc-toggle{background:none;border:1px solid var(--border);border-radius:4px;padding:3px 10px;cursor:pointer;color:var(--text-2);font-size:11px;white-space:nowrap}
.network-page .vc-toggle:hover{border-color:var(--accent);color:var(--accent)}
.network-page .vault-color-panel{position:absolute;top:50px;right:18px;z-index:10;width:264px;max-height:calc(100% - 70px);overflow-y:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:8px;box-shadow:var(--shadow-hover);padding:12px}
.network-page .vault-color-panel[hidden]{display:none}
.network-page .vc-head{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
.network-page .vc-head .t{font-size:12px;font-weight:600;color:var(--text)}
.network-page .vc-head .vc-hint{font-size:10px;color:var(--text-3)}
.network-page .vc-row{display:flex;align-items:center;gap:8px;padding:3px 0}
.network-page .vc-row input[type=color]{width:28px;height:22px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:transparent;padding:0;flex-shrink:0}
.network-page .vc-row .vn{flex:1;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.network-page .vc-row .vc-reset{font-size:12px;color:var(--text-3);cursor:pointer;flex-shrink:0}
.network-page .vc-row .vc-reset:hover{color:var(--accent)}
.network-page .chart-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding:0 4px}
.network-page .chart-title{font-size:13px;font-weight:600;color:var(--text)}
.network-page .chart-meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--text-3)}
.network-page .chart{flex:1;min-height:max(720px, calc(100vh - 280px))}
.network-page .side{background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);padding:18px 20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;min-height:max(720px, calc(100vh - 280px))}
.network-page .side .empty{display:flex;flex-direction:column;justify-content:center;align-items:center;flex:1;text-align:center;color:var(--text-3);gap:10px;padding:24px 0}
.network-page .side .empty svg{width:32px;height:32px;opacity:.4}
.network-page .side .empty .hint{font-size:12px;line-height:1.6;max-width:200px}
.network-page .side .kind{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--text-3);background:var(--surface-2);padding:2px 6px;border-radius:3px;letter-spacing:.06em;display:inline-block;width:fit-content}
.network-page .side .ttl{font-size:18px;font-weight:600;letter-spacing:-.01em;line-height:1.2;color:var(--text)}
.network-page .side .meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--text-3)}
.network-page .side .stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.network-page .side .stats .v{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text)}
.network-page .side .stats .l{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--text-3);letter-spacing:.05em;text-transform:uppercase}
.network-page .side h4{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-3);letter-spacing:.1em;text-transform:uppercase;font-weight:500;margin-top:4px}
.network-page .side ul{list-style:none;display:flex;flex-direction:column;gap:6px;padding:0;margin:0}
.network-page .side ul li{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 8px;border-radius:5px;font-size:12px}
.network-page .side ul li .nm{color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.network-page .side ul li .nm .d{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}
.network-page .side ul li .ct{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--text-3)}
@media(max-width:1024px){.network-page .main{grid-template-columns:1fr}.network-page .chart{min-height:600px}.network-page .side{min-height:auto;max-height:400px}}
`;
  document.head.appendChild(style);
}

function buildToolbarHTML(initialCfg) {
  const cats = [
    ['domain', 'Domains', 'var(--domain)'],
    ['project', 'Projects', 'var(--project)'],
    ['lab', 'Lab', 'var(--lab)'],
    ['basic', 'Basic', 'var(--basic)'],
    ['personal', 'Personal', 'var(--personal)'],
    ['art', 'Art', 'var(--art)'],
  ];
  const filterHtml = cats
    .map(([id, label, color]) =>
      `<label data-cat="${id}"><input type="checkbox" checked data-cat-toggle="${id}"><span class="d" style="background:${color}"></span>${label}</label>`
    )
    .join('');
  const g = initialCfg.force.gravity;
  const r = initialCfg.force.repulsion;
  const e = initialCfg.force.edgeLength;
  const lc = initialCfg.labelCount;
  return `
    <div class="toolbar">
      <div class="tool-group cat-filter">
        <span class="tool-label">카테고리 필터</span>
        ${filterHtml}
      </div>
      <div class="tool-group">
        <span class="tool-label">방향성</span>
        <label data-cat="directed" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2);padding:3px 8px;border:1px solid var(--border);border-radius:4px;cursor:pointer">
          <input type="checkbox" checked data-toggle="directed">owner → user 화살표
        </label>
      </div>
      <div class="tool-group">
        <span class="tool-label">노드 두께</span>
        <div class="range-wrap"><input type="range" data-mul="node" min="0.5" max="3" step="0.1" value="1"><span class="val" data-mul-val="node">1.0×</span></div>
        <span class="tool-label">엣지 두께</span>
        <div class="range-wrap"><input type="range" data-mul="edge" min="0.5" max="3" step="0.1" value="1"><span class="val" data-mul-val="edge">1.0×</span></div>
      </div>
      <div class="tool-group">
        <span class="tool-label">응집력</span>
        <div class="range-wrap"><input type="range" data-force="gravity" min="0.02" max="0.15" step="0.005" value="${g}"><span class="val" data-force-val="gravity">${g.toFixed(3)}</span><button class="slider-reset" data-reset="gravity" title="기본값으로 리셋">↺</button></div>
        <span class="tool-label">척력</span>
        <div class="range-wrap"><input type="range" data-force="repulsion" min="200" max="1500" step="50" value="${r}"><span class="val" data-force-val="repulsion">${r}</span><button class="slider-reset" data-reset="repulsion" title="기본값으로 리셋">↺</button></div>
        <span class="tool-label">엣지 길이</span>
        <div class="range-wrap"><input type="range" data-force="edgeLen" min="80" max="300" step="10" value="${e}"><span class="val" data-force-val="edgeLen">${e}</span><button class="slider-reset" data-reset="edgeLen" title="기본값으로 리셋">↺</button></div>
        <span class="tool-label">라벨 수</span>
        <div class="range-wrap"><input type="range" data-force="labelCount" min="10" max="200" step="10" value="${lc}"><span class="val" data-force-val="labelCount">${lc}</span><button class="slider-reset" data-reset="labelCount" title="기본값으로 리셋">↺</button></div>
      </div>
    </div>`;
}

function emptyPanelHTML() {
  return `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 12 L6 6M12 12 L18 6M12 12 L6 18M12 12 L18 18"/></svg>
      <div class="hint">노드를 클릭하면 볼트 메타와 공유 개념 top 5 가 펼쳐집니다.</div>
    </div>`;
}

/**
 * @param {HTMLElement} container
 * @param {IndexData} data
 * @param {object} [userConfig]
 * @returns {Promise<PageContext>}
 */
export async function initPage(container, data, userConfig) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('network.initPage: 브라우저 환경 필요');
  }
  if (!window.echarts) {
    throw new Error('network.initPage: window.echarts 미주입 (ECharts CDN 누락)');
  }
  if (!container || typeof container.querySelector !== 'function') {
    throw new Error('network.initPage: container 가 HTMLElement 아님');
  }

  ensurePageStyle();

  const stored = loadNetworkConfig();
  const networkCfg = stored
    ? stored
    : { ...DEFAULT_NETWORK_CONFIG, force: { ...DEFAULT_NETWORK_CONFIG.force } };

  container.innerHTML = `
    <div class="network-page">
      ${buildToolbarHTML(networkCfg)}
      <div class="main">
        <div class="chart-wrap">
          <div class="chart-head">
            <span class="chart-title">멀티볼트 그래프 · category-grouped force network</span>
            <span style="display:flex;align-items:center;gap:10px">
              <span class="chart-meta">평소 정지 · 노드 드래그 시에만 이동 · 휠 줌</span>
              <button class="vc-toggle" data-color-panel-toggle>볼트 색</button>
            </span>
          </div>
          <div class="vault-color-panel" data-color-panel hidden>
            <div class="vc-head"><span class="t">볼트 색</span><span class="vc-hint">개별 색 지정 · 빈 칸은 카테고리 기본색</span></div>
            <div data-color-panel-list></div>
          </div>
          <div class="chart" data-chart="net"></div>
        </div>
        <aside class="side" data-side-panel>${emptyPanelHTML()}</aside>
      </div>
    </div>`;

  const activeCats = { domain: true, project: true, lab: true, basic: true, personal: true, art: true };
  let nodeMul = 1.0;
  let edgeMul = 1.0;
  let directedMode = true;
  let baseNodes = [];
  let baseLinks = [];
  let baseCategories = [];
  let cachedRawData = data;

  function buildDirectedLinks(rawData, edgeMultiplier) {
    if (!rawData || !rawData.master) return [];
    const owned = deriveConnections(rawData.master).filter((c) => c.owner !== null);
    const pairMap = new Map();
    for (const c of owned) {
      for (const u of c.userNotes) {
        if (u.count <= 0) continue;
        const key = `${c.owner}${u.vault}`;
        const cur = pairMap.get(key);
        if (cur) cur.value += u.count;
        else pairMap.set(key, { source: c.owner, target: u.vault, value: u.count });
      }
    }
    const out = [];
    for (const e of pairMap.values()) {
      out.push({
        source: e.source,
        target: e.target,
        value: e.value,
        lineStyle: {
          width: clampRange((e.value * 0.6) * edgeMultiplier, 1, 12),
          opacity: 0.55,
          curveness: 0.1,
        },
      });
    }
    return out;
  }

  const chartEl = container.querySelector('[data-chart="net"]');
  const sidePanel = container.querySelector('[data-side-panel]');
  const toolbar = container.querySelector('.toolbar');
  const chart = window.echarts.init(chartEl);

  function rebuildBase(d) {
    cachedRawData = d;
    const baseCfg = { ...(userConfig || {}), thicknessMultiplier: 1.0 };
    const opt = buildOptionA(d, baseCfg);
    const series0 = (opt.series && opt.series[0]) || {};
    baseNodes = (series0.data || []).map((n) => ({
      ...n,
      _baseSize: typeof n.symbolSize === 'number' ? n.symbolSize : 24,
    }));
    baseLinks = (series0.links || []).map((l) => ({
      ...l,
      _baseWidth: l.lineStyle && typeof l.lineStyle.width === 'number' ? l.lineStyle.width : 2,
    }));
    baseCategories = Array.isArray(series0.categories)
      ? series0.categories.map((c) => ({ name: c.name }))
      : [];
    return opt;
  }

  function buildOptionFromData(d) {
    if (d !== cachedRawData) rebuildBase(d);
    const baseCfg = { ...(userConfig || {}), thicknessMultiplier: 1.0 };
    const opt = buildOptionA(d, baseCfg);
    const series0 = (opt.series && opt.series[0]) || {};

    const filteredNodes = baseNodes
      .filter((n) => activeCats[coarseCategory(n.category)])
      .map((n) => ({
        ...n,
        name: maskVaultName(n.id || n.name),
        symbolSize: clampRange(n._baseSize * nodeMul, 8, 100),
      }));
    const ids = new Set(filteredNodes.map((n) => n.id || n.name));

    const sourceLinks = directedMode ? buildDirectedLinks(d, 1.0) : baseLinks;
    const filteredLinks = sourceLinks
      .filter((l) => ids.has(l.source) && ids.has(l.target))
      .map((l) => ({
        ...l,
        lineStyle: {
          ...(l.lineStyle || {}),
          width: clampRange((l.lineStyle && typeof l.lineStyle.width === 'number' ? l.lineStyle.width : (l._baseWidth || 1)) * edgeMul, 0.5, 16),
        },
      }));

    const { nodes: nodesWithHubs, links: linksWithHubs } = addCategoryHubs({
      nodes: filteredNodes,
      links: filteredLinks,
      categories: baseCategories,
    });

    series0.data = nodesWithHubs;
    series0.links = linksWithHubs;
    series0.roam = true;
    series0.draggable = true;
    if (directedMode) {
      series0.edgeSymbol = ['none', 'arrow'];
      series0.edgeSymbolSize = 8;
    } else {
      series0.edgeSymbol = ['none', 'none'];
    }

    // legend 우측 vertical 정렬 — 그래프 영역과 겹침 회피 (buildOptionA 의 horizontal legend 덮어쓰기)
    if (Array.isArray(opt.legend) && opt.legend[0]) {
      Object.assign(opt.legend[0], {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
      });
    }

    series0.force = {
      ...(series0.force || {}),
      initLayout: 'circular',
      layoutAnimation: false,
      // 그래프 중심점을 좌측으로 시프트 — 우측 legend 영역(약 ~12%) 회피
      center: ['44%', '50%'],
      gravity: networkCfg.force.gravity,
      repulsion: networkCfg.force.repulsion,
      edgeLength: [
        Math.round(networkCfg.force.edgeLength * 0.66),
        Math.round(networkCfg.force.edgeLength * 1.33),
      ],
      friction: 0.5,
    };

    applyPerformanceOptions(opt);
    return opt;
  }

  rebuildBase(data);
  const initialOption = buildOptionFromData(data);
  chart.setOption(initialOption, true);

  // 모듈 setup (의존 순서 — labels 먼저 LabelsAPI 발급, 그 다음 freeze/sliders/sse)
  const labelsApi = setupLabels(chart, initialOption.series[0].data, networkCfg.labelCount);

  const freezeApi = {};
  const disposeFreeze = setupConditionalFreeze(chart, freezeApi);
  const disposeDrag = setupDragLock(chart);
  const disposeTheme = setupThemeObserver(chart);

  const disposeSliders = setupSliders(toolbar, chart, freezeApi, labelsApi);

  const sse = setupSseDiff(chart, buildOptionFromData, freezeApi, labelsApi);

  // 카테고리 필터 + multiplier 핸들러 (sliders.js 외 toolbar 영역)
  const onToolbarMisc = (ev) => {
    const t = ev.target;
    if (!t || typeof t.getAttribute !== 'function') return;

    const catToggle = t.getAttribute('data-cat-toggle');
    if (catToggle) {
      activeCats[catToggle] = !!t.checked;
      sse.onDataChanged(cachedRawData);
      return;
    }

    const dirToggle = t.getAttribute('data-toggle');
    if (dirToggle === 'directed') {
      directedMode = !!t.checked;
      sse.onDataChanged(cachedRawData);
      return;
    }

    const mul = t.getAttribute('data-mul');
    if (mul) {
      const v = parseFloat(t.value);
      if (Number.isFinite(v)) {
        if (mul === 'node') nodeMul = v;
        else edgeMul = v;
        const valEl = container.querySelector(`[data-mul-val="${mul}"]`);
        if (valEl) valEl.textContent = v.toFixed(1) + '×';
        sse.onDataChanged(cachedRawData);
      }
    }
  };
  toolbar.addEventListener('input', onToolbarMisc);
  toolbar.addEventListener('change', onToolbarMisc);

  // chart click — side panel (hub 노드 무시)
  function colorForCoarse(coarse) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--${coarse}`).trim();
    return v || '#888';
  }

  function buildSharedFor(vaultId) {
    const counts = new Map();
    for (const l of baseLinks) {
      let other = null;
      if (l.source === vaultId) other = l.target;
      else if (l.target === vaultId) other = l.source;
      if (!other) continue;
      counts.set(other, (counts.get(other) || 0) + (l.value || 1));
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  function renderPanel(vaultId) {
    const node = baseNodes.find((n) => (n.id || n.name) === vaultId);
    if (!node) {
      sidePanel.innerHTML = emptyPanelHTML();
      return;
    }
    const shared = buildSharedFor(vaultId);
    const coarse = coarseCategory(node.category);
    const sharedHtml = shared
      .map(([other, count]) => {
        const otherNode = baseNodes.find((n) => (n.id || n.name) === other);
        const otherCoarse = otherNode ? coarseCategory(otherNode.category) : 'basic';
        return `<li><span class="nm"><span class="d" style="background:${colorForCoarse(otherCoarse)}"></span>${escapeHtml(maskVaultName(other))}</span><span class="ct">${count} 참조</span></li>`;
      })
      .join('');
    sidePanel.innerHTML = `
      <span class="kind">VAULT</span>
      <div class="ttl">${escapeHtml(maskVaultName(node.id || vaultId))}</div>
      <div class="meta">category: ${escapeHtml(node.category || '(unknown)')} · group: ${coarse}</div>
      <div class="stats">
        <div><div class="v">${node.value || 0}</div><div class="l">Notes</div></div>
        <div><div class="v">${shared.length}</div><div class="l">Shared edges</div></div>
      </div>
      <h4>가장 많이 공유하는 볼트 (top 5)</h4>
      <ul>${sharedHtml || '<li><span class="nm" style="color:var(--text-3)">공유 엣지 없음</span></li>'}</ul>`;
  }

  const onChartClick = (p) => {
    if (!p || p.dataType !== 'node') return;
    const id = p.data && (p.data.id || p.data.name);
    if (!id) return;
    if (typeof id === 'string' && id.startsWith(HUB_ID_PREFIX)) return; // hub 노드 클릭 무시
    renderPanel(id);
  };
  chart.on('click', onChartClick);

  // ── 볼트 색 패널 ── 그래프 보며 직접 색 조정. input 중에는 패널 DOM 을 그대로 두고 차트만 재빌드 → color picker 유지.
  function renderColorPanel() {
    const list = container.querySelector('[data-color-panel-list]');
    if (!list) return;
    const colors = (userConfig && userConfig.colors) || {};
    const vaults = baseNodes.filter((n) => {
      const id = n.id || n.name;
      return !(typeof id === 'string' && id.startsWith(HUB_ID_PREFIX));
    });
    list.innerHTML = vaults.map((n) => {
      const id = n.id || n.name;
      const cur = (n.itemStyle && n.itemStyle.color) || '#888888';
      const isOv = !!colors[id];
      return `<div class="vc-row">
        <input type="color" data-vc="${escapeHtml(id)}" value="${escapeHtml(cur)}" />
        <span class="vn" title="${escapeHtml(maskVaultName(id))}">${escapeHtml(maskVaultName(id))}</span>
        ${isOv ? `<span class="vc-reset" data-vc-reset="${escapeHtml(id)}" title="카테고리 기본색으로">↺</span>` : ''}
      </div>`;
    }).join('');
  }
  function applyVaultColors() {
    rebuildBase(cachedRawData);
    sse.onDataChanged(cachedRawData);
  }
  function broadcastUserConfig() {
    try { window.dispatchEvent(new CustomEvent('aimv:user-config-changed', { detail: { config: userConfig } })); } catch (e) { /* noop */ }
  }
  const colorPanel = container.querySelector('[data-color-panel]');
  const colorToggle = container.querySelector('[data-color-panel-toggle]');
  if (colorToggle) colorToggle.addEventListener('click', () => {
    if (!colorPanel) return;
    if (colorPanel.hasAttribute('hidden')) { renderColorPanel(); colorPanel.removeAttribute('hidden'); }
    else colorPanel.setAttribute('hidden', '');
  });
  if (colorPanel) {
    colorPanel.addEventListener('input', (ev) => {
      const inp = ev.target.closest('input[data-vc]');
      if (!inp || !userConfig) return;
      if (!userConfig.colors) userConfig.colors = {};
      userConfig.colors[inp.dataset.vc] = inp.value;
      applyVaultColors();
      saveUserConfig(userConfig);
    });
    colorPanel.addEventListener('change', (ev) => {
      if (ev.target.closest('input[data-vc]')) { broadcastUserConfig(); renderColorPanel(); }
    });
    colorPanel.addEventListener('click', (ev) => {
      const rb = ev.target.closest('[data-vc-reset]');
      if (!rb || !userConfig) return;
      if (userConfig.colors) delete userConfig.colors[rb.dataset.vcReset];
      applyVaultColors();
      saveUserConfig(userConfig);
      broadcastUserConfig();
      renderColorPanel();
    });
  }

  // 패널 바깥(그래프·툴바 등) 클릭 시 닫기 — 편집할 때만 열고 끝나면 닫는 UX
  function onDocClickOutside(ev) {
    if (!colorPanel || colorPanel.hasAttribute('hidden')) return;
    if (colorPanel.contains(ev.target)) return;
    if (colorToggle && colorToggle.contains(ev.target)) return;
    colorPanel.setAttribute('hidden', '');
  }
  document.addEventListener('click', onDocClickOutside);

  const onResize = () => chart.resize();
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('click', onDocClickOutside);
      toolbar.removeEventListener('input', onToolbarMisc);
      toolbar.removeEventListener('change', onToolbarMisc);
      try { chart.off('click', onChartClick); } catch (e) { /* noop */ }
      disposeFreeze();
      disposeDrag();
      disposeTheme();
      disposeSliders();
      sse.dispose();
      chart.dispose();
      container.innerHTML = '';
    },
    refresh(newData) {
      sse.onDataChanged(newData);
    },
  };
}

export const __internal = { coarseCategory, clampRange, COARSE_CATS, PAGE_STYLE_ID };
