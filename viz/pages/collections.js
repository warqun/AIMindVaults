/**
 * AIMindVaults Visualization — 컬렉션 페이지 (R193)
 *
 * 역할:
 *   즐겨찾기 + 노트 묶음. 자주 여는 노트를 컬렉션으로 모아 두고 클릭 한 번에 Obsidian 에서 연다.
 *   캘린더 (시간축) 와 달리 **사용자가 직접 부여한 메타데이터 기준**의 노트 시각화.
 *
 * 커스텀 기능:
 *   core 내장 페이지가 아니라 `custom-features.js` registry 의 `page` surface 로 등록된다.
 *   router 는 `custom-features-router.js` adapter 를 통해 이 페이지를 알게 된다.
 *
 * 저장:
 *   루트 `_collections.json` (git 추적) ← `/api/collections` GET/POST.
 *   `.vault_data/` 가 아닌 이유는 `lib/collections.js` 헤더 참조 (gitignore → 디바이스 비정합).
 *
 * 레이아웃:
 *   explorer 페이지의 `tree-preview` 클래스를 그대로 재사용 — 좌측 컬렉션 목록 / 우측 노트 목록.
 *   전용 CSS 를 새로 만들지 않는다.
 *
 * @custom-feature: collections
 */

import { openNote } from '../lib/obsidian-uri.js';
import { FAVORITES_ID, noteKey, toggleNote } from '../lib/collections.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function fetchCollections() {
  const res = await fetch('/api/collections', { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/collections ${res.status}`);
  // server 가 `corrupt: true` 를 실어 보낼 수 있다 (git merge conflict 등으로 파일 파싱 실패).
  // 이때 collections 는 기본값이므로 **빈 목록으로 오해시키면 안 된다.**
  return res.json();
}

async function saveCollections(file) {
  const res = await fetch('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(file),
  });
  if (!res.ok) throw new Error(`POST /api/collections ${res.status}`);
  return res.json();
}

/**
 * master_index 노트를 `{vault, path}` 키로 조회 — 제목·타입 등 표시용 메타 보강.
 *
 * 키는 반드시 `noteKey()` 로 만든다. 여기서 같은 형식을 손으로 다시 조립하면 구분자가
 * 어긋나도 아무도 못 잡는다 (2026-08-27 실제 발생 — 이쪽은 공백, noteKey 는 NUL 이라
 * 전 항목이 "인덱스에 없음" 으로 표시됐다. 문법 오류가 아니라 조용히 틀렸다).
 */
function buildNoteLookup(master) {
  const map = new Map();
  for (const n of (master?.notes ?? [])) {
    map.set(noteKey({ vault: n.vault_id, path: String(n.path ?? '').replace(/\\/g, '/') }), n);
  }
  return map;
}

function renderCollectionList(state) {
  return state.file.collections.map((c) => {
    const active = c.id === state.selectedId ? ' active' : '';
    const star = c.id === FAVORITES_ID ? '★ ' : '';
    return `
      <div class="tree-node collection-row${active}" data-collection="${escapeHtml(c.id)}"
           style="cursor:pointer;padding:6px 10px;display:flex;justify-content:space-between;gap:8px;align-items:center">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${star}${escapeHtml(c.name)}</span>
        <span class="dim" style="font-size:11px;flex:0 0 auto">${c.notes.length}</span>
      </div>`;
  }).join('');
}

function renderNotes(state) {
  const col = state.file.collections.find((c) => c.id === state.selectedId);
  if (!col) return '<div class="page-placeholder">컬렉션을 선택하세요.</div>';

  const canDelete = col.id !== FAVORITES_ID;
  const head = `
    <div class="toolbar" style="gap:8px;flex-wrap:wrap">
      <div class="tool-group" style="flex:1 1 auto;min-width:0">
        <strong style="font-size:14px">${escapeHtml(col.name)}</strong>
        ${col.description ? `<span class="dim" style="font-size:12px">${escapeHtml(col.description)}</span>` : ''}
      </div>
      <div class="tool-group">
        <button class="btn" data-act="add-note" style="font-size:11px;padding:4px 10px">+ 노트 추가</button>
        ${canDelete ? `<button class="btn" data-act="del-collection" style="font-size:11px;padding:4px 10px">컬렉션 삭제</button>` : ''}
      </div>
    </div>`;

  if (col.notes.length === 0) {
    return head + `<div class="page-placeholder">비어 있습니다. "+ 노트 추가" 로 담으세요.</div>`;
  }

  const rows = col.notes.map((n, i) => {
    const meta = state.lookup.get(noteKey(n));
    const title = meta?.title || n.path.split('/').pop().replace(/\.md$/, '');
    // 인덱스에 없는 노트 = 이름이 바뀌었거나 지워진 것. 지우지 않고 표시만 해 사용자가 판단하게 한다.
    const missing = meta ? '' : ' <span class="dim" style="font-size:11px">(인덱스에 없음)</span>';
    return `
      <div class="tree-node note-row" data-idx="${i}"
           style="display:flex;gap:8px;align-items:center;padding:6px 10px">
        <span style="flex:1 1 auto;min-width:0;cursor:pointer" data-act="open" title="Obsidian 에서 열기">
          <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(title)}${missing}</span>
          <span class="dim" style="font-size:11px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n.vault)} / ${escapeHtml(n.path)}</span>
        </span>
        <button class="btn" data-act="up" title="위로" style="font-size:11px;padding:2px 6px"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="btn" data-act="down" title="아래로" style="font-size:11px;padding:2px 6px"${i === col.notes.length - 1 ? ' disabled' : ''}>↓</button>
        <button class="btn" data-act="remove" title="컬렉션에서 빼기" style="font-size:11px;padding:2px 6px">×</button>
      </div>`;
  }).join('');

  return head + `<div class="tree">${rows}</div>`;
}

function render(state) {
  state.listEl.innerHTML = renderCollectionList(state);
  state.paneEl.innerHTML = renderNotes(state);
}

/** 노트 추가 — master_index 전체에서 검색해 고르는 간이 picker. */
function openPicker(state, onPick) {
  const notes = (state.data.master?.notes ?? []);
  const wrap = document.createElement('div');
  wrap.className = 'collections-picker';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60';
  wrap.innerHTML = `
    <div style="background:var(--bg,#1b1b1b);border:1px solid var(--border,#333);border-radius:8px;width:min(680px,92vw);max-height:76vh;display:flex;flex-direction:column">
      <div class="toolbar" style="padding:10px">
        <input type="text" class="search-input" id="pick-q" placeholder="노트 제목·경로 검색..." style="width:100%" />
      </div>
      <div class="tree" id="pick-list" style="overflow:auto;flex:1 1 auto;padding:0 6px 10px"></div>
      <div class="toolbar" style="padding:8px 10px;justify-content:flex-end">
        <button class="btn" id="pick-close" style="font-size:11px;padding:4px 10px">닫기</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const q = wrap.querySelector('#pick-q');
  const list = wrap.querySelector('#pick-list');

  const draw = () => {
    const term = q.value.trim().toLowerCase();
    // 빈 검색어에 6천 건을 다 그리면 브라우저가 멈춘다 — 항상 상한을 건다.
    const hits = (term
      ? notes.filter((n) => `${n.title} ${n.path} ${n.vault_id}`.toLowerCase().includes(term))
      : notes
    ).slice(0, 200);
    list.innerHTML = hits.length === 0
      ? '<div class="page-placeholder">일치하는 노트가 없습니다.</div>'
      : hits.map((n, i) => `
          <div class="tree-node" data-hit="${i}" style="padding:6px 10px;cursor:pointer">
            <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n.title || n.path)}</span>
            <span class="dim" style="font-size:11px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n.vault_id)} / ${escapeHtml(n.path)}</span>
          </div>`).join('');
    list._hits = hits;
  };

  const onInput = () => draw();
  const onClick = (e) => {
    const row = e.target.closest('[data-hit]');
    if (!row) return;
    const n = list._hits[Number(row.dataset.hit)];
    if (n) onPick({ vault: n.vault_id, path: String(n.path).replace(/\\/g, '/') });
  };
  const close = () => {
    q.removeEventListener('input', onInput);
    list.removeEventListener('click', onClick);
    wrap.remove();
  };

  q.addEventListener('input', onInput);
  list.addEventListener('click', onClick);
  wrap.querySelector('#pick-close').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });

  draw();
  q.focus();
  return close;
}

export async function initPage(container, data, userConfig) {
  container.innerHTML = `
    <div class="explorer-page collections-page">
      <div class="toolbar">
        <div class="tool-group">
          <button class="btn" id="col-new" style="font-size:11px;padding:4px 10px">+ 새 컬렉션</button>
        </div>
        <div class="tool-group">
          <span class="dim" id="col-status" style="font-size:11px"></span>
        </div>
      </div>
      <div class="main tree-preview">
        <div class="tree-wrap"><div class="tree" id="col-list"></div></div>
        <div class="preview" id="col-pane"></div>
      </div>
    </div>`;

  const state = {
    data,
    listEl: container.querySelector('#col-list'),
    paneEl: container.querySelector('#col-pane'),
    statusEl: container.querySelector('#col-status'),
    lookup: buildNoteLookup(data.master),
    file: { schemaVersion: 1, updatedAt: null, collections: [] },
    selectedId: FAVORITES_ID,
  };

  let closePicker = null;

  const setStatus = (msg) => { state.statusEl.textContent = msg || ''; };

  // 저장은 낙관적으로 그린 뒤 POST. 실패하면 서버 상태를 다시 읽어 화면을 되돌린다 —
  // 반쪽 상태로 남는 것보다 사용자가 실패를 보는 편이 낫다.
  const persist = async () => {
    render(state);
    try {
      setStatus('저장 중…');
      state.file = await saveCollections(state.file);
      setStatus('');
    } catch (err) {
      console.warn('[collections] 저장 실패:', err);
      setStatus(`저장 실패 — ${err.message}`);
      try {
        state.file = await fetchCollections();
      } catch { /* 읽기까지 실패하면 화면 유지 */ }
      render(state);
    }
  };

  try {
    state.file = await fetchCollections();
  } catch (err) {
    container.innerHTML = `<div class="page-error">컬렉션을 불러오지 못했습니다: ${escapeHtml(err.message)}</div>`;
    return { destroy() {} };
  }
  if (state.file.corrupt) {
    // 파일이 깨진 채로 목록을 그리면 사용자가 "컬렉션이 사라졌다" 고 오해하고,
    // 그 상태에서 뭔가 담으면 손상 파일을 덮어쓴다 (server 가 409 로 막지만 UI 도 알려야 한다).
    container.innerHTML = `<div class="page-error" style="white-space:pre-wrap;line-height:1.6">`
      + `${escapeHtml(state.file.message || '_collections.json 을 읽을 수 없습니다.')}

`
      + `저장은 차단된 상태입니다. 파일을 고친 뒤 새로고침하세요.</div>`;
    return { destroy() {} };
  }
  render(state);

  const onListClick = (e) => {
    const row = e.target.closest('[data-collection]');
    if (!row) return;
    state.selectedId = row.dataset.collection;
    render(state);
  };

  const onPaneClick = async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const col = state.file.collections.find((c) => c.id === state.selectedId);
    if (!col) return;

    if (act === 'add-note') {
      closePicker = openPicker(state, async (note) => {
        const { file, added } = toggleNote(state.file, col.id, note);
        state.file = file;
        setStatus(added ? '추가됨' : '이미 있어 제거됨');
        await persist();
      });
      return;
    }

    if (act === 'del-collection') {
      if (!window.confirm(`"${col.name}" 컬렉션을 삭제할까요? 노트 자체는 지워지지 않습니다.`)) return;
      state.file = { ...state.file, collections: state.file.collections.filter((c) => c.id !== col.id) };
      state.selectedId = FAVORITES_ID;
      await persist();
      return;
    }

    const row = e.target.closest('[data-idx]');
    if (!row) return;
    const idx = Number(row.dataset.idx);
    const note = col.notes[idx];
    if (!note) return;

    if (act === 'open') {
      openNote(note.vault, note.path);
      return;
    }
    if (act === 'remove') {
      const { file } = toggleNote(state.file, col.id, note);
      state.file = file;
      await persist();
      return;
    }
    if (act === 'up' || act === 'down') {
      const to = act === 'up' ? idx - 1 : idx + 1;
      if (to < 0 || to >= col.notes.length) return;
      const notes = [...col.notes];
      [notes[idx], notes[to]] = [notes[to], notes[idx]];
      state.file = {
        ...state.file,
        collections: state.file.collections.map((c) => (c.id === col.id ? { ...c, notes } : c)),
      };
      await persist();
    }
  };

  const onNew = async () => {
    const name = window.prompt('새 컬렉션 이름');
    if (!name || !name.trim()) return;
    // id 는 이름에서 슬러그화. 한글 이름이면 라틴 문자가 안 남으므로 타임스탬프로 대체한다
    // (id 는 내부 키일 뿐이고 화면에는 name 만 보인다).
    let id = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id) id = `c-${Date.now().toString(36)}`;
    if (state.file.collections.some((c) => c.id === id)) id = `${id}-${Date.now().toString(36)}`;
    state.file = {
      ...state.file,
      collections: [...state.file.collections, { id, name: name.trim(), description: '', notes: [] }],
    };
    state.selectedId = id;
    await persist();
  };

  state.listEl.addEventListener('click', onListClick);
  state.paneEl.addEventListener('click', onPaneClick);
  container.querySelector('#col-new').addEventListener('click', onNew);

  return {
    destroy() {
      state.listEl.removeEventListener('click', onListClick);
      state.paneEl.removeEventListener('click', onPaneClick);
      if (closePicker) { try { closePicker(); } catch { /* 이미 닫힘 */ } }
    },
    refresh(next) {
      // SSE data-changed — 인덱스가 갱신되면 제목 lookup 만 새로 만든다.
      state.data = next;
      state.lookup = buildNoteLookup(next.master);
      render(state);
    },
  };
}
