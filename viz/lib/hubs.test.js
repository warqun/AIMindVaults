import assert from 'node:assert/strict';
import { addCategoryHubs, isHubNode, filterRealNodes, HUB_ID_PREFIX } from './hubs.js';

// 1. HUB_ID_PREFIX
assert.equal(HUB_ID_PREFIX, '__hub_');

// 2. isHubNode
assert.equal(isHubNode('__hub_Domains_Game'), true);
assert.equal(isHubNode('Unity'), false);
assert.equal(isHubNode({ id: '__hub_Lab' }), true);
assert.equal(isHubNode({ id: 'Cooking' }), false);
assert.equal(isHubNode(null), false);

// 3. filterRealNodes
const mixed = [
  { id: 'Unity' },
  { id: '__hub_Domains_Game' },
  { id: 'AI' },
  { id: '__hub_Lab' },
];
assert.equal(filterRealNodes(mixed).length, 2);

// 4. addCategoryHubs
const input = {
  nodes: [
    { id: 'Unity', name: 'Unity', category: 'Domains_Game' },
    { id: 'GameDesign', name: 'GameDesign', category: 'Domains_Game' },
    { id: 'AI', name: 'AI', category: 'Domains_Infra' },
  ],
  links: [
    { source: 'Unity', target: 'GameDesign', value: 5 },
  ],
  categories: [
    { name: 'Domains_Game' },
    { name: 'Domains_Infra' },
  ],
};

const out = addCategoryHubs(input);
// 원본 노드 3 + hub 2 = 5
assert.equal(out.nodes.length, 5);
// hub 2개
assert.equal(out.nodes.filter(n => isHubNode(n)).length, 2);
// hub id 형식
assert.ok(out.nodes.some(n => n.id === '__hub_Domains_Game'));
assert.ok(out.nodes.some(n => n.id === '__hub_Domains_Infra'));
// 원본 link 1 + hub link 3 (Unity, GameDesign, AI 각 1) = 4
assert.equal(out.links.length, 4);
// hub link source/target 검증
const hubLinks = out.links.filter(l => l.target?.startsWith(HUB_ID_PREFIX));
assert.equal(hubLinks.length, 3);
assert.ok(hubLinks.every(l => l.lineStyle.opacity === 0));

// 5. addCategoryHubs 잘못된 input
assert.throws(() => addCategoryHubs(null));
assert.throws(() => addCategoryHubs({ nodes: [] }));

console.log('hubs.test.js PASS');
