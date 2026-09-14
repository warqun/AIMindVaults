import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starButtonHtml } from './note-star.js';

// 이 모듈은 DOM 을 함수 안에서만 만지므로 node 에서 import 된다.
// 여기서는 DOM 없이 검사 가능한 부분 — 마크업 생성 — 만 다룬다.
// paintStars 의 idempotency (무한 루프 방지) 는 브라우저 실동작으로 검증했다.

test('starButtonHtml — 볼트명·경로가 HTML 로 새지 않는다', () => {
  const html = starButtonHtml('<img src=x onerror=alert(1)>', 'a"b/c.md');
  assert.ok(!html.includes('<img'), '태그가 그대로 들어가면 안 된다');
  assert.ok(html.includes('&lt;img'), '이스케이프되어야 한다');
  assert.ok(!/data-star-note="[^"]*"[^>]*"/.test(html.split('title=')[0]),
    '속성값 안의 따옴표가 속성을 깨면 안 된다');
  assert.ok(html.includes('&quot;'), '경로의 따옴표도 이스케이프');
});

test('starButtonHtml — 역슬래시 경로를 슬래시로 통일', () => {
  const html = starButtonHtml('V', 'Contents\\Domain\\a.md');
  assert.ok(html.includes('data-star-note="V|Contents/Domain/a.md"'));
});

test('starButtonHtml — 기본 상태는 빈 별 (상태는 paintStars 가 칠한다)', () => {
  const html = starButtonHtml('V', 'a.md');
  assert.ok(html.includes('☆'));
  assert.ok(!html.includes('★'));
  // data-starred 를 미리 박지 않는다 — 박아두면 paintStars 의 "이미 맞음" 판정에 걸려
  // 첫 칠하기가 통째로 건너뛰어진다.
  assert.ok(!html.includes('data-starred'));
});

test('starButtonHtml — 키는 vault|path 형식이고 파싱이 왕복한다', () => {
  const html = starButtonHtml('AI_Coding', 'Contents/a.md');
  const m = html.match(/data-star-note="([^"]+)"/);
  assert.ok(m);
  const [vault, ...rest] = m[1].split('|');
  assert.equal(vault, 'AI_Coding');
  assert.equal(rest.join('|'), 'Contents/a.md');
});
