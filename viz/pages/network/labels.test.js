import assert from 'node:assert/strict';
import { nodeImportance, computeNodeDegrees, computeScoreThreshold, applyLabelOptions } from './labels.js';

// 1. nodeImportance
assert.equal(nodeImportance({ degree: 10 }), 10);  // mtime 없음
assert.equal(nodeImportance({ degree: 10, mtime: new Date(Date.now() - 3 * 86400000).toISOString() }), 15);  // 3일 전
assert.equal(nodeImportance({ degree: 10, mtime: new Date(Date.now() - 10 * 86400000).toISOString() }), 13);  // 10일 전
assert.equal(nodeImportance({ degree: 10, mtime: new Date(Date.now() - 20 * 86400000).toISOString() }), 11);  // 20일 전
assert.equal(nodeImportance({ degree: 10, mtime: new Date(Date.now() - 60 * 86400000).toISOString() }), 10);  // 60일 전

// 2. computeNodeDegrees
const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const links = [
  { source: 'a', target: 'b' },
  { source: 'a', target: 'c' },
  { source: 'b', target: 'c' },
];
const deg = computeNodeDegrees(nodes, links);
assert.equal(deg.get('a'), 2);
assert.equal(deg.get('b'), 2);
assert.equal(deg.get('c'), 2);

// 3. computeScoreThreshold — top 2
const scoredNodes = [
  { id: 'a', degree: 10 },
  { id: 'b', degree: 5 },
  { id: 'c', degree: 3 },
  { id: 'd', degree: 1 },
];
const t = computeScoreThreshold(scoredNodes, 2);
assert.equal(t, 3);  // top 2 (10, 5) 통과 → threshold = 3 위 (3) → 3 이상이 3개. 의도적 — N=2 면 threshold 3 미만 노드만 라벨 숨김. 사실상 top 2 + 동률

// 4. computeScoreThreshold — hub 제외
const withHub = [
  { id: 'Unity', degree: 10 },
  { id: '__hub_Domains_Game', degree: 0 },
  { id: 'AI', degree: 5 },
];
const t2 = computeScoreThreshold(withHub, 1);
assert.equal(t2, 5);  // top 1 (Unity 10) → threshold 5 (AI). hub 제외

// 5. applyLabelOptions
const opt = { series: [{ data: [{ id: 'a' }] }] };
applyLabelOptions(opt, 5);
assert.equal(opt.series[0].label.show, true);
assert.equal(opt.series[0].label.position, 'right');
assert.equal(opt.series[0].labelLayout.hideOverlap, true);
assert.equal(opt.series[0].emphasis.focus, 'adjacency');

console.log('labels.test.js PASS');
