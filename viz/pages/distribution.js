/**
 * W4 — 분포 분석 페이지
 * spec § 5.3 distribution + 시안 viz_design_drafts/05_distribution.html
 *
 * grid 2×2:
 *   [카테고리 도넛] [타입 도넛]
 *   [태그 top N 바] [한눈에 카드 (KPI mini + summary list)]
 *
 * 외부 의존성: ECharts 5 CDN (window.echarts).
 * 차트 옵션은 viz/lib/buildOption.js 의 buildOptionC 재사용 (= [categoryPie, typePie, tagBar]).
 *
 * @typedef {import('../lib/loadIndex.js').IndexData} IndexData
 * @typedef {import('../lib/buildOption.js').UserConfig} UserConfig
 */

import { buildOptionC, presetColorByCategory } from '../lib/buildOption.js';
import { openVault } from '../lib/obsidian-uri.js';

const RECENT_WINDOW_DAYS = 7;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function median(values) {
  if (!values || values.length === 0) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? Math.round((arr[mid - 1] + arr[mid]) / 2) : arr[mid];
}

function fmtFloat(n, digits = 1) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function computeSummary(data) {
  const master = data && data.master ? data.master : {};
  const vaults = master.vaults || {};
  const notes = Array.isArray(master.notes) ? master.notes : [];
  const tagIndex = master.tag_index || {};
  const vaultEntries = Object.entries(vaults);

  const noteCounts = vaultEntries.map(([, m]) => Number(m.note_count) || 0);
  const totalNotes = Number(master.note_count) || noteCounts.reduce((s, v) => s + v, 0);
  const vaultCount = Number(master.vault_count) || vaultEntries.length;

  const avgPerVault = vaultCount > 0 ? totalNotes / vaultCount : 0;
  const medianPerVault = median(noteCounts);

  let totalTagRefs = 0;
  let uniqueTags = 0;
  for (const refs of Object.values(tagIndex)) {
    uniqueTags += 1;
    totalTagRefs += Array.isArray(refs) ? refs.length : 0;
  }
  const avgTagsPerNote = totalNotes > 0 ? totalTagRefs / totalNotes : 0;

  const sortedVaults = vaultEntries
    .map(([id, m]) => ({ id, count: Number(m.note_count) || 0, path: m.path || '' }))
    .sort((a, b) => b.count - a.count);
  const maxVault = sortedVaults[0] || { id: '—', count: 0 };
  const minVault = sortedVaults[sortedVaults.length - 1] || { id: '—', count: 0 };

  const catNoteCount = new Map();
  const catVaultCount = new Map();
  for (const [, m] of vaultEntries) {
    const cat = (m.path || '').split('/')[1] || '(unknown)';
    catVaultCount.set(cat, (catVaultCount.get(cat) || 0) + 1);
    catNoteCount.set(cat, (catNoteCount.get(cat) || 0) + (Number(m.note_count) || 0));
  }
  let topCategory = { name: '—', vaults: 0, notes: 0 };
  for (const [name, vCount] of catVaultCount) {
    const nCount = catNoteCount.get(name) || 0;
    if (nCount > topCategory.notes) topCategory = { name, vaults: vCount, notes: nCount };
  }

  const typeCounts = new Map();
  for (const n of notes) {
    const t = n && n.type ? n.type : '(untyped)';
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }
  let topType = { name: '—', count: 0 };
  for (const [name, c] of typeCounts) {
    if (c > topType.count) topType = { name, count: c };
  }
  const topTypePct = totalNotes > 0 ? Math.round((topType.count / totalNotes) * 100) : 0;

  let recentNotes = 0;
  let recentConcepts = 0;
  let recentAvailable = false;
  if (data && data.vaults && typeof data.vaults === 'object') {
    const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recentTags = new Set();
    for (const vIndex of Object.values(data.vaults)) {
      const vNotes = Array.isArray(vIndex && vIndex.notes) ? vIndex.notes : [];
      for (const n of vNotes) {
        const t = Date.parse(n && n.mtime ? n.mtime : '');
        if (Number.isFinite(t) && t >= cutoff) {
          recentNotes += 1;
          if (Array.isArray(n.tags)) for (const tag of n.tags) recentTags.add(tag);
          recentAvailable = true;
        }
      }
    }
    recentConcepts = recentTags.size;
  }

  return {
    totalNotes,
    vaultCount,
    uniqueTags,
    avgPerVault,
    medianPerVault,
    avgTagsPerNote,
    maxVault,
    minVault,
    topCategory,
    topType: { ...topType, pct: topTypePct },
    recent: { notes: recentNotes, concepts: recentConcepts, available: recentAvailable },
  };
}

function summaryHtml(s) {
  const topCatPct = s.totalNotes > 0 ? Math.round((s.topCategory.notes / s.totalNotes) * 100) : 0;
  const topTypePct = Number(s.topType.pct) || 0;
  const minRelPct = s.maxVault.count > 0 ? Math.round((s.minVault.count / s.maxVault.count) * 100) : 0;
  const topCatColor = presetColorByCategory(s.topCategory.name);
  const recentAvailable = !!s.recent.available;
  const recentNotes = s.recent.notes || 0;
  const recentTags = s.recent.concepts || 0;
  return `
    <div class="summary-kpi-grid">
      <div class="summary-kpi">
        <div class="l">평균 노트/볼트</div>
        <div class="v">${fmtFloat(s.avgPerVault)}</div>
        <div class="d">중앙값 ${s.medianPerVault}</div>
      </div>
      <div class="summary-kpi">
        <div class="l">평균 태그/노트</div>
        <div class="v">${fmtFloat(s.avgTagsPerNote)}</div>
        <div class="d">고유 태그 ${s.uniqueTags}</div>
      </div>
    </div>
    <div class="summary-highlights">
      <div class="highlight" style="--hl-color:${escapeHtml(topCatColor)};">
        <div class="hl-head">
          <span class="hl-dot"></span>
          <span class="hl-label">가장 많은 카테고리</span>
          <span class="hl-value">${escapeHtml(s.topCategory.name)}</span>
        </div>
        <div class="hl-bar"><span class="fill" style="width:${topCatPct}%;"></span></div>
        <div class="hl-meta">${s.topCategory.vaults} 볼트 · ${s.topCategory.notes} 노트 · 전체의 ${topCatPct}%</div>
      </div>
      <div class="highlight" style="--hl-color:var(--accent);">
        <div class="hl-head">
          <span class="hl-dot"></span>
          <span class="hl-label">가장 활발한 타입</span>
          <span class="hl-value">${escapeHtml(s.topType.name)}</span>
        </div>
        <div class="hl-bar"><span class="fill" style="width:${topTypePct}%;"></span></div>
        <div class="hl-meta">${s.topType.count} 노트 · 전체의 ${topTypePct}%</div>
      </div>
      <div class="highlight" style="--hl-color:var(--project,#2f4554);">
        <div class="hl-head">
          <span class="hl-dot"></span>
          <span class="hl-label">최대 · 최소 볼트</span>
        </div>
        <div class="hl-pair">
          <div class="hl-pair-row">
            <span class="vault-pill max" data-open-vault="${escapeHtml(s.maxVault.id)}" title="Obsidian 으로 볼트 열기">${escapeHtml(s.maxVault.id)}</span>
            <span class="hl-bar inline"><span class="fill" style="width:100%;"></span></span>
            <span class="hl-count">${s.maxVault.count}</span>
          </div>
          <div class="hl-pair-row">
            <span class="vault-pill min" data-open-vault="${escapeHtml(s.minVault.id)}" title="Obsidian 으로 볼트 열기">${escapeHtml(s.minVault.id)}</span>
            <span class="hl-bar inline"><span class="fill dim" style="width:${minRelPct}%;"></span></span>
            <span class="hl-count">${s.minVault.count}</span>
          </div>
        </div>
        <div class="hl-meta">최대 대비 최소 ${minRelPct}%</div>
      </div>
      <div class="highlight" style="--hl-color:var(--accent);">
        <div class="hl-head">
          <span class="hl-dot"></span>
          <span class="hl-label">최근 ${RECENT_WINDOW_DAYS}일 신규</span>
        </div>
        ${recentAvailable
          ? `<div class="hl-recent">
              <div class="recent-item"><span class="num">+${recentNotes}</span><span class="lbl">노트</span></div>
              <div class="recent-item"><span class="num">+${recentTags}</span><span class="lbl">태그</span></div>
            </div>`
          : `<div class="hl-meta">mtime 데이터 없음 (vault_index 미로딩)</div>`}
      </div>
    </div>
  `;
}

function shellHtml(meta) {
  return `
    <section class="page page-distribution">
      <div class="grid distribution-grid">
        <div class="card chart-wrap">
          <div class="chart-head">
            <span class="chart-title">카테고리 분포 top <span data-role="topNCatVal">${meta.topNCat}</span></span>
            <div class="topn-slider-wrap">
              <input type="range" data-role="topNCatSlider" min="3" max="${meta.maxCat}" step="1" value="${meta.topNCat}" title="카테고리 슬라이스 개수 조절">
            </div>
            <span class="chart-meta" data-role="catMeta">${escapeHtml(meta.catMeta)}</span>
          </div>
          <div class="chart" id="dist-cat"></div>
        </div>
        <div class="card chart-wrap">
          <div class="chart-head">
            <span class="chart-title">노트 타입 분포 top <span data-role="topNTypeVal">${meta.topNType}</span></span>
            <div class="topn-slider-wrap">
              <input type="range" data-role="topNTypeSlider" min="3" max="${meta.maxType}" step="1" value="${meta.topNType}" title="타입 슬라이스 개수 조절">
            </div>
            <span class="chart-meta" data-role="typeMeta">${escapeHtml(meta.typeMeta)}</span>
          </div>
          <div class="chart" id="dist-type"></div>
        </div>
        <div class="card chart-wrap">
          <div class="chart-head">
            <span class="chart-title">태그 top <span data-role="topNVal">${meta.topN}</span></span>
            <div class="topn-slider-wrap">
              <input type="range" data-role="topNSlider" min="5" max="80" step="1" value="${meta.topN}" title="태그 막대 개수 조절">
            </div>
            <span class="chart-meta" data-role="tagMeta">${escapeHtml(meta.tagMeta)}</span>
          </div>
          <div class="chart" id="dist-tag"></div>
        </div>
        <div class="card summary-card">
          <div class="chart-head"><span class="chart-title">하이라이트</span><span class="chart-meta">snapshot</span></div>
          <div id="dist-summary"></div>
        </div>
      </div>
    </section>
  `;
}

function buildMeta(data, summary, topN, topNCat, topNType) {
  const tagsSize = Object.keys((data && data.master && data.master.tag_index) || {}).length;
  const types = new Set();
  for (const n of (data && data.master && data.master.notes) || []) {
    types.add((n && n.type) || '(untyped)');
  }
  const cats = new Set();
  for (const meta of Object.values((data && data.master && data.master.vaults) || {})) {
    cats.add((meta.path || '').split('/')[1] || '(unknown)');
  }
  return {
    catMeta: `${summary.vaultCount} vaults · ${summary.totalNotes} notes · top ${topNCat} of ${cats.size}`,
    typeMeta: `top ${topNType} of ${types.size}`,
    tagMeta: `${tagsSize} tags · top ${topN} 표시`,
    topN,
    topNCat,
    topNType,
    maxCat: Math.max(3, cats.size),
    maxType: Math.max(3, types.size),
  };
}

/**
 * @param {HTMLElement} container
 * @param {IndexData} data
 * @param {UserConfig} userConfig
 * @returns {Promise<{destroy: () => void, refresh: (data: IndexData) => void}>}
 */
export async function initPage(container, data, userConfig) {
  if (!container) throw new Error('distribution.initPage: container 필수');
  const echarts = (typeof window !== 'undefined' && window.echarts) || null;
  if (!echarts) throw new Error('distribution.initPage: window.echarts 미로딩 (ECharts CDN 필요)');

  const cfg = userConfig || {};
  let topN = Math.max(5, Math.min(80, Number(cfg.topNTags) || 20));
  let topNCat = Math.max(3, Number(cfg.topNCategories) || 12);
  let topNType = Math.max(3, Number(cfg.topNTypes) || 12);

  let currentData = data;
  let summary = computeSummary(currentData);
  container.innerHTML = shellHtml(buildMeta(currentData, summary, topN, topNCat, topNType));

  const catEl = container.querySelector('#dist-cat');
  const typeEl = container.querySelector('#dist-type');
  const tagEl = container.querySelector('#dist-tag');
  const summaryEl = container.querySelector('#dist-summary');
  const topNSlider = container.querySelector('[data-role="topNSlider"]');
  const topNVal = container.querySelector('[data-role="topNVal"]');
  const tagMetaEl = container.querySelector('[data-role="tagMeta"]');
  const topNCatSlider = container.querySelector('[data-role="topNCatSlider"]');
  const topNCatValEl = container.querySelector('[data-role="topNCatVal"]');
  const catMetaEl = container.querySelector('[data-role="catMeta"]');
  const topNTypeSlider = container.querySelector('[data-role="topNTypeSlider"]');
  const topNTypeValEl = container.querySelector('[data-role="topNTypeVal"]');
  const typeMetaEl = container.querySelector('[data-role="typeMeta"]');

  const charts = {
    cat: echarts.init(catEl),
    type: echarts.init(typeEl),
    tag: echarts.init(tagEl),
  };

  function fullCfg() {
    return { ...cfg, topNTags: topN, topNCategories: topNCat, topNTypes: topNType };
  }
  function renderAll() {
    const [catOption, typeOption, tagOption] = buildOptionC(currentData, fullCfg());
    charts.cat.setOption(catOption, true);
    charts.type.setOption(typeOption, true);
    charts.tag.setOption(tagOption, true);
    summaryEl.innerHTML = summaryHtml(summary);
  }
  function renderTagOnly() {
    const [, , tagOption] = buildOptionC(currentData, fullCfg());
    charts.tag.setOption(tagOption, true);
    const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
    if (tagMetaEl) tagMetaEl.textContent = meta.tagMeta;
    if (topNVal) topNVal.textContent = String(topN);
  }
  function renderCatOnly() {
    const [catOption] = buildOptionC(currentData, fullCfg());
    charts.cat.setOption(catOption, true);
    const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
    if (catMetaEl) catMetaEl.textContent = meta.catMeta;
    if (topNCatValEl) topNCatValEl.textContent = String(topNCat);
  }
  function renderTypeOnly() {
    const [, typeOption] = buildOptionC(currentData, fullCfg());
    charts.type.setOption(typeOption, true);
    const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
    if (typeMetaEl) typeMetaEl.textContent = meta.typeMeta;
    if (topNTypeValEl) topNTypeValEl.textContent = String(topNType);
  }
  renderAll();

  function onTopNChange(e) {
    const v = Math.max(5, Math.min(80, Number(e.target.value) || 20));
    if (v === topN) return;
    topN = v;
    renderTagOnly();
  }
  function onTopNCatChange(e) {
    const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
    const v = Math.max(3, Math.min(meta.maxCat, Number(e.target.value) || 12));
    if (v === topNCat) return;
    topNCat = v;
    renderCatOnly();
  }
  function onTopNTypeChange(e) {
    const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
    const v = Math.max(3, Math.min(meta.maxType, Number(e.target.value) || 12));
    if (v === topNType) return;
    topNType = v;
    renderTypeOnly();
  }
  const onResize = () => {
    charts.cat.resize();
    charts.type.resize();
    charts.tag.resize();
  };
  function onVaultPillClick(ev) {
    const vaultEl = ev.target.closest('[data-open-vault]');
    if (!vaultEl) return;
    ev.preventDefault();
    ev.stopPropagation();
    openVault(vaultEl.dataset.openVault);
  }

  if (topNSlider) topNSlider.addEventListener('input', onTopNChange);
  if (topNCatSlider) topNCatSlider.addEventListener('input', onTopNCatChange);
  if (topNTypeSlider) topNTypeSlider.addEventListener('input', onTopNTypeChange);
  container.addEventListener('click', onVaultPillClick, true);
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      if (topNSlider) topNSlider.removeEventListener('input', onTopNChange);
      if (topNCatSlider) topNCatSlider.removeEventListener('input', onTopNCatChange);
      if (topNTypeSlider) topNTypeSlider.removeEventListener('input', onTopNTypeChange);
      container.removeEventListener('click', onVaultPillClick, true);
      window.removeEventListener('resize', onResize);
      charts.cat.dispose();
      charts.type.dispose();
      charts.tag.dispose();
      container.innerHTML = '';
    },
    refresh(newData) {
      currentData = newData || currentData;
      summary = computeSummary(currentData);
      const meta = buildMeta(currentData, summary, topN, topNCat, topNType);
      // 슬라이더 max 갱신 (데이터 변경에 따라 카테고리/타입 수가 바뀔 수 있음)
      if (topNCatSlider) {
        topNCatSlider.max = meta.maxCat;
        if (topNCat > meta.maxCat) topNCat = meta.maxCat;
      }
      if (topNTypeSlider) {
        topNTypeSlider.max = meta.maxType;
        if (topNType > meta.maxType) topNType = meta.maxType;
      }
      if (catMetaEl) catMetaEl.textContent = meta.catMeta;
      if (typeMetaEl) typeMetaEl.textContent = meta.typeMeta;
      if (tagMetaEl) tagMetaEl.textContent = meta.tagMeta;
      renderAll();
    },
  };
}

export const __internal = { computeSummary, summaryHtml, shellHtml, buildMeta, median };
