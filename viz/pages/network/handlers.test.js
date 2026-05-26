/**
 * Phase 2.7 W1 — handlers.test.js
 * spec § 6.1 워커 자체 검증. node 직접 실행.
 *
 * 검증:
 *  1. 상수 (HUB_ID_PREFIX, FREEZE_DEBOUNCE_MS) 노출
 *  2. setupDragLock — chart.on('graphdragend') 등록 + dragend 콜백이 fixed=true 설정 + dispose 시 off
 *  3. setupThemeObserver — document/MutationObserver 미정의 환경에서 noop 반환
 *  4. setupConditionalFreeze — chart.on('finished') 등록 + api.resetFrozenFlag / unfreezeAndScheduleRefreeze 노출
 */

import assert from 'node:assert/strict';
import {
  setupConditionalFreeze,
  setupDragLock,
  setupThemeObserver,
  __internal,
} from './handlers.js';

// 1. 상수 검증
assert.equal(__internal.HUB_ID_PREFIX, '__hub_');
assert.equal(__internal.FREEZE_DEBOUNCE_MS, 1000);

// 2. setupDragLock
function makeChartMock() {
  return {
    _events: {},
    _opt: { series: [{ data: [{ id: 'a' }, { id: 'b' }] }] },
    on(name, fn) { this._events[name] = fn; },
    off(name) { delete this._events[name]; },
    getOption() { return this._opt; },
    setOption(patch) {
      if (patch && patch.series && patch.series[0] && patch.series[0].data) {
        this._opt.series[0].data = patch.series[0].data;
      }
      this._setCalled = (this._setCalled || 0) + 1;
    },
    getModel() { return null; },
  };
}

{
  const chart = makeChartMock();
  const dispose = setupDragLock(chart);
  assert.ok(typeof chart._events.graphdragend === 'function', 'graphdragend 등록 안 됨');
  chart._events.graphdragend({ dataIndex: 0 });
  assert.equal(chart._opt.series[0].data[0].fixed, true, 'fixed=true 설정 안 됨');
  assert.equal(chart._opt.series[0].data[1].fixed, undefined, '다른 노드 fixed 영향 안 됨');
  // 잘못된 params 무시
  chart._events.graphdragend(null);
  chart._events.graphdragend({ dataIndex: 'invalid' });
  dispose();
  assert.equal(chart._events.graphdragend, undefined, 'dispose 후 off 안 됨');
}

// 3. setupThemeObserver — Node 환경 (document/MutationObserver 미정의) noop
{
  const chart = makeChartMock();
  const dispose = setupThemeObserver(chart);
  assert.equal(typeof dispose, 'function', 'dispose 반환 X');
  dispose(); // noop 호출 안전 확인
}

// 4. setupConditionalFreeze — api 노출 검증
{
  const chart = makeChartMock();
  const api = {};
  const dispose = setupConditionalFreeze(chart, api);
  assert.ok(typeof chart._events.finished === 'function', 'finished 등록 안 됨');
  assert.equal(typeof api.unfreezeAndScheduleRefreeze, 'function', 'unfreezeAndScheduleRefreeze 노출 X');
  assert.equal(typeof api.resetFrozenFlag, 'function', 'resetFrozenFlag 노출 X');

  // resetFrozenFlag 호출 시 예외 없음
  api.resetFrozenFlag();

  // unfreezeAndScheduleRefreeze 호출 시 setOption 호출됨
  const beforeCalled = chart._setCalled || 0;
  api.unfreezeAndScheduleRefreeze({ gravity: 0.05 });
  assert.ok((chart._setCalled || 0) > beforeCalled, 'setOption 호출 안 됨');

  dispose();
  assert.equal(chart._events.finished, undefined, 'dispose 후 off 안 됨');
}

console.log('handlers.test.js PASS — 4 케이스 통과');
