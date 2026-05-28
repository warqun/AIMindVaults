/**
 * W-cal — 캘린더 작업량 페이지 (Phase 2.5 + R126 일별 작업 임베드)
 *
 * GitHub-style heatmap (ECharts calendar coord + heatmap series).
 * - lookback toggle (3개월·6개월·1년·2년·5년·전체·custom)
 * - basis toggle (갱신일·생성일)
 * - 셀 hover → ECharts tooltip
 * - 셀 클릭 → 하단 일별 작업 영역 즉시 갱신 (카테고리 그룹화 + 시간순 카드 그리드)
 * - 캘린더 ↔ 일별 영역 사이 드래그 리사이저 (localStorage 비율 저장)
 *
 * 데이터:
 *   GET /api/all-notes        — heatmap 일자별 집계 (전 노트 mtime/created)
 *   GET /api/vault-births     — vault 생성 일자 (셀 핀 + 헤더 표기)
 *   GET /api/additions?date=  — 셀 클릭 시 그 날 노트 리스트
 *   data.master.vaults        — vault → category 매핑 (router 전달)
 */

import { presetColorByCategory } from '../lib/buildOption.js';
import { openNote, openVault } from '../lib/obsidian-uri.js';
import { filterVisibleNotes } from '../lib/system-vaults.js';

const LOOKBACK_OPTIONS = [
  { key: '3m', label: '3개월', days: 90 },
  { key: '6m', label: '6개월', days: 180 },
  { key: '1y', label: '1년',   days: 365 },
  { key: '2y', label: '2년',   days: 730 },
  { key: '5y', label: '5년',   days: 1825 },
  { key: 'all', label: '전체',  days: null }, // null = 데이터 최초 날짜 ~ 오늘 (동적)
];
const DEFAULT_LOOKBACK = '6m';
const CUSTOM_DAYS_MIN = 7;
const CUSTOM_DAYS_MAX = 36500;
const BASES = ['mtime', 'created'];
const BASIS_LABELS = { mtime: '갱신일', created: '생성일' };
const DEFAULT_BASIS = 'mtime';

const SPLIT_STORAGE_KEY = 'viz.calendar.splitRatio';
const SPLIT_MIN = 0.25;
const SPLIT_MAX = 0.80;
const SPLIT_DEFAULT = 0.55;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cssVar(name) {
  if (typeof getComputedStyle !== 'function') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function computeRange(days, dataMinDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (days == null) {
    // 전체 — 데이터 최초 날짜부터 오늘까지. 데이터 없으면 90일 fallback.
    const start = dataMinDate || isoDate(new Date(today.getTime() - 89 * 86400000));
    return [start, isoDate(today)];
  }
  const start = new Date(today.getTime() - (days - 1) * 86400000);
  return [isoDate(start), isoDate(today)];
}

function computeMinDate(notes, basis) {
  const key = basis === 'created' ? 'created' : 'mtime';
  let minDate = null;
  for (const n of notes || []) {
    const stamp = (n && n[key]) || (basis === 'created' ? n?.mtime : null);
    if (!stamp) continue;
    const m = String(stamp).match(/^\d{4}-\d{2}-\d{2}/);
    if (!m) continue;
    const d = m[0];
    if (!minDate || d < minDate) minDate = d;
  }
  return minDate;
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

function timeFromStamp(stamp) {
  if (!stamp) return '—';
  const m = String(stamp).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

function loadSplitRatio() {
  if (typeof localStorage === 'undefined') return SPLIT_DEFAULT;
  try {
    const v = parseFloat(localStorage.getItem(SPLIT_STORAGE_KEY) || '');
    if (!Number.isFinite(v)) return SPLIT_DEFAULT;
    return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v));
  } catch (e) {
    return SPLIT_DEFAULT;
  }
}

function saveSplitRatio(ratio) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SPLIT_STORAGE_KEY, String(ratio)); } catch (e) {}
}

/**
 * 일자별 집계.
 * @param {object[]} notes
 * @param {'mtime'|'created'} [basis='mtime']
 */
function aggregateByDate(notes, basis = 'mtime') {
  const map = new Map();
  if (!Array.isArray(notes)) return map;
  const key = basis === 'created' ? 'created' : 'mtime';
  for (const n of notes) {
    const stamp = n && n[key] ? n[key] : (basis === 'created' ? n?.mtime : null);
    if (!stamp) continue;
    const m = String(stamp).match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const date = m[1];
    let entry = map.get(date);
    if (!entry) {
      entry = { date, count: 0, vaults: new Map() };
      map.set(date, entry);
    }
    entry.count += 1;
    const vid = (n && n.vault_id) || '(unknown)';
    entry.vaults.set(vid, (entry.vaults.get(vid) || 0) + 1);
  }
  return map;
}

function totalsInRange(byDate, range) {
  let total = 0;
  let max = 0;
  let activeDays = 0;
  for (const e of byDate.values()) {
    if (e.date < range[0] || e.date > range[1]) continue;
    total += e.count;
    activeDays += 1;
    if (e.count > max) max = e.count;
  }
  return { total, max, activeDays };
}

function buildHeatmapOption(state) {
  const [start, end] = state.range;
  const data = [];
  for (const entry of state.byDate.values()) {
    if (entry.date < start || entry.date > end) continue;
    data.push([entry.date, entry.count]);
  }
  // R135 Gap 6 — visualMax 를 P95 로 (outlier 셀 하나가 다른 셀 농도를 압도하는 문제 회피)
  const positiveCounts = data.map((d) => d[1]).filter((c) => c > 0).sort((a, b) => a - b);
  const p95 = positiveCounts.length
    ? positiveCounts[Math.min(positiveCounts.length - 1, Math.floor(positiveCounts.length * 0.95))]
    : 1;
  const visualMax = Math.max(1, p95);
  const accentHex = (cssVar('--accent') || '#0f766e').replace(/^\s+|\s+$/g, '');
  const surface2 = cssVar('--surface-2') || '#f4f4f3';
  const text3 = cssVar('--text-3') || '#a8a29e';
  const border = cssVar('--border') || '#e7e5e4';
  const borderStrong = cssVar('--border-strong') || '#d6d3d1';
  const gradient = [
    accentHex + '33', accentHex + '66', accentHex + '99', accentHex + 'cc', accentHex,
  ];
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: '"Inter", -apple-system, sans-serif' },
    tooltip: {
      borderColor: border,
      backgroundColor: cssVar('--surface') || '#ffffff',
      textStyle: { color: cssVar('--text') || '#0c0a09', fontSize: 11 },
      formatter: (p) => {
        const v = p && p.value;
        if (!v) return '';
        const date = v[0];
        const count = v[1] || 0;
        const added = state.vaultsByDate.get(date) || [];
        const verb = state.basis === 'created' ? '노트 생성' : '노트 갱신';
        let html = `<b>${escapeHtml(date)}</b><br/>${count} ${verb}`;
        if (added.length) {
          const accent = (cssVar('--accent') || '#0f766e').trim();
          html += `<br/><span style="color:${accent};">+ ${added.map(escapeHtml).join(', ')} 볼트 추가</span>`;
        }
        html += `<br/><span style="color:${text3};font-size:10px;">클릭 → 하단에 노트 펼치기</span>`;
        return html;
      },
    },
    visualMap: {
      min: 1,
      max: visualMax,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      itemWidth: 12,
      itemHeight: 110,
      textStyle: { color: text3, fontSize: 10, fontFamily: 'JetBrains Mono' },
      inRange: { color: gradient },
    },
    calendar: {
      range: [start, end],
      cellSize: ['auto', 16],
      top: 30,
      left: 38,
      right: 16,
      bottom: 56,
      orient: 'horizontal',
      splitLine: { show: false },
      itemStyle: {
        color: surface2,
        borderColor: borderStrong,
        borderWidth: 1,
      },
      yearLabel: { show: false },
      monthLabel: {
        nameMap: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
        color: text3, fontSize: 10, fontFamily: 'JetBrains Mono',
      },
      dayLabel: {
        nameMap: ['일','월','화','수','목','금','토'],
        color: text3, fontSize: 9, fontFamily: 'JetBrains Mono',
      },
    },
    series: [
      { type: 'heatmap', coordinateSystem: 'calendar', data },
      ...(state.vaultsByDate.size > 0 ? [{
        type: 'scatter',
        coordinateSystem: 'calendar',
        symbol: 'pin',
        symbolSize: 12,
        symbolOffset: [0, -2],
        itemStyle: {
          color: accentHex,
          borderColor: cssVar('--surface') || '#ffffff',
          borderWidth: 1.5,
        },
        data: [...state.vaultsByDate.entries()]
          .filter(([d]) => d >= start && d <= end)
          .map(([d, vaults]) => [d, vaults.length]),
        silent: true,
        z: 100,
      }] : []),
    ],
    animationDuration: 400,
  };
}

/* ───────────── 일별 작업 영역 ───────────── */

function groupNotesByCategory(notes, vaultCatMap, basis) {
  const groups = new Map();
  for (const n of notes || []) {
    const cat = vaultCatMap[n.vault_id] || 'unknown';
    if (!groups.has(cat)) {
      groups.set(cat, { cat, color: presetColorByCategory(cat), notes: [] });
    }
    groups.get(cat).notes.push(n);
  }
  const key = basis === 'created' ? 'created' : 'mtime';
  for (const g of groups.values()) {
    g.notes.sort((a, b) => {
      const ka = a[key] || a.mtime || '';
      const kb = b[key] || b.mtime || '';
      return ka.localeCompare(kb);
    });
  }
  return [...groups.values()].sort((a, b) => b.notes.length - a.notes.length);
}

function dayCardHtml(n, catColor, basis) {
  const stamp = basis === 'created' ? (n.created || n.mtime) : (n.mtime || n.created);
  const time = timeFromStamp(stamp);
  const title = n.title || (n.path || '').split('/').pop() || '(untitled)';
  const tags = (n.tags || []).slice(0, 3).map((t) =>
    `<span class="tag">${escapeHtml(t)}</span>`
  ).join('');
  const typeChip = n.type
    ? `<span class="type-chip">${escapeHtml(n.type)}</span>`
    : '';
  return `
    <div class="day-card" style="--cat-color:${escapeHtml(catColor)};" data-vault="${escapeHtml(n.vault_id)}" data-path="${escapeHtml(n.path)}">
      <span class="time">${escapeHtml(time)}</span>
      <div class="body">
        <div class="ttl" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="meta">
          <span class="vault-chip" data-open-vault="${escapeHtml(n.vault_id)}" title="Obsidian 으로 볼트 열기">${escapeHtml(n.vault_id)}</span>
          ${typeChip}
        </div>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
      <button class="open-btn" data-open-note="${escapeHtml(n.vault_id)}|${escapeHtml(n.path)}" title="Obsidian 으로 노트 열기">↗</button>
    </div>
  `;
}

function dayCatSectionHtml(group, basis) {
  const cardsHtml = group.notes.map((n) => dayCardHtml(n, group.color, basis)).join('');
  return `
    <section class="cat-section">
      <header class="cat-head">
        <span class="cat-dot" style="background:${escapeHtml(group.color)};"></span>
        <span class="cat-name">${escapeHtml(group.cat)}</span>
        <span class="cat-count">${group.notes.length} 노트</span>
      </header>
      <div class="day-cards">${cardsHtml}</div>
    </section>
  `;
}

function emptyDayAreaHtml() {
  return `
    <div class="day-empty">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <div class="hint">캘린더 셀을 클릭하면 그 날 추가·편집된 노트가 카테고리별 카드로 펼쳐집니다.<br/>가운데 핸들을 위·아래로 드래그해 영역 비율을 조절할 수 있어요.</div>
    </div>
  `;
}

function dayAreaHtml(date, entry, addedVaults, basis, notes, vaultCatMap, loading, error) {
  const verb = basis === 'created' ? '생성' : '갱신';
  const total = entry ? entry.count : (Array.isArray(notes) ? notes.length : 0);
  const added = Array.isArray(addedVaults) ? addedVaults : [];
  const addedHtml = added.length > 0
    ? `<span class="day-added">+${added.length} 볼트 추가: ${added.map((v) => `<span class="vault-pill" data-open-vault="${escapeHtml(v)}">${escapeHtml(v)}</span>`).join(' ')}</span>`
    : '';
  const linkHash = basis === 'created' ? `#additions?date=${date}&basis=created` : `#additions?date=${date}`;
  let bodyHtml;
  if (error) {
    bodyHtml = `<div class="day-empty"><div class="hint" style="color:var(--danger);">로드 실패: ${escapeHtml(error)}</div></div>`;
  } else if (loading) {
    bodyHtml = `<div class="day-empty"><div class="hint">로드 중…</div></div>`;
  } else if (!Array.isArray(notes) || notes.length === 0) {
    bodyHtml = `<div class="day-empty"><div class="hint">이 날 ${verb}된 노트가 없습니다.</div></div>`;
  } else {
    const groups = groupNotesByCategory(notes, vaultCatMap, basis);
    bodyHtml = `<div class="cat-sections">${groups.map((g) => dayCatSectionHtml(g, basis)).join('')}</div>`;
  }
  return `
    <header class="day-head">
      <span class="day-date">${escapeHtml(date)}</span>
      <span class="day-count">${total} 노트 ${verb}</span>
      ${addedHtml}
      <a class="day-link" href="${linkHash}">전체 페이지 보기 →</a>
    </header>
    ${bodyHtml}
  `;
}

/* ───────────── Shell ───────────── */

function shellHtml(state) {
  const segHtml = LOOKBACK_OPTIONS.map((o) =>
    `<button data-lookback="${o.key}" class="${o.key === state.lookback ? 'on' : ''}">${escapeHtml(o.label)}</button>`
  ).join('');
  const basisSegHtml = BASES.map((b) =>
    `<button data-basis="${b}" class="${b === state.basis ? 'on' : ''}">${escapeHtml(BASIS_LABELS[b])}</button>`
  ).join('');
  const titleVerb = state.basis === 'created' ? '생성' : '갱신';
  const splitPct = (state.splitRatio * 100).toFixed(2);
  return `
    <section class="page page-calendar">
      <div class="toolbar">
        <div class="tool-group">
          <span class="tool-label">기준</span>
          <div class="seg" data-role="basisSeg">${basisSegHtml}</div>
        </div>
        <div class="tool-group">
          <span class="tool-label">기간</span>
          <div class="seg" data-role="lookback">${segHtml}</div>
        </div>
        <div class="tool-group">
          <span class="tool-label">사용자 정의</span>
          <div class="range-wrap">
            <input type="number" data-role="customDays" min="${CUSTOM_DAYS_MIN}" max="${CUSTOM_DAYS_MAX}" placeholder="일 수" style="width:80px;background:transparent;border:1px solid var(--border);border-radius:5px;padding:5px 8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">
            <button data-role="customApply" class="btn">적용</button>
          </div>
        </div>
        <div class="tool-group">
          <span class="tool-label">범위</span>
          <span data-role="range" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2);">${escapeHtml(state.range[0])} → ${escapeHtml(state.range[1])}</span>
        </div>
        <div class="tool-group" style="margin-left:auto;">
          <span class="tool-label">총합</span>
          <span data-role="totals" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2);">집계 중…</span>
        </div>
      </div>
      <div class="cal-stack" data-role="calStack" style="--cal-split:${splitPct}%;">
        <div class="cal-top" data-role="calTop">
          <div class="chart-wrap">
            <div class="chart-head">
              <span class="chart-title" data-role="chartTitle">노트 ${titleVerb} 캘린더</span>
              <span class="chart-meta" data-role="meta">heatmap by ${state.basis}</span>
            </div>
            <div id="cal-heatmap"></div>
          </div>
        </div>
        <div class="cal-resizer" data-role="resizer" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="캘린더와 일별 영역 비율 조절"><span class="grip"></span></div>
        <div class="cal-bottom" data-role="calBottom">
          <div class="day-area" data-role="dayArea">${emptyDayAreaHtml()}</div>
        </div>
      </div>
    </section>
  `;
}

function parseBasisFromHash() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '') || '';
  const q = h.indexOf('?');
  if (q < 0) return DEFAULT_BASIS;
  const params = new URLSearchParams(h.slice(q + 1));
  const b = (params.get('basis') || '').toLowerCase();
  return BASES.includes(b) ? b : DEFAULT_BASIS;
}

function setBasisInHash(basis) {
  const h = window.location.hash || '#calendar';
  const base = h.split('?')[0];
  const newHash = basis === DEFAULT_BASIS ? base : `${base}?basis=${basis}`;
  if (window.location.hash !== newHash) window.location.hash = newHash;
}

/**
 * @param {HTMLElement} container
 * @param {object} data — router 가 전달 (master.vaults 사용)
 * @param {object} userConfig
 */
export async function initPage(container, data /* , userConfig */) {
  if (!container) throw new Error('calendar.initPage: container 필수');
  const echarts = (typeof window !== 'undefined' && window.echarts) || null;
  if (!echarts) throw new Error('calendar.initPage: window.echarts 미로딩 (ECharts CDN 필요)');

  const masterVaults = data?.master?.vaults || null;
  const vaultCatMap = buildVaultCategoryMap(masterVaults);

  const initial = LOOKBACK_OPTIONS.find((o) => o.key === DEFAULT_LOOKBACK);
  const state = {
    lookback: DEFAULT_LOOKBACK,
    range: computeRange(initial.days, null),
    notes: [],
    byDate: new Map(),
    vaultsByDate: new Map(),
    dataMinDate: null,
    basis: parseBasisFromHash(),
    splitRatio: loadSplitRatio(),
    selectedDate: null,
    dailyNotes: [],
    dailyLoading: false,
    dailyError: null,
    dailyGen: 0,
  };

  container.innerHTML = shellHtml(state);
  const chartEl = container.querySelector('#cal-heatmap');
  const segWrap = container.querySelector('[data-role="lookback"]');
  const basisSegWrap = container.querySelector('[data-role="basisSeg"]');
  const rangeLabel = container.querySelector('[data-role="range"]');
  const totalsLabel = container.querySelector('[data-role="totals"]');
  const metaLabel = container.querySelector('[data-role="meta"]');
  const chartTitleEl = container.querySelector('[data-role="chartTitle"]');
  const dayArea = container.querySelector('[data-role="dayArea"]');
  const calStack = container.querySelector('[data-role="calStack"]');
  const calTop = container.querySelector('[data-role="calTop"]');
  const calBottom = container.querySelector('[data-role="calBottom"]');
  const resizer = container.querySelector('[data-role="resizer"]');
  const chart = echarts.init(chartEl);

  let aborted = false;

  function renderChart() {
    chart.setOption(buildHeatmapOption(state), true);
    if (rangeLabel) rangeLabel.textContent = `${state.range[0]} → ${state.range[1]}`;
    const t = totalsInRange(state.byDate, state.range);
    const verb = state.basis === 'created' ? '생성' : '갱신';
    if (totalsLabel) totalsLabel.textContent = `${t.total} 노트 ${verb} · ${t.activeDays}일 활동 / 전체 ${state.notes.length}`;
    if (metaLabel) metaLabel.textContent = `heatmap by ${state.basis} · max ${t.max}`;
    if (chartTitleEl) chartTitleEl.textContent = `노트 ${verb} 캘린더`;
  }

  function renderDayArea() {
    if (!dayArea) return;
    if (!state.selectedDate) {
      dayArea.innerHTML = emptyDayAreaHtml();
      return;
    }
    const entry = state.byDate.get(state.selectedDate);
    const addedVaults = state.vaultsByDate.get(state.selectedDate) || [];
    dayArea.innerHTML = dayAreaHtml(
      state.selectedDate, entry, addedVaults, state.basis,
      state.dailyNotes, vaultCatMap, state.dailyLoading, state.dailyError
    );
  }

  async function fetchDailyNotes(date, basis) {
    if (!date) return;
    const gen = ++state.dailyGen;
    state.dailyLoading = true;
    state.dailyError = null;
    renderDayArea();
    try {
      const params = new URLSearchParams({ date });
      if (basis && basis !== 'mtime') params.set('basis', basis);
      const r = await fetch(`/api/additions?${params.toString()}`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (gen !== state.dailyGen || aborted) return;
      state.dailyNotes = filterVisibleNotes(Array.isArray(j.notes) ? j.notes : []);
      state.dailyLoading = false;
      renderDayArea();
    } catch (err) {
      if (gen !== state.dailyGen || aborted) return;
      state.dailyLoading = false;
      state.dailyError = err?.message || String(err);
      renderDayArea();
    }
  }

  async function fetchAndRender() {
    try {
      const [notesRes, birthsRes] = await Promise.all([
        fetch('/api/all-notes', { cache: 'no-cache' }),
        fetch('/api/vault-births', { cache: 'no-cache' }),
      ]);
      if (!notesRes.ok) throw new Error(`HTTP ${notesRes.status}`);
      const payload = await notesRes.json();
      if (aborted) return;
      state.notes = filterVisibleNotes(Array.isArray(payload.notes) ? payload.notes : []);
      state.byDate = aggregateByDate(state.notes, state.basis);
      state.dataMinDate = computeMinDate(state.notes, state.basis);
      if (state.lookback === 'all') {
        state.range = computeRange(null, state.dataMinDate);
      }
      state.vaultsByDate = new Map();
      if (birthsRes.ok) {
        const birthsPayload = await birthsRes.json();
        const vaults = Array.isArray(birthsPayload.vaults) ? birthsPayload.vaults : [];
        for (const v of vaults) {
          if (!v || !v.birthtime || !v.vaultId) continue;
          const date = v.birthtime.slice(0, 10);
          if (!state.vaultsByDate.has(date)) state.vaultsByDate.set(date, []);
          state.vaultsByDate.get(date).push(v.vaultId);
        }
      }
      renderChart();
      renderDayArea();
    } catch (err) {
      console.warn('[calendar] fetch 실패:', err);
      if (!aborted && totalsLabel) totalsLabel.textContent = `로드 실패 (${err && err.message || err})`;
    }
  }
  fetchAndRender();

  /* ───────────── 이벤트 핸들러 ───────────── */
  function onLookback(e) {
    const btn = e.target.closest('button[data-lookback]');
    if (!btn) return;
    const key = btn.getAttribute('data-lookback');
    const opt = LOOKBACK_OPTIONS.find((o) => o.key === key);
    if (!opt) return;
    state.lookback = key;
    state.range = computeRange(opt.days, state.dataMinDate);
    segWrap.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    renderChart();
  }
  function onCellClick(p) {
    if (!p || !p.value) return;
    const date = p.value[0];
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    state.selectedDate = date;
    state.dailyNotes = [];
    fetchDailyNotes(date, state.basis);
  }
  function onBasisClick(e) {
    const btn = e.target.closest('button[data-basis]');
    if (!btn) return;
    const next = btn.getAttribute('data-basis');
    if (!BASES.includes(next) || next === state.basis) return;
    state.basis = next;
    basisSegWrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-basis') === next));
    state.byDate = aggregateByDate(state.notes, state.basis);
    state.dataMinDate = computeMinDate(state.notes, state.basis);
    if (state.lookback === 'all') {
      state.range = computeRange(null, state.dataMinDate);
    }
    renderChart();
    setBasisInHash(next);
    if (state.selectedDate) {
      fetchDailyNotes(state.selectedDate, state.basis);
    }
  }
  const onResize = () => chart.resize();

  const customInput = container.querySelector('[data-role="customDays"]');
  const customApply = container.querySelector('[data-role="customApply"]');
  function applyCustomDays() {
    if (!customInput) return;
    const days = parseInt(customInput.value, 10);
    if (!Number.isFinite(days) || days < CUSTOM_DAYS_MIN || days > CUSTOM_DAYS_MAX) {
      customInput.style.borderColor = 'var(--danger)';
      setTimeout(() => { customInput.style.borderColor = 'var(--border)'; }, 1200);
      return;
    }
    state.lookback = 'custom';
    state.range = computeRange(days);
    segWrap.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    renderChart();
  }
  function onCustomKey(e) { if (e.key === 'Enter') applyCustomDays(); }

  /* ───────────── Resizer (drag + keyboard) ───────────── */
  let dragging = false;
  let stackRect = null;

  function applySplitRatio(ratio) {
    state.splitRatio = ratio;
    const pct = `${(ratio * 100).toFixed(2)}%`;
    calStack.style.setProperty('--cal-split', pct);
    // 이중 안전망 — CSS 변수가 어떤 이유로 layout 반영 안 되는 케이스 방어
    calTop.style.flexBasis = pct;
    chart.resize();
  }
  function onResizerPointerDown(e) {
    dragging = true;
    stackRect = calStack.getBoundingClientRect();
    resizer.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    if (typeof resizer.setPointerCapture === 'function' && e.pointerId != null) {
      try { resizer.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!dragging || !stackRect) return;
    const relY = e.clientY - stackRect.top;
    let ratio = relY / stackRect.height;
    ratio = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, ratio));
    applySplitRatio(ratio);
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    stackRect = null;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (typeof resizer.releasePointerCapture === 'function' && e && e.pointerId != null) {
      try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    saveSplitRatio(state.splitRatio);
  }
  function onResizerKey(e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const step = e.shiftKey ? 0.10 : 0.02;
    const delta = e.key === 'ArrowUp' ? -step : step;
    const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, state.splitRatio + delta));
    applySplitRatio(next);
    saveSplitRatio(next);
    e.preventDefault();
  }
  function onResizerDoubleClick() {
    applySplitRatio(SPLIT_DEFAULT);
    saveSplitRatio(SPLIT_DEFAULT);
  }

  /* ───────────── Obsidian 열기 delegated ───────────── */
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

  segWrap.addEventListener('click', onLookback);
  basisSegWrap.addEventListener('click', onBasisClick);
  chart.on('click', onCellClick);
  window.addEventListener('resize', onResize);
  if (customApply) customApply.addEventListener('click', applyCustomDays);
  if (customInput) customInput.addEventListener('keydown', onCustomKey);
  resizer.addEventListener('pointerdown', onResizerPointerDown);
  resizer.addEventListener('pointermove', onPointerMove);
  resizer.addEventListener('pointerup', onPointerUp);
  resizer.addEventListener('pointercancel', onPointerUp);
  // capture-phase fallback (pointer capture 미지원·실패 시)
  document.addEventListener('mousemove', onPointerMove, true);
  document.addEventListener('mouseup', onPointerUp, true);
  resizer.addEventListener('keydown', onResizerKey);
  resizer.addEventListener('dblclick', onResizerDoubleClick);

  // 초기 비율 적용 (DOM mount 후 1회)
  applySplitRatio(state.splitRatio);
  container.addEventListener('click', onObsidianOpenClick, true);

  const themeObserver = new MutationObserver(() => {
    setTimeout(() => renderChart(), 50);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme'],
  });

  return {
    destroy() {
      aborted = true;
      segWrap.removeEventListener('click', onLookback);
      basisSegWrap.removeEventListener('click', onBasisClick);
      chart.off('click', onCellClick);
      window.removeEventListener('resize', onResize);
      if (customApply) customApply.removeEventListener('click', applyCustomDays);
      if (customInput) customInput.removeEventListener('keydown', onCustomKey);
      resizer.removeEventListener('pointerdown', onResizerPointerDown);
      resizer.removeEventListener('pointermove', onPointerMove);
      resizer.removeEventListener('pointerup', onPointerUp);
      resizer.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('mousemove', onPointerMove, true);
      document.removeEventListener('mouseup', onPointerUp, true);
      resizer.removeEventListener('keydown', onResizerKey);
      resizer.removeEventListener('dblclick', onResizerDoubleClick);
      container.removeEventListener('click', onObsidianOpenClick, true);
      themeObserver.disconnect();
      chart.dispose();
      container.innerHTML = '';
    },
    refresh() {
      fetchAndRender();
      if (state.selectedDate) fetchDailyNotes(state.selectedDate, state.basis);
    },
  };
}

export const __internal = {
  computeRange,
  aggregateByDate,
  totalsInRange,
  buildHeatmapOption,
  shellHtml,
  parseBasisFromHash,
  buildVaultCategoryMap,
  groupNotesByCategory,
  dayCardHtml,
  dayCatSectionHtml,
  emptyDayAreaHtml,
  dayAreaHtml,
  loadSplitRatio,
  saveSplitRatio,
  LOOKBACK_OPTIONS,
  BASES,
  SPLIT_MIN,
  SPLIT_MAX,
  SPLIT_DEFAULT,
};
