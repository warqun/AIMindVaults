/**
 * Phase 2.7 W1 — viz/pages/network/handlers.js
 * spec § 2.1 (단일 진리원 20260508_그래프뷰_안정화_인터페이스_명세)
 *
 * 책임 3종:
 *  - setupConditionalFreeze: force 수렴 후 layout='none' + x,y 박제. unfreeze + 1초 debounce 재freeze.
 *  - setupDragLock: graphdragend 시 노드 fixed=true.
 *  - setupThemeObserver: data-theme 변경 → chart.resize() (ECharts bug#18174 회피).
 *
 * 외부 의존성: ECharts CDN (window.echarts) 만 — 직접 import X.
 *
 * @typedef {Object} ForcePartial
 * @property {number} [gravity]
 * @property {number} [repulsion]
 * @property {[number, number]} [edgeLength]
 * @property {number} [friction]
 *
 * @typedef {Object} ConditionalFreezeAPI
 * @property {(forcePartial: ForcePartial) => void} unfreezeAndScheduleRefreeze
 * @property {() => void} resetFrozenFlag
 */

const HUB_ID_PREFIX = '__hub_';
const FREEZE_DEBOUNCE_MS = 1000;

/**
 * 조건부 freeze.
 * - chart.on('finished') 발화 시 layoutFrozen 미설정이면 layout='none' + node.x/y 박제 (hub 제외).
 * - api.unfreezeAndScheduleRefreeze(forcePartial): layoutFrozen=false + layout='force' 복귀 + 1초 debounce 재freeze.
 * - api.resetFrozenFlag(): SSE 갱신 후 W5 호출. layoutFrozen=false 만.
 *
 * @param {any} chart  ECharts instance
 * @param {ConditionalFreezeAPI} api
 * @returns {() => void} dispose
 */
export function setupConditionalFreeze(chart, api) {
  let layoutFrozen = false;
  let freezeTimer = null;

  function freezeIfNeeded() {
    if (layoutFrozen) return;
    const model = chart.getModel && chart.getModel();
    const series = model && model.getSeriesByIndex && model.getSeriesByIndex(0);
    if (!series) return;
    const nodeData = series.getData && series.getData();
    if (!nodeData) return;
    const opt = chart.getOption();
    if (!opt || !opt.series || !opt.series[0]) return;
    opt.series[0].layout = 'none';
    const data = opt.series[0].data || [];
    data.forEach((node, i) => {
      if (node && node.id && typeof node.id.startsWith === 'function' && node.id.startsWith(HUB_ID_PREFIX)) return;
      const layout = nodeData.getItemLayout(i);
      if (layout && Number.isFinite(layout[0]) && Number.isFinite(layout[1])) {
        node.x = layout[0];
        node.y = layout[1];
      }
    });
    chart.setOption(opt, false);
    layoutFrozen = true;
  }

  chart.on('finished', freezeIfNeeded);

  api.unfreezeAndScheduleRefreeze = (forcePartial) => {
    layoutFrozen = false;
    chart.setOption({
      series: [{ layout: 'force', force: forcePartial || {} }],
    }, false);
    if (freezeTimer) clearTimeout(freezeTimer);
    freezeTimer = setTimeout(() => {
      // 'finished' 이벤트가 발화하면서 freezeIfNeeded 가 자동 freeze
      freezeTimer = null;
    }, FREEZE_DEBOUNCE_MS);
  };

  api.resetFrozenFlag = () => {
    layoutFrozen = false;
  };

  return function dispose() {
    if (freezeTimer) {
      clearTimeout(freezeTimer);
      freezeTimer = null;
    }
    try { chart.off('finished', freezeIfNeeded); } catch (e) { /* noop */ }
  };
}

/**
 * 드래그 종료 시 노드 fixed=true. force 재실행 시에도 보호.
 *
 * @param {any} chart  ECharts instance
 * @returns {() => void} dispose
 */
export function setupDragLock(chart) {
  const onDragend = (params) => {
    if (!params || typeof params.dataIndex !== 'number') return;
    const opt = chart.getOption();
    const data = opt && opt.series && opt.series[0] && opt.series[0].data;
    if (!data || !data[params.dataIndex]) return;
    data[params.dataIndex].fixed = true;
    chart.setOption({ series: [{ data }] }, false);
  };
  chart.on('graphdragend', onDragend);
  return function dispose() {
    try { chart.off('graphdragend', onDragend); } catch (e) { /* noop */ }
  };
}

/**
 * data-theme attribute 변경 (다크/라이트 토글) 감지 → chart.resize().
 * ECharts bug#18174 (layoutAnimation:false + 줌·범례 조작 시 노드 어긋남) 회피.
 *
 * @param {any} chart  ECharts instance
 * @returns {() => void} dispose
 */
export function setupThemeObserver(chart) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return function noop() {};
  }
  const observer = new MutationObserver(() => {
    try { chart.resize(); } catch (e) { /* noop */ }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return function dispose() {
    observer.disconnect();
  };
}

export const __internal = { HUB_ID_PREFIX, FREEZE_DEBOUNCE_MS };
