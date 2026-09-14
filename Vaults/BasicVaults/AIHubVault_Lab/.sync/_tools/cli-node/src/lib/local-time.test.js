import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localIso, localDate, localStamp } from './local-time.js';

test('localIso — 로컬 달력 기준 YYYY-MM-DDTHH:MM:SS', () => {
  // 로컬 2026-08-08 01:30:05 — UTC+9 라면 toISOString() 은 전날(08-07)이 된다.
  const d = new Date(2026, 7, 8, 1, 30, 5);
  assert.equal(localIso(d), '2026-08-08T01:30:05');
  assert.equal(localDate(d), '2026-08-08');
  assert.equal(localStamp(d), '20260808');
});

test('localIso — 자정·연말 경계에서도 로컬 날짜 유지', () => {
  assert.equal(localIso(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01T00:00:00');
  assert.equal(localIso(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31T23:59:59');
});

test('localIso — 한 자리 월·일·시 zero padding', () => {
  assert.equal(localIso(new Date(2026, 2, 4, 5, 6, 7)), '2026-03-04T05:06:07');
});

test('UTC 변환과 달리 날짜가 밀리지 않는다 (UTC+ 환경에서만 유의미)', () => {
  const d = new Date(2026, 7, 8, 1, 0, 0);   // 로컬 08-08 01:00
  const utcDate = d.toISOString().slice(0, 10);
  assert.equal(localDate(d), '2026-08-08');
  if (d.getTimezoneOffset() < 0) {
    // UTC+ 지역: toISOString() 은 하루 앞으로 밀린다 — 이 버그가 고쳐진 지점
    assert.notEqual(utcDate, localDate(d));
  }
});

test('인자 없으면 현재 시각 — 형식만 검증', () => {
  assert.match(localIso(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.match(localDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(localStamp(), /^\d{8}$/);
});
