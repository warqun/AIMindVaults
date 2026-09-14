import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortNotes, sortGroups, timeLabel, stampOf, SORTS, DEFAULT_SORT } from './note-sort.js';

const CAT = { Godot: 'Domains_Game', DevFoundation: 'Domains_Dev', AI: 'Domains_Infra' };

const NOTES = [
  { vault_id: 'DevFoundation', title: '인터넷', path: 'a/CS_29.md', mtime: '2026-08-08T02:24:03', created: '2026-08-08T00:00:00' },
  { vault_id: 'Godot', title: '가나다 노트', path: 'b/g.md', mtime: '2026-08-08T09:10:00', created: '2026-08-08T09:10:00' },
  { vault_id: 'AI', title: 'Colibri', path: 'c/ai.md', mtime: '2026-08-08T05:00:00', created: '2026-08-08T00:00:00' },
];

test('timeLabel — 날짜-온리 created 는 00:00 대신 대시', () => {
  assert.equal(timeLabel('2026-08-08T00:00:00'), '—');
  assert.equal(timeLabel('2026-08-08T09:10:00'), '09:10');
  assert.equal(timeLabel(''), '—');
  assert.equal(timeLabel('2026-08-08'), '—');
});

test('stampOf — basis 우선, 없으면 fallback', () => {
  assert.equal(stampOf(NOTES[0], 'created'), '2026-08-08T00:00:00');
  assert.equal(stampOf(NOTES[0], 'mtime'), '2026-08-08T02:24:03');
  assert.equal(stampOf({ mtime: 'M' }, 'created'), 'M');
  assert.equal(stampOf(null, 'mtime'), '');
});

test('sortNotes recent — 최신 먼저, 원본 불변', () => {
  const out = sortNotes(NOTES, 'recent', 'mtime', CAT);
  assert.deepEqual(out.map((n) => n.title), ['가나다 노트', 'Colibri', '인터넷']);
  assert.equal(NOTES[0].title, '인터넷', '원본 배열이 변형되면 안 됨');
});

test('sortNotes recent — created 동시각이면 mtime 으로 tie-break', () => {
  const out = sortNotes(NOTES, 'recent', 'created', CAT);
  // created 기준: 09:10 (Godot) 이 최신, 나머지 둘은 T00:00:00 동률 → mtime desc
  assert.deepEqual(out.map((n) => n.title), ['가나다 노트', 'Colibri', '인터넷']);
});

test('sortNotes catTitle — 카테고리명 → 제목 순 (ko locale)', () => {
  const out = sortNotes(NOTES, 'catTitle', 'mtime', CAT);
  assert.deepEqual(out.map((n) => n.vault_id), ['DevFoundation', 'Godot', 'AI']);
});

test('sortNotes catTitle — 같은 카테고리는 제목순 (한글 가나다 / 영문 A-Z)', () => {
  const cat = { V: 'Domains_X' };
  // 한글·영문 사이의 순서는 ko 로케일 구현에 맡기고, 같은 문자체계 안의 순서만 검증한다.
  const ko = sortNotes(
    [{ vault_id: 'V', title: '하늘' }, { vault_id: 'V', title: '나무' }, { vault_id: 'V', title: '가을' }],
    'catTitle', 'mtime', cat,
  );
  assert.deepEqual(ko.map((n) => n.title), ['가을', '나무', '하늘']);

  const en = sortNotes(
    [{ vault_id: 'V', title: 'Zebra' }, { vault_id: 'V', title: 'apple' }, { vault_id: 'V', title: 'Mango' }],
    'catTitle', 'mtime', cat,
  );
  assert.deepEqual(en.map((n) => n.title), ['apple', 'Mango', 'Zebra']);
});

test('sortNotes catTitle — 제목 없으면 파일명으로 정렬', () => {
  const cat = { V: 'Domains_X' };
  const out = sortNotes(
    [{ vault_id: 'V', path: 'a/나중.md' }, { vault_id: 'V', path: 'b/가장.md' }],
    'catTitle', 'mtime', cat,
  );
  assert.deepEqual(out.map((n) => n.path), ['b/가장.md', 'a/나중.md']);
});

test('sortGroups — recent 는 노트 수, catTitle 은 이름순', () => {
  const groups = [
    { cat: 'Zed', notes: [1, 2, 3] },
    { cat: 'Alpha', notes: [1] },
  ];
  assert.deepEqual(sortGroups(groups, 'recent').map((g) => g.cat), ['Zed', 'Alpha']);
  assert.deepEqual(sortGroups(groups, 'catTitle').map((g) => g.cat), ['Alpha', 'Zed']);
});

test('상수 계약', () => {
  assert.deepEqual(SORTS, ['recent', 'catTitle']);
  assert.ok(SORTS.includes(DEFAULT_SORT));
});
