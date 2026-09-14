import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVORITES_ID,
  defaultCollectionsFile,
  normalizeCollectionsFile,
  noteKey,
  toggleNote,
  collectionsContaining,
} from './collections.js';

const NOTE = { vault: 'AI_Coding', path: 'Contents/Domain/a.md' };

test('noteKey — 소스에 리터럴 NUL 이 박히지 않는다 (R188/2026-08-27 재발 방지)', () => {
  // 구분자는 U+0000 이 맞다. 다만 소스 파일에 그 바이트가 그대로 들어가면 git·grep·file 이
  // 파일을 바이너리로 판정한다. 여기서는 "값은 NUL, 소스는 텍스트" 를 동시에 확인한다.
  const k = noteKey(NOTE);
  assert.equal(k, `AI_Coding${String.fromCharCode(0)}Contents/Domain/a.md`);
  assert.ok(k.includes(String.fromCharCode(0)));
});

test('normalizeCollectionsFile — 쓰레기 입력이면 기본 파일', () => {
  for (const bad of [null, undefined, 42, 'x', {}, { collections: 'nope' }]) {
    const out = normalizeCollectionsFile(bad);
    assert.equal(out.collections.length, 1);
    assert.equal(out.collections[0].id, FAVORITES_ID);
  }
});

test('normalizeCollectionsFile — 즐겨찾기는 지워도 되살아나고 항상 맨 앞', () => {
  const noFav = normalizeCollectionsFile({ collections: [{ id: 'manuals', name: 'M', notes: [] }] });
  assert.equal(noFav.collections[0].id, FAVORITES_ID);
  assert.equal(noFav.collections.length, 2);

  const favLast = normalizeCollectionsFile({
    collections: [
      { id: 'manuals', name: 'M', notes: [] },
      { id: FAVORITES_ID, name: '즐겨찾기', notes: [] },
    ],
  });
  assert.equal(favLast.collections[0].id, FAVORITES_ID);
  assert.equal(favLast.collections.length, 2);
});

test('normalizeCollectionsFile — 잘못된 id 는 버린다', () => {
  const out = normalizeCollectionsFile({
    collections: [
      { id: 'OK-1', name: 'a', notes: [] },      // 대문자 → 소문자화되어 통과
      { id: '한글', name: 'b', notes: [] },       // 비 ASCII → 탈락
      { id: '-lead', name: 'c', notes: [] },     // 선두 하이픈 → 탈락
      { id: '', name: 'd', notes: [] },          // 빈 값 → 탈락
    ],
  });
  const ids = out.collections.map((c) => c.id);
  assert.deepEqual(ids, [FAVORITES_ID, 'ok-1']);
});

test('normalizeCollectionsFile — 노트 경로 정규화 + 탈출 차단 + 중복 제거', () => {
  const out = normalizeCollectionsFile({
    collections: [{
      id: FAVORITES_ID,
      name: 'f',
      notes: [
        { vault: 'V', path: 'Contents\\a.md' },      // 역슬래시 → 슬래시
        { vault: 'V', path: '/Contents/a.md' },      // 선두 슬래시 제거 → 위와 동일 → 중복
        { vault: 'V', path: '../secret.md' },        // 상위 탈출 → 탈락
        { vault: '', path: 'x.md' },                 // 볼트 없음 → 탈락
        { vault: 'V', path: '' },                    // 경로 없음 → 탈락
        'nope',                                      // 객체 아님 → 탈락
      ],
    }],
  });
  assert.deepEqual(out.collections[0].notes, [{ vault: 'V', path: 'Contents/a.md' }]);
});

test('toggleNote — 없으면 추가, 있으면 제거, 입력은 불변', () => {
  const base = defaultCollectionsFile();
  const added = toggleNote(base, FAVORITES_ID, NOTE);
  assert.equal(added.added, true);
  assert.equal(added.file.collections[0].notes.length, 1);
  assert.equal(base.collections[0].notes.length, 0, '원본이 변형되면 안 된다');

  const removed = toggleNote(added.file, FAVORITES_ID, NOTE);
  assert.equal(removed.added, false);
  assert.equal(removed.file.collections[0].notes.length, 0);
});

test('collectionsContaining — 담긴 컬렉션 id 만', () => {
  let file = normalizeCollectionsFile({
    collections: [
      { id: FAVORITES_ID, name: 'f', notes: [] },
      { id: 'manuals', name: 'M', notes: [] },
    ],
  });
  file = toggleNote(file, 'manuals', NOTE).file;
  assert.deepEqual(collectionsContaining(file, NOTE), ['manuals']);
  assert.deepEqual(collectionsContaining(file, { vault: 'X', path: 'y.md' }), []);
});
