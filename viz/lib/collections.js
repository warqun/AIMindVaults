/**
 * AIMindVaults Visualization — 컬렉션 정본 스키마 · 검증 (R193)
 *
 * 역할:
 *   "즐겨찾기 + 노트 묶음" 의 데이터 모델. server.js (파일 I/O) 와 pages/collections.js
 *   (UI) 가 공통 import 하는 순수 모듈 — fs·DOM 의존 0 이라 양쪽에서 그대로 쓴다
 *   (`custom-features.js` 와 같은 방식).
 *
 * 저장 위치 (2026-08-27 사용자 결정):
 *   AIMindVaults 루트 `_collections.json` — **git 추적**.
 *   `.vault_data/viz-prefs.json` 은 `.gitignore` 대상이라 디바이스 로컬이므로 쓸 수 없다
 *   (viz-device-sync 의 "어떤 디바이스든 같은 결과" 원칙 위배). 루트 사용자 데이터는
 *   `_STATUS.md` · `_AGENT_COMMS/` 선례를 따른다.
 *
 * 즐겨찾기 (2026-08-27 사용자 결정):
 *   별도 시스템으로 두지 않는다. **`favorites` 라는 id 의 기본 컬렉션 하나**로 통합.
 *   저장·UI·API 가 하나로 끝나고, "즐겨찾기를 일반 컬렉션으로 옮기기" 도 자연히 된다.
 *
 * 노트 참조:
 *   `{ vault, path }` — master_index 의 `vault_id` + 볼트 상대 경로. 절대경로를 저장하지
 *   않는다 (디바이스마다 루트가 다를 수 있고 배포본에서도 깨진다).
 *
 * 배포 (R197):
 *   이 파일은 **SellingVault 배포에 포함하지 않는다.** 사용자 볼트명·노트 경로가 들어가고,
 *   배포본은 사용자가 업데이트를 pull 받는 저장소라 추적하면 매 업데이트마다 충돌한다.
 *   파일이 없어도 `defaultCollectionsFile()` 이 응답되고 첫 저장 때 생성되므로 신규 사용자
 *   경험에 문제가 없다.
 *
 * 디바이스 충돌 (R196):
 *   git 추적 파일이고 POST 가 통째로 덮어쓰므로, 두 디바이스가 각각 바꾸고 커밋하면
 *   merge conflict 가 난다. 자동 병합은 하지 않는다 — 대신 **손상된 파일을 덮어쓰지 않는다.**
 *   server 가 "파일 부재" 와 "파싱 실패" 를 구분해, 파싱 실패면 GET 에 `corrupt: true` 를 싣고
 *   POST 를 409 로 거부한다. 이 구분이 없을 때는 충돌 파일이 빈 기본값으로 읽히고 다음 저장이
 *   그걸 덮어써 양쪽 데이터가 사라졌다 (2026-08-27 재현 확인).
 *
 * @custom-feature: collections
 */

export const COLLECTIONS_SCHEMA_VERSION = 1;
export const FAVORITES_ID = 'favorites';

/** id 슬러그 — 파일명·DOM 속성·URL 어디에 박혀도 안전한 문자만. */
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// 상한. 127.0.0.1 바인딩이라 외부 공격면은 없지만, UI 실수나 루프 버그로 파일이
// 무한정 커지는 것을 막는다.
export const LIMITS = Object.freeze({
  collections: 200,
  notesPerCollection: 2000,
  nameLen: 120,
  descLen: 500,
});

/** 기본 파일 — 즐겨찾기 컬렉션 하나만 있는 상태. */
export function defaultCollectionsFile() {
  return {
    schemaVersion: COLLECTIONS_SCHEMA_VERSION,
    updatedAt: null,
    collections: [
      {
        id: FAVORITES_ID,
        name: '즐겨찾기',
        description: '자주 여는 노트',
        notes: [],
      },
    ],
  };
}

function clampStr(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/** 노트 참조 1건 정규화. 유효하지 않으면 null. */
function normalizeNote(n) {
  if (!n || typeof n !== 'object') return null;
  const vault = clampStr(n.vault, 200).trim();
  // 경로 구분자를 `/` 로 통일한다 — Windows 에서 넣은 항목이 다른 디바이스에서 안 맞는 것 방지.
  const path = clampStr(n.path, 500).trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!vault || !path) return null;
  // 상위 경로 탈출 차단. 이 값은 obsidian:// URI 로도 나가므로 여기서 걸러 둔다.
  if (path.split('/').some((seg) => seg === '..')) return null;
  return { vault, path };
}

/** `{vault, path}` 동일성 키. */
// 구분자는 U+0000 — 볼트명·경로 어디에도 못 들어가는 문자라 키 충돌이 원리적으로 없다.
// **소스에 리터럴 NUL 바이트를 넣지 않는다.** 넣으면 git·grep·file 이 이 파일을 바이너리로
// 판정해 diff 가 "Bin ... bytes" 로만 보인다 (R188 에서 buildOption.js 가 같은 사고를 겪었고,
// 2026-08-27 이 파일에서 재발했다). 반드시 이스케이프로 쓴다.
const KEY_SEP = String.fromCharCode(0);

export function noteKey(n) {
  return `${n.vault}${KEY_SEP}${n.path}`;
}

/**
 * 임의 입력 → 저장 가능한 파일 객체. 깨진 항목은 조용히 버리고 살릴 수 있는 것만 남긴다.
 * 반환은 항상 유효한 구조 (즐겨찾기 컬렉션 존재 보장).
 */
export function normalizeCollectionsFile(input) {
  const base = defaultCollectionsFile();
  if (!input || typeof input !== 'object' || !Array.isArray(input.collections)) return base;

  const seenIds = new Set();
  const out = [];
  for (const c of input.collections.slice(0, LIMITS.collections)) {
    if (!c || typeof c !== 'object') continue;
    const id = clampStr(c.id, 64).trim().toLowerCase();
    if (!ID_RE.test(id) || seenIds.has(id)) continue;
    seenIds.add(id);

    const seenNotes = new Set();
    const notes = [];
    if (Array.isArray(c.notes)) {
      for (const raw of c.notes.slice(0, LIMITS.notesPerCollection)) {
        const n = normalizeNote(raw);
        if (!n) continue;
        const k = noteKey(n);
        if (seenNotes.has(k)) continue; // 같은 노트 중복 담기 방지
        seenNotes.add(k);
        notes.push(n);
      }
    }
    out.push({
      id,
      name: clampStr(c.name, LIMITS.nameLen).trim() || id,
      description: clampStr(c.description, LIMITS.descLen).trim(),
      notes,
    });
  }

  // 즐겨찾기는 항상 존재하고 항상 맨 앞. 사용자가 지웠어도 되살린다 (기본 컬렉션 계약).
  const favIdx = out.findIndex((c) => c.id === FAVORITES_ID);
  if (favIdx === -1) {
    out.unshift(base.collections[0]);
  } else if (favIdx > 0) {
    out.unshift(out.splice(favIdx, 1)[0]);
  }

  return {
    schemaVersion: COLLECTIONS_SCHEMA_VERSION,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : null,
    collections: out,
  };
}

/** 특정 노트가 담긴 컬렉션 id 목록. */
export function collectionsContaining(file, note) {
  const n = normalizeNote(note);
  if (!n) return [];
  const k = noteKey(n);
  return file.collections.filter((c) => c.notes.some((x) => noteKey(x) === k)).map((c) => c.id);
}

/**
 * 컬렉션에 노트 토글 (있으면 제거, 없으면 추가). 새 객체를 반환한다 (입력 불변).
 * 반환 `{ file, added }` — added 가 true 면 추가된 것.
 */
export function toggleNote(file, collectionId, note) {
  const n = normalizeNote(note);
  if (!n) return { file, added: false };
  const k = noteKey(n);
  let added = false;
  const collections = file.collections.map((c) => {
    if (c.id !== collectionId) return c;
    const has = c.notes.some((x) => noteKey(x) === k);
    added = !has;
    return {
      ...c,
      notes: has ? c.notes.filter((x) => noteKey(x) !== k) : [...c.notes, n],
    };
  });
  return { file: { ...file, collections }, added };
}
