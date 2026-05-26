import assert from 'node:assert/strict';
import { applyPerformanceOptions, setupSseDiff, __internal } from './sse-diff.js';

// 1. applyPerformanceOptions
const opt = { series: [{ data: [], links: [] }] };
applyPerformanceOptions(opt);
assert.equal(opt.series[0].large, true);
assert.equal(opt.series[0].largeThreshold, 1000);
assert.equal(opt.series[0].hoverLayerThreshold, 3000);
assert.equal(opt.series[0].id, 'graph-main');

// 2. applyPerformanceOptions — empty option 안전
applyPerformanceOptions(null);
applyPerformanceOptions(undefined);
applyPerformanceOptions({});
applyPerformanceOptions({ series: [] });
applyPerformanceOptions({ series: [null] });

// 3. __internal 상수
assert.equal(__internal.SERIES_ID, 'graph-main');
assert.equal(__internal.LARGE_THRESHOLD, 1000);
assert.equal(__internal.HOVER_LAYER_THRESHOLD, 3000);

// 4. setupSseDiff 인터페이스 — merge 모드 + 좌표 보존 + freeze/labels reset
const chartMock = {
  _setOpts: [],
  setOption(opt, mode) { this._setOpts.push({ opt, mode }); },
  getOption() { return { series: [{ data: [{ id: 'a', x: 100, y: 200 }, { id: 'b', x: 300, y: 400 }] }] }; },
};
const buildOpt = (data) => ({
  series: [{
    id: 'graph-main',
    data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    links: [{ source: 'a', target: 'b' }],
  }],
});
const freezeApi = { _resetCalled: 0, resetFrozenFlag() { this._resetCalled++; } };
const labelsApi = { _recompCalled: 0, _lastNodes: null, recomputeThreshold(nodes) { this._recompCalled++; this._lastNodes = nodes; } };

const sse = setupSseDiff(chartMock, buildOpt, freezeApi, labelsApi);
sse.onDataChanged({});
assert.equal(chartMock._setOpts.length, 1);
// merge 모드 (notMerge=false) — replaceMerge 사용 안 함
assert.equal(chartMock._setOpts[0].mode, false);
assert.equal(chartMock._setOpts[0].opt.series[0].id, 'graph-main');
assert.equal(chartMock._setOpts[0].opt.series[0].data.length, 3);
// 좌표 보존 검증 — 기존 노드 a, b 의 좌표가 신규 데이터에 전달됨
const newData = chartMock._setOpts[0].opt.series[0].data;
const nodeA = newData.find((n) => n.id === 'a');
const nodeB = newData.find((n) => n.id === 'b');
const nodeC = newData.find((n) => n.id === 'c');
assert.equal(nodeA.x, 100);
assert.equal(nodeA.y, 200);
assert.equal(nodeB.x, 300);
assert.equal(nodeB.y, 400);
assert.equal(nodeC.x, undefined, '신규 노드는 좌표 부재');
assert.equal(freezeApi._resetCalled, 1);
assert.equal(labelsApi._recompCalled, 1);
assert.equal(labelsApi._lastNodes.length, 3);

// 5. dispose 후 호출 무시
sse.dispose();
sse.onDataChanged({});
assert.equal(chartMock._setOpts.length, 1);
assert.equal(freezeApi._resetCalled, 1);

// 6. 잘못된 인자 — 예외
assert.throws(() => setupSseDiff(null, buildOpt, freezeApi, labelsApi));
assert.throws(() => setupSseDiff({ setOption: 'x' }, buildOpt, freezeApi, labelsApi));
assert.throws(() => setupSseDiff(chartMock, null, freezeApi, labelsApi));

// 7. buildOptionFromData throw — 안전 (콘솔 에러만)
const chartMock2 = { _setOpts: [], setOption(o, m) { this._setOpts.push({ o, m }); }, getOption() { return null; } };
const sse2 = setupSseDiff(chartMock2, () => { throw new Error('boom'); }, freezeApi, labelsApi);
const origErr = console.error;
console.error = () => {};
sse2.onDataChanged({});
console.error = origErr;
assert.equal(chartMock2._setOpts.length, 0);

// 8. newOption.series[0] 부재 — 안전 (콘솔 경고만)
const sse3 = setupSseDiff(chartMock2, () => ({ series: [] }), freezeApi, labelsApi);
const origWarn = console.warn;
console.warn = () => {};
sse3.onDataChanged({});
console.warn = origWarn;
assert.equal(chartMock2._setOpts.length, 0);

console.log('sse-diff.test.js PASS');
