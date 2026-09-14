/**
 * AIMindVaults Visualization — 노트 ★ 즐겨찾기 토글 (R195)
 *
 * 역할:
 *   노트를 보여주는 페이지 어디서든 **한 줄로** 즐겨찾기 토글을 붙인다.
 *   explorer · tags · calendar · additions 가 이미 공통 규약
 *   `<button data-open-note="vault|path">↗</button>` 을 쓰고 있어, 그 옆에 같은 형식의
 *   `data-star-note` 버튼을 두고 델리게이트 핸들러 하나로 처리한다.
 *
 * 왜 페이지마다 따로 만들지 않았나:
 *   4 페이지가 같은 마크업·같은 델리게이트 패턴을 쓴다. 각자 구현하면 4벌이 되고
 *   `_collections.json` 쓰기 로직이 4곳에 흩어진다. `pages/collections.js` 의 lookup 키를
 *   손으로 다시 조립했다가 조용히 틀렸던 2026-08-27 사고와 같은 구조가 된다.
 *
 * 저장:
 *   `lib/collections.js` 의 `favorites` 기본 컬렉션. `/api/collections` GET/POST.
 *   즐겨찾기를 별도 저장소로 두지 않는다 (2026-08-27 사용자 결정).
 *
 * 사용법 (페이지 쪽):
 *   1. 노트 행 마크업에 `starButtonHtml(vault, path)` 를 open 버튼 옆에 넣는다.
 *   2. initPage 에서 `attachNoteStars(container)` 를 1회 호출하고, destroy 에서 반환값을 부른다.
 *   재렌더 후 다시 칠하는 것은 **모듈 내부 MutationObserver 가 알아서** 한다 — 페이지가
 *   신경 쓸 게 없다.
 *
 * @custom-feature: collections
 */

import { FAVORITES_ID, noteKey, normalizeCollectionsFile, toggleNote } from './collections.js';

const STAR_ON = '★';
const STAR_OFF = '☆';

/** 즐겨찾기 키 캐시. 페이지 전환마다 다시 fetch 하지 않게 모듈 수준에 둔다. */
let cachedFile = null;
let inflight = null;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function fetchFile() {
  const res = await fetch('/api/collections', { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/collections ${res.status}`);
  return normalizeCollectionsFile(await res.json());
}

/** 컬렉션 파일 확보 (캐시). 동시 호출은 하나의 요청으로 합친다. */
export async function loadCollections(force = false) {
  if (cachedFile && !force) return cachedFile;
  if (!inflight) {
    inflight = fetchFile()
      .then((f) => { cachedFile = f; return f; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** 현재 즐겨찾기 키 Set. 아직 안 불러왔으면 빈 Set (별이 비어 보일 뿐). */
function starredKeys() {
  const fav = cachedFile?.collections.find((c) => c.id === FAVORITES_ID);
  return new Set((fav?.notes ?? []).map(noteKey));
}

/**
 * 노트 행에 넣을 ★ 버튼 마크업. 상태는 `paintStars()` 가 나중에 칠하므로
 * 여기서는 항상 비어 있는 별로 그린다 — 렌더 타이밍과 데이터 로드를 분리한다.
 */
export function starButtonHtml(vault, path, cls = 'note-star') {
  const key = `${escapeHtml(vault)}|${escapeHtml(String(path ?? '').replace(/\\/g, '/'))}`;
  return `<button class="${cls}" data-star-note="${key}" title="즐겨찾기 (컬렉션)" `
    + `style="background:none;border:0;cursor:pointer;font-size:13px;line-height:1;padding:0 4px;opacity:.45">${STAR_OFF}</button>`;
}

/**
 * container 안의 모든 ★ 버튼을 현재 즐겨찾기 상태로 칠한다.
 *
 * **이미 맞는 버튼은 건드리지 않는다.** `textContent` 변경은 childList 변경이라 아래 observer 가
 * 그걸 다시 감지해 paint 를 부르고, 그 paint 가 또 변경을 만드는 무한 루프가 된다
 * (2026-08-27 실제 발생 — rAF 루프가 돌면서 클릭 처리가 먹히지 않았다).
 */
export function paintStars(container) {
  if (!container) return;
  const keys = starredKeys();
  for (const btn of container.querySelectorAll('[data-star-note]')) {
    const [vault, ...rest] = String(btn.dataset.starNote || '').split('|');
    const on = keys.has(noteKey({ vault, path: rest.join('|') }));
    const want = on ? '1' : '0';
    if (btn.dataset.starred === want) continue; // 변경 없음 → DOM 을 건드리지 않는다
    btn.textContent = on ? STAR_ON : STAR_OFF;
    btn.style.opacity = on ? '1' : '.45';
    btn.dataset.starred = want;
  }
}

/**
 * 델리게이트 클릭 핸들러 부착 + 최초 칠하기.
 * @returns {() => void} destroy — 페이지 destroy 에서 호출
 */
export function attachNoteStars(container) {
  if (!container) return () => {};

  const onClick = async (ev) => {
    const btn = ev.target.closest('[data-star-note]');
    if (!btn || !container.contains(btn)) return;
    // open 버튼과 같은 행에 있으므로 상위 클릭 (노트 선택·Obsidian 열기) 으로 새지 않게 막는다.
    ev.preventDefault();
    ev.stopPropagation();

    const [vault, ...rest] = String(btn.dataset.starNote || '').split('|');
    const note = { vault, path: rest.join('|') };
    if (!note.vault || !note.path) return;

    const before = cachedFile;
    try {
      const file = await loadCollections();
      const { file: next, added } = toggleNote(file, FAVORITES_ID, note);
      cachedFile = next;            // 낙관적 반영 — 클릭 즉시 별이 바뀐다
      paintStars(container);
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(`POST ${res.status}`);
      cachedFile = normalizeCollectionsFile(await res.json());
      paintStars(container);
      btn.title = added ? '즐겨찾기에서 빼기' : '즐겨찾기 (컬렉션)';
    } catch (err) {
      // 저장 실패 시 낙관적 반영을 되돌린다 — 화면과 파일이 어긋난 채 두지 않는다.
      console.warn('[note-star] 저장 실패:', err);
      cachedFile = before;
      paintStars(container);
    }
  };

  // capture 단계 — 페이지들이 이미 capture 로 open 핸들러를 걸어 두어 순서를 맞춘다.
  container.addEventListener('click', onClick, true);

  // 목록을 다시 그리는 페이지가 많다 (검색·태그 선택·날짜 선택…). 재렌더 지점마다
  // paintStars 를 부르게 하면 반드시 어딘가에서 빠진다 — explorer 한 곳만 해도 호출부가 6개였다.
  // 그래서 컨테이너를 관찰해 새 별이 들어오면 알아서 칠한다.
  // 디바운스에 requestAnimationFrame 을 쓰지 않는다. rAF 는 페이지가 화면에 그려지지 않을 때
  // (백그라운드 탭, 창 가림) 발화하지 않아 별이 영영 안 칠해진다 — 2026-08-27 실제로 이걸로 막혔다.
  // setTimeout 은 compositing 과 무관하게 돈다.
  let timer = null;
  const observe = () => observer.observe(container, { childList: true, subtree: true });
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      // paint 중 발생한 변경은 관찰하지 않는다. paintStars 가 idempotent 라 이것만으로도
      // 루프는 안 생기지만, 큰 목록에서 불필요한 콜백을 줄이는 효과도 있다.
      observer.disconnect();
      try { paintStars(container); } finally { observe(); }
    }, 0);
  });
  observe();

  loadCollections().then(() => paintStars(container)).catch(() => { /* 서버 없으면 별만 비어 있음 */ });

  return () => {
    if (timer) clearTimeout(timer);
    observer.disconnect();
    container.removeEventListener('click', onClick, true);
  };
}
