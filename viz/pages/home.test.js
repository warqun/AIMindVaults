/**
 * Phase 2.8 W3 + fix — home.test.js
 * computeRecentChange — 일별 누적 추가량 정책.
 *
 * 정책: 가장 최근 추가 (양수 변화) 있는 일자 + 그 날 누적 추가량.
 * 감소는 무시. 평탄은 "—" (date null).
 */

import assert from 'node:assert/strict';
import { computeRecentChange } from './home.js';

// 1. 빈 입력
assert.deepEqual(computeRecentChange([], 'vault_count'), { delta: 0, date: null });
assert.deepEqual(computeRecentChange(null, 'x'), { delta: 0, date: null });

// 2. snapshots < 2 — 비교 대상 없음
const single = [{ date: '2026-05-08', timestamp: '...', vault_count: 32 }];
assert.deepEqual(computeRecentChange(single, 'vault_count'), { delta: 0, date: null });

// 3. 같은 날 여러 양수 변화 — 누적
const sameDay = [
  { date: '2026-05-08', timestamp: 't1', note_count: 1200 },
  { date: '2026-05-08', timestamp: 't2', note_count: 1205 }, // +5
  { date: '2026-05-08', timestamp: 't3', note_count: 1207 }, // +2
];
assert.deepEqual(computeRecentChange(sameDay, 'note_count'), { delta: 7, date: '2026-05-08' });

// 4. 다른 날 추가 — 가장 최근 만 (이전 일자 무시)
const multiDay = [
  { date: '2026-05-06', timestamp: '...', note_count: 1200 },
  { date: '2026-05-07', timestamp: '...', note_count: 1210 },  // +10
  { date: '2026-05-08', timestamp: '...', note_count: 1215 },  // +5
];
assert.deepEqual(computeRecentChange(multiDay, 'note_count'), { delta: 5, date: '2026-05-08' });

// 5. 감소만 — 무시, date null
const onlyDecrease = [
  { date: '2026-05-08', timestamp: '...', note_count: 1215 },
  { date: '2026-05-09', timestamp: '...', note_count: 1211 },
];
assert.deepEqual(computeRecentChange(onlyDecrease, 'note_count'), { delta: 0, date: null });

// 6. 평탄 — date null
const flat = [
  { date: '2026-05-07', timestamp: '...', vault_count: 32 },
  { date: '2026-05-08', timestamp: '...', vault_count: 32 },
];
assert.deepEqual(computeRecentChange(flat, 'vault_count'), { delta: 0, date: null });

// 7. 감소 + 그 직전 추가 — 추가만 잡힘 (Codex 검증 후 정리 케이스)
const validatedClean = [
  { date: '2026-05-08', timestamp: 't1', note_count: 1211 },
  { date: '2026-05-08', timestamp: 't2', note_count: 1212 },  // +1 검증 추가
  { date: '2026-05-08', timestamp: 't3', note_count: 1211 },  // -1 정리 (감소 무시)
];
assert.deepEqual(computeRecentChange(validatedClean, 'note_count'), { delta: 1, date: '2026-05-08' });

// 8. 같은 날 추가 + 감소 + 추가 — 양수만 누적
const mixed = [
  { date: '2026-05-08', timestamp: 't1', note_count: 100 },
  { date: '2026-05-08', timestamp: 't2', note_count: 105 },  // +5
  { date: '2026-05-08', timestamp: 't3', note_count: 102 },  // -3 (무시)
  { date: '2026-05-08', timestamp: 't4', note_count: 110 },  // +8
];
assert.deepEqual(computeRecentChange(mixed, 'note_count'), { delta: 13, date: '2026-05-08' });

// 9. 키 누락 — 0 fallback
const missing = [
  { date: '2026-05-08', timestamp: '...' },
  { date: '2026-05-09', timestamp: '...', vault_count: 32 },
];
assert.deepEqual(computeRecentChange(missing, 'vault_count'), { delta: 32, date: '2026-05-09' });

console.log('home.test.js PASS — 9 케이스 통과 (일별 누적 정책)');
