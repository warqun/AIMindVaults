/**
 * AIMindVaults Visualization — Network Labels 모듈 (Phase 2.7 W4)
 *
 * 책임:
 *   노드 중요도 score (nodeImportance = degree + recency boost) 기반 상위 N 위 임계값 계산 →
 *   threshold 이상의 노드만 라벨 표시. 슬라이더 (sliders.js labelCount) 와 SSE 갱신 (sse-diff) 에서
 *   updateScoreThreshold / recomputeThreshold 호출.
 *
 * Recency boost:
 *   - mtime 7일 이내: +5
 *   - 7~14일:        +3
 *   - 14~30일:       +1
 *
 * hub 노드 (HUB_ID_PREFIX 시작) 는 임계와 무관하게 항상 표시.
 *
 * Spec:    [[20260508_그래프뷰_안정화_인터페이스_명세]] § 2.4
 * 영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.5
 */

const HUB_ID_PREFIX = '__hub_';  // hubs.js 부재 시 자체 정의 (메인이 통합 시 import 로 교체)

/**
 * 노드 중요도 score (혼합 — degree + recency boost).
 * 계획서 § 4.6.
 *
 * @param {{degree?:number, mtime?:string|number}} node
 * @returns {number}
 */
export function nodeImportance(node) {
  if (!node) return 0;
  let boost = 0;
  if (node.mtime) {
    const t = new Date(node.mtime).getTime();
    if (Number.isFinite(t)) {
      const daysSince = (Date.now() - t) / (1000 * 60 * 60 * 24);
      if (daysSince < 7)       boost = 5;
      else if (daysSince < 14) boost = 3;
      else if (daysSince < 30) boost = 1;
    }
  }
  return (node.degree || 0) + boost;
}

/**
 * 노드 degree 계산 — links 의 source/target 출현 횟수 합.
 * (buildOptionA 가 degree 직접 부여 X — 본 함수가 보충)
 *
 * @param {Array<{id?:string}>} nodes
 * @param {Array<{source?:string, target?:string}>} links
 * @returns {Map<string, number>}
 */
export function computeNodeDegrees(nodes, links) {
  const map = new Map();
  if (!Array.isArray(nodes) || !Array.isArray(links)) return map;
  for (const n of nodes) if (n.id) map.set(n.id, 0);
  for (const l of links) {
    if (l.source && map.has(l.source)) map.set(l.source, map.get(l.source) + 1);
    if (l.target && map.has(l.target)) map.set(l.target, map.get(l.target) + 1);
  }
  return map;
}

/**
 * 상위 N 위 score (threshold). N+1 위 score 반환 — 그 이상이 N 개.
 * hub 노드 (HUB_ID_PREFIX) 제외하고 계산.
 *
 * @param {Array<{id?:string, degree?:number, mtime?:string|number}>} nodes
 * @param {number} n
 * @returns {number}
 */
export function computeScoreThreshold(nodes, n) {
  if (!Array.isArray(nodes) || !Number.isFinite(n) || n <= 0) return Infinity;
  const realNodes = nodes.filter((x) => !x.id?.startsWith?.(HUB_ID_PREFIX));
  const sorted = realNodes.map(nodeImportance).sort((a, b) => b - a);
  // n 개가 통과하려면 n번째 원소 (0-indexed n-1) 까지가 통과 = threshold = sorted[n] (즉 n+1 번째)
  return sorted.length > n ? sorted[n] : 0;
}

/**
 * ECharts option.series[0] 의 label / labelLayout / emphasis 적용.
 * option mutate (반환 없음).
 *
 * scoreThreshold closure 캡처: 호출 시점의 threshold 가 formatter 안에 박힘.
 * threshold 변경 시 본 함수 재호출 + chart.setOption 필요.
 *
 * @param {object} option
 * @param {number} scoreThreshold
 */
export function applyLabelOptions(option, scoreThreshold) {
  if (!option || !Array.isArray(option.series) || !option.series[0]) return;
  const series0 = option.series[0];
  series0.label = {
    show: true,
    position: 'right',
    formatter: (p) => {
      const data = p?.data || {};
      if (data.id?.startsWith?.(HUB_ID_PREFIX)) return data.name || '';
      return nodeImportance(data) >= scoreThreshold ? (p.name || data.name || '') : '';
    },
  };
  series0.labelLayout = { hideOverlap: true };
  series0.emphasis = { ...(series0.emphasis || {}), focus: 'adjacency' };
}

/**
 * setupLabels — 메인이 호출. 첫 진입 시 degree 계산 + threshold 계산 + option mutate + setOption.
 *
 * @param {echarts.ECharts} chart
 * @param {Array<{id?:string, mtime?:string|number}>} initialNodes
 * @param {number} initialLabelCount
 * @returns {{updateScoreThreshold: (n:number)=>void, recomputeThreshold: (nodes:any[])=>void}}
 */
export function setupLabels(chart, initialNodes, initialLabelCount) {
  // degree 보충 — initialNodes 에 degree 없으면 계산해서 부여
  function ensureDegrees(nodes) {
    const links = chart.getOption()?.series?.[0]?.links || [];
    const degMap = computeNodeDegrees(nodes, links);
    for (const n of nodes) {
      if (typeof n.degree !== 'number' && n.id) {
        n.degree = degMap.get(n.id) || 0;
      }
    }
  }

  ensureDegrees(initialNodes);
  let currentNodes = initialNodes;
  let currentCount = initialLabelCount;
  let threshold = computeScoreThreshold(currentNodes, currentCount);

  // 최초 적용
  const opt = chart.getOption();
  applyLabelOptions(opt, threshold);
  chart.setOption(opt, false);

  return {
    updateScoreThreshold(newCount) {
      currentCount = newCount;
      threshold = computeScoreThreshold(currentNodes, currentCount);
      const opt2 = chart.getOption();
      applyLabelOptions(opt2, threshold);
      chart.setOption({ series: [{ label: opt2.series[0].label, labelLayout: opt2.series[0].labelLayout, emphasis: opt2.series[0].emphasis }] }, false);
    },
    recomputeThreshold(newNodes) {
      ensureDegrees(newNodes);
      currentNodes = newNodes;
      threshold = computeScoreThreshold(currentNodes, currentCount);
      const opt2 = chart.getOption();
      applyLabelOptions(opt2, threshold);
      chart.setOption({ series: [{ label: opt2.series[0].label }] }, false);
    },
  };
}

export const __internal = { HUB_ID_PREFIX };
