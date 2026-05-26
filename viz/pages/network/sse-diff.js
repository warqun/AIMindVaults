// viz/pages/network/sse-diff.js
// W5 — SSE diff replaceMerge + performance options.
// spec § 2.5 / plan § 4.7 / 4.8.

const SERIES_ID = 'graph-main';
const LARGE_THRESHOLD = 1000;
const HOVER_LAYER_THRESHOLD = 3000;

/**
 * series[0] 에 large / largeThreshold / hoverLayerThreshold 적용.
 * option mutate (반환 없음). 메인이 buildOptionFromData 결과에 본 함수 호출.
 *
 * @param {object} option
 */
export function applyPerformanceOptions(option) {
  if (!option || !Array.isArray(option.series) || !option.series[0]) return;
  const series0 = option.series[0];
  series0.large = true;
  series0.largeThreshold = LARGE_THRESHOLD;
  series0.hoverLayerThreshold = HOVER_LAYER_THRESHOLD;
  series0.id = SERIES_ID;
}

/**
 * SSE 'data-changed' 수신 시 chart.setOption replaceMerge.
 * 노드 ID 기반 위치 보존. 신규 노드만 force 일부 활성화.
 *
 * @param {echarts.ECharts} chart
 * @param {(data:object) => object} buildOptionFromData  메인 제공 — IndexData → option (hub 포함)
 * @param {{resetFrozenFlag:()=>void}} freezeApi  W1 ConditionalFreezeAPI
 * @param {{recomputeThreshold:(nodes:any[])=>void}} labelsApi  W4 LabelsAPI
 * @returns {{onDataChanged: (newData:object)=>void, dispose: ()=>void}}
 */
export function setupSseDiff(chart, buildOptionFromData, freezeApi, labelsApi) {
  if (!chart || typeof chart.setOption !== 'function') {
    throw new Error('setupSseDiff: chart 가 ECharts instance 아님');
  }
  if (typeof buildOptionFromData !== 'function') {
    throw new Error('setupSseDiff: buildOptionFromData 함수 필요');
  }

  let disposed = false;

  function onDataChanged(newData) {
    if (disposed) return;
    let newOption;
    try {
      newOption = buildOptionFromData(newData);
    } catch (err) {
      console.error('[sse-diff] buildOptionFromData 실패:', err);
      return;
    }

    const series0 = newOption && newOption.series && newOption.series[0];
    if (!series0) {
      console.warn('[sse-diff] newOption.series[0] 부재');
      return;
    }

    const oldOption = chart.getOption && chart.getOption();
    const oldData = oldOption && oldOption.series && oldOption.series[0] && oldOption.series[0].data;

    // 기존 노드의 x,y 좌표를 신규 노드에 전달 (ID 매칭) — 위치 보존
    const oldCoords = new Map();
    if (Array.isArray(oldData)) {
      for (const n of oldData) {
        if (n && n.id && Number.isFinite(n.x) && Number.isFinite(n.y)) {
          oldCoords.set(n.id, [n.x, n.y]);
        }
      }
    }
    for (const n of series0.data) {
      if (n && n.id && oldCoords.has(n.id)) {
        const [x, y] = oldCoords.get(n.id);
        n.x = x; n.y = y;
      }
    }

    // 노드 ID 안정성 검증 (개발 모드)
    if (Array.isArray(oldData) && Array.isArray(series0.data)) {
      const oldIds = new Set(oldData.map((n) => n && n.id).filter(Boolean));
      const newIds = new Set(series0.data.map((n) => n && n.id).filter(Boolean));
      const removed = [...oldIds].filter((id) => !newIds.has(id)).length;
      const added = [...newIds].filter((id) => !oldIds.has(id)).length;
      if (oldIds.size > 0 && added === oldIds.size && removed === oldIds.size) {
        console.warn('[sse-diff] 노드 ID 전체 교체 — 위치 보존 불가능. ID 안정성 확인 필요');
      }
    }

    // notMerge=false (merge 모드) — 기존 series[0] 의 type/layout/force/categories/label 등 보존,
    // data/links 만 신규 교체. replaceMerge 는 series 통째 교체라 type 등 사라져 노드 미렌더 — 사용 X.
    chart.setOption({
      series: [{
        id: SERIES_ID,
        data: series0.data,
        links: series0.links,
      }],
    }, false);

    try { freezeApi && freezeApi.resetFrozenFlag && freezeApi.resetFrozenFlag(); } catch (e) { /* noop */ }
    try { labelsApi && labelsApi.recomputeThreshold && labelsApi.recomputeThreshold(series0.data); } catch (e) { /* noop */ }
  }

  function dispose() {
    disposed = true;
  }

  return { onDataChanged, dispose };
}

export const __internal = { SERIES_ID, LARGE_THRESHOLD, HOVER_LAYER_THRESHOLD };
