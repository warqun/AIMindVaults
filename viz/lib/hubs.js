/**
 * 카테고리 hub 노드/엣지 생성. force-directed 그래프에서 invisible hub 가
 * 같은 카테고리 노드들을 끌어당겨 군집 형성.
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
