/**
 * AIMindVaults Visualization — Category Hub Nodes (Phase 2.7 W3)
 *
 * 역할:
 *   network 페이지 force-directed graph 에서 카테고리당 invisible hub 노드 1 개 + 같은 카테고리
 *   노드 → hub invisible link 생성. hub 가 끌어당겨 같은 카테고리 노드들이 군집을 형성.
 *
 * Hub 특성:
 *   - id    : `__hub_${categoryName}` (HUB_ID_PREFIX 시작)
 *   - 시각  : symbolSize 0 + itemStyle.opacity 0 (보이지 않음)
 *   - 라벨  : label.show=true (카테고리명 표시, fontSize 14, opacity 0.6)
 *   - 링크  : 모든 같은 카테고리 노드와 invisible link (lineStyle.opacity 0)
 *
 * 주요 export:
 *   - HUB_ID_PREFIX                 ← `__hub_` 상수 (다른 모듈에서 hub 필터 시 사용)
 *   - addCategoryHubs(input)         ← {nodes, links, categories} → hub 추가된 신규 객체
 *   - isHubNode(idOrNode)            ← id 또는 노드 객체가 hub 인지
 *   - filterRealNodes(nodes)         ← hub 제외 (KPI 카운트·검색 등)
 *
 * Spec: [[20260508_그래프뷰_안정화_인터페이스_명세]] § 2.3
 * 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.lib
 *
 * @typedef {import('./loadIndex.js').IndexData} IndexData
 *
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} name
 * @property {string|number} category
 * @property {number} [symbolSize]
 * @property {{color?:string, opacity?:number}} [itemStyle]
 * @property {{show?:boolean, [k:string]:any}} [label]
 * @property {boolean} [fixed]
 * @property {number} [x]
 * @property {number} [y]
 *
 * @typedef {Object} GraphLink
 * @property {string} source
 * @property {string} target
 * @property {number} [value]
 * @property {{width?:number, opacity?:number, [k:string]:any}} [lineStyle]
 *
 * @typedef {Object} CategoryEntry
 * @property {string} name
 *
 * @typedef {Object} GraphData
 * @property {GraphNode[]} nodes
 * @property {GraphLink[]} links
 * @property {CategoryEntry[]} categories
 */

export const HUB_ID_PREFIX = '__hub_';

/**
 * 카테고리당 invisible hub 노드 + 같은 카테고리 노드 → hub 의 invisible 링크 추가.
 * hub 자체는 카테고리명 라벨 표시 (label.show=true, 6 그룹이면 6 라벨).
 *
 * @param {GraphData} input
 * @returns {GraphData} 신규 nodes + links (원본 + hub 노드 + hub 링크)
 */
export function addCategoryHubs(input) {
  if (!input || !Array.isArray(input.nodes) || !Array.isArray(input.links) || !Array.isArray(input.categories)) {
    throw new Error('addCategoryHubs: input.nodes/links/categories 모두 배열 필수');
  }

  const { nodes, links, categories } = input;

  // 1. hub 노드 생성 — 카테고리당 1개
  const hubs = categories.map((cat) => ({
    id: `${HUB_ID_PREFIX}${cat.name}`,
    name: cat.name,
    category: cat.name,
    symbolSize: 0,
    label: {
      show: true,
      position: 'inside',
      fontSize: 14,
      fontWeight: 'bold',
      opacity: 0.6,
    },
    itemStyle: { opacity: 0 },
    fixed: false,
  }));

  // 2. hub 링크 생성 — 각 노드 → 자기 카테고리 hub
  const hubLinks = [];
  for (const n of nodes) {
    const catName = String(n.category);
    if (!catName) continue;
    const hubExists = hubs.some((h) => h.category === catName);
    if (!hubExists) continue;
    hubLinks.push({
      source: n.id,
      target: `${HUB_ID_PREFIX}${catName}`,
      lineStyle: { opacity: 0 },
    });
  }

  return {
    nodes: [...nodes, ...hubs],
    links: [...links, ...hubLinks],
    categories,
  };
}

/**
 * id 가 hub prefix 로 시작하는지.
 * @param {string|{id?:string}} idOrNode
 * @returns {boolean}
 */
export function isHubNode(idOrNode) {
  if (typeof idOrNode === 'string') {
    return idOrNode.startsWith(HUB_ID_PREFIX);
  }
  if (idOrNode && typeof idOrNode === 'object' && typeof idOrNode.id === 'string') {
    return idOrNode.id.startsWith(HUB_ID_PREFIX);
  }
  return false;
}

/**
 * hub 노드 제외한 실제 노드만 반환. KPI 카운트·검색 등에 사용.
 * @param {GraphNode[]} nodes
 * @returns {GraphNode[]}
 */
export function filterRealNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.filter((n) => !isHubNode(n));
}

export const __internal = { HUB_ID_PREFIX };
