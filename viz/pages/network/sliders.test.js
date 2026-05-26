// Unit test for viz/pages/network/sliders.js
// Run: node viz/pages/network/sliders.test.js
// 노트: localStorage / DOM 의존 부분은 jsdom 필요해 생략. 정적 export 만 검증.

import assert from 'node:assert/strict';
import { DEFAULT_NETWORK_CONFIG, __internal } from './sliders.js';

assert.equal(DEFAULT_NETWORK_CONFIG.force.gravity, 0.04, 'gravity default 0.04');
assert.equal(DEFAULT_NETWORK_CONFIG.force.repulsion, 800, 'repulsion default 800');
assert.equal(DEFAULT_NETWORK_CONFIG.force.edgeLength, 180, 'edgeLength default 180');
assert.equal(DEFAULT_NETWORK_CONFIG.labelCount, 50, 'labelCount default 50');

assert.ok(Object.isFrozen(DEFAULT_NETWORK_CONFIG), 'DEFAULT_NETWORK_CONFIG frozen');
assert.ok(Object.isFrozen(DEFAULT_NETWORK_CONFIG.force), 'DEFAULT_NETWORK_CONFIG.force frozen');

assert.equal(__internal.STORAGE_KEY, 'aimv_viz_user_config', 'STORAGE_KEY 정합 (settings.js 와 공유)');
assert.equal(__internal.SAVE_DEBOUNCE_MS, 400, 'SAVE_DEBOUNCE_MS 400');

const r = __internal.SLIDER_RANGES;
assert.equal(r.gravity.min, 0.02);
assert.equal(r.gravity.max, 0.15);
assert.equal(r.gravity.step, 0.005);
assert.equal(r.gravity.default, 0.04);

assert.equal(r.repulsion.min, 200);
assert.equal(r.repulsion.max, 1500);
assert.equal(r.repulsion.step, 50);
assert.equal(r.repulsion.default, 800);

assert.equal(r.edgeLen.min, 80);
assert.equal(r.edgeLen.max, 300);
assert.equal(r.edgeLen.step, 10);
assert.equal(r.edgeLen.default, 180);

assert.equal(r.labelCount.min, 10);
assert.equal(r.labelCount.max, 200);
assert.equal(r.labelCount.step, 10);
assert.equal(r.labelCount.default, 50);

console.log('sliders.test.js PASS');
