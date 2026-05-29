/**
 * AIMindVaults Visualization — 홈 페이지 (W1)
 * 시안: viz_design_drafts/02_compact_v3.html
 * Spec § 5.3 home — KPI 4 + 최근 활동 (mtime 기반 7일) + 시각화 4 카드 + 탐색 2 카드.
 *
 * 표준 시그니처:
 *   export async function initPage(container, data, userConfig): Promise<PageContext>
 *   PageContext = { destroy(), refresh(data) }
 */

import { isSystemVault, filterVisibleNotes, filterUserVaultsMap } from '../lib/system-vaults.js';

const KIND_COLOR = {
  VAULT: 'var(--personal)',
  CONCEPT: 'var(--lab)',
  TAG: 'var(--art)',
  NOTE: 'var(--domain)',
};

const VIEW_CARDS = [
  {
    page: 'connections',
    title: '커넥션 연결도',
    desc: () => '볼트끼리 이어진 태그',
    stat: (data) => `${countConnections(data)} connections × ${data?.master.vault_count ?? 0} vaults`,
    glyph: `<svg viewBox="0 0 200 64" preserveAspectRatio="none"><g stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"><path d="M30 8 C 100 8, 100 28, 170 28"/><path d="M30 18 C 100 18, 100 32, 170 32"/><path d="M30 28 C 100 28, 100 36, 170 36"/><path d="M30 38 C 100 38, 100 40, 170 40"/><path d="M30 48 C 100 48, 100 44, 170 44"/><path d="M30 58 C 100 58, 100 48, 170 48"/></g><g fill="currentColor"><circle cx="30" cy="8" r="2"/><circle cx="30" cy="28" r="2"/><circle cx="30" cy="48" r="2"/><circle cx="170" cy="28" r="2"/><circle cx="170" cy="40" r="2"/></g></svg>`,
  },
  {
    page: 'network',
    title: '멀티볼트 그래프',
    desc: () => '볼트끼리 연결 관계',
    stat: (data) => `${data?.master.vault_count ?? 0} nodes · 카테고리별 그룹`,
    glyph: `<svg viewBox="0 0 200 64"><g fill="currentColor" opacity="0.5"><circle cx="100" cy="32" r="6"/><circle cx="60" cy="20" r="4"/><circle cx="60" cy="44" r="4"/><circle cx="140" cy="20" r="4"/><circle cx="140" cy="44" r="4"/><circle cx="40" cy="32" r="3"/><circle cx="160" cy="32" r="3"/><circle cx="80" cy="12" r="3"/><circle cx="120" cy="52" r="3"/></g><g stroke="currentColor" stroke-width="1" opacity="0.3" fill="none"><line x1="100" y1="32" x2="60" y2="20"/><line x1="100" y1="32" x2="60" y2="44"/><line x1="100" y1="32" x2="140" y2="20"/><line x1="100" y1="32" x2="140" y2="44"/><line x1="60" y1="20" x2="40" y2="32"/><line x1="60" y1="44" x2="40" y2="32"/><line x1="140" y1="20" x2="160" y2="32"/><line x1="140" y1="44" x2="160" y2="32"/><line x1="60" y1="20" x2="80" y2="12"/><line x1="140" y1="44" x2="120" y2="52"/></g></svg>`,
  },
  {
    page: 'distribution',
    title: '노트 데이터 분석',
    desc: () => '카테고리·타입·태그 분포 종합',
    stat: (data) => `${countCategories(data)} categories · ${countTypes(data)} types`,
    glyph: `<svg viewBox="0 0 200 64"><g><circle cx="60" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="6" opacity="0.3"/><circle cx="60" cy="32" r="22" fill="none" stroke="var(--domain)" stroke-width="6" stroke-dasharray="50 200"/><circle cx="60" cy="32" r="22" fill="none" stroke="var(--project)" stroke-width="6" stroke-dasharray="35 200" stroke-dashoffset="-50"/><circle cx="60" cy="32" r="22" fill="none" stroke="var(--lab)" stroke-width="6" stroke-dasharray="25 200" stroke-dashoffset="-85"/></g><g fill="currentColor" opacity="0.5"><rect x="105" y="14" width="80" height="6" rx="1"/><rect x="105" y="26" width="60" height="6" rx="1"/><rect x="105" y="38" width="48" height="6" rx="1"/><rect x="105" y="50" width="32" height="6" rx="1"/></g></svg>`,
  },
  {
    page: 'tags',
    title: '태그 탐색기',
    desc: () => '태그로 노트 찾기·오너 구분',
    stat: (data) => `${countTags(data)} tags · owned/unowned 구분`,
    glyph: `<svg viewBox="0 0 200 64"><g fill="currentColor" opacity="0.5"><rect x="20" y="10" width="160" height="6" rx="1"/><rect x="20" y="22" width="130" height="6" rx="1"/><rect x="20" y="34" width="105" height="6" rx="1"/><rect x="20" y="46" width="80" height="6" rx="1"/></g></svg>`,
  },
];

const TOOL_CARDS = [
  {
    page: 'explorer',
    title: 'Vault 구조 탐색기',
    desc: () => '모든 볼트와 노트',
    stat: (data) => `${data?.master.vault_count ?? 0} vaults · ${data?.master.note_count ?? 0} notes · live tree`,
    glyph: `<svg viewBox="0 0 240 80"><g font-family="JetBrains Mono" font-size="9" fill="currentColor" opacity="0.55"><text x="20" y="14">▾ Vaults/</text><text x="34" y="26">▾ Domains_*/</text><text x="48" y="38">VaultA</text><text x="48" y="50">VaultB</text><text x="34" y="62">▾ Projects_*/</text><text x="48" y="74">VaultC</text></g><g fill="currentColor" opacity="0.3"><rect x="20" y="6" width="2" height="74" rx="1"/></g></svg>`,
  },
  {
    page: 'rules',
    title: 'AI 룰 · 스킬 뷰어',
    desc: () => '에이전트 규칙',
    stat: (data) => `${(data?.rulesCount ?? 0) || 'core·custom·hook'} entries · 다중 에이전트`,
    glyph: `<svg viewBox="0 0 240 80"><g fill="currentColor" opacity="0.55"><rect x="18" y="12" width="60" height="10" rx="2"/><rect x="18" y="28" width="48" height="10" rx="2"/><rect x="18" y="44" width="55" height="10" rx="2"/><rect x="18" y="60" width="40" height="10" rx="2"/></g><g font-family="JetBrains Mono" font-size="7" fill="var(--bg)" opacity="0.9"><text x="22" y="20">core/</text><text x="22" y="36">custom/</text><text x="22" y="52">slash/</text><text x="22" y="68">hooks/</text></g><g fill="currentColor" opacity="0.4"><rect x="92" y="12" width="130" height="6" rx="1"/><rect x="92" y="22" width="100" height="6" rx="1"/><rect x="92" y="36" width="120" height="6" rx="1"/><rect x="92" y="46" width="90" height="6" rx="1"/><rect x="92" y="60" width="110" height="6" rx="1"/><rect x="92" y="70" width="80" height="6" rx="1"/></g></svg>`,
  },
];

/* ───────────── Public — initPage ───────────── */
export async function initPage(container, data, userConfig) {
  const root = document.createElement('div');
  root.className = 'home-page';
  container.appendChild(root);

  let snapshots = [];
  let vaultBirths = [];
  let allNotes = [];
  let activityAbort = false;

  // 골격 1회 렌더 (KPI 는 시계열 부재 fallback 으로 회색 막대)
  renderShell(root, data, snapshots, vaultBirths, allNotes);

  // 표시 토글 (Settings homeToggles) 반영 + 실시간 변경 수신
  applyHomeToggles(root, userConfig);
  const onCfgChange = (ev) => { if (ev?.detail?.config) applyHomeToggles(root, ev.detail.config); };
  window.addEventListener('aimv:user-config-changed', onCfgChange);

  // 시계열 + vault birthtime + 노트 메타 동시 fetch — 도착 시 KPI 다시 그림
  Promise.all([fetchTimeseries(), fetchVaultBirths(), fetchAllNotes()]).then(([snaps, births, notes]) => {
    if (activityAbort) return;
    snapshots = snaps;
    vaultBirths = births;
    allNotes = notes;
    renderKpi(root, data, snapshots, vaultBirths, allNotes);
  });

  // 활동 데이터는 별도 fetch (master_index 에 mtime 없음 → /api/activity 필요)
  fetchActivity()
    .then((act) => { if (!activityAbort) renderActivity(root, act); })
    .catch((err) => {
      console.warn('[home] /api/activity 실패:', err);
      if (!activityAbort) renderActivityError(root, err);
    });

  return {
    destroy() {
      activityAbort = true;
      window.removeEventListener('aimv:user-config-changed', onCfgChange);
      while (container.firstChild) container.removeChild(container.firstChild);
    },
    async refresh(newData) {
      // 데이터 갱신 시 시계열 + birthtime + 노트 메타 재페칭
      const [snaps, births, notes] = await Promise.all([fetchTimeseries(), fetchVaultBirths(), fetchAllNotes()]);
      snapshots = snaps;
      vaultBirths = births;
      allNotes = notes;
      renderKpi(root, newData, snapshots, vaultBirths, allNotes);
      renderCards(root, newData);
      fetchActivity()
        .then((act) => renderActivity(root, act))
        .catch((err) => renderActivityError(root, err));
    },
  };
}

/* ───────────── Render — shell ───────────── */
function renderShell(root, data, snapshots, vaultBirths, allNotes) {
  root.innerHTML = `
    <section class="kpi-row" data-slot="kpi-row" data-home-section="kpiHero"></section>
    <div class="section-bar" data-home-section="recentActivity"><div class="section-title">최근 활동</div></div>
    <div class="recent-row" data-slot="recent-row" data-home-section="recentActivity">
      <div class="mini-card" data-slot="weekly">
        <div class="head"><div class="h">최근 7일 작업량</div><span class="more">view all →</span></div>
        <div class="activity-grid" data-slot="activity-grid"></div>
        <div class="act-foot"><span data-slot="act-summary">집계 중…</span><span></span></div>
      </div>
      <div class="mini-card" data-slot="recent-items">
        <div class="head"><div class="h">최근 추가된 항목</div><span class="more">view all →</span></div>
        <div class="bar-list" data-slot="bar-list"><div class="page-placeholder" style="min-height:80px;">집계 중…</div></div>
      </div>
    </div>
    <div class="section-bar" data-home-section="vizCards"><div class="section-title">시각화</div></div>
    <div class="cards" data-slot="view-cards" data-home-section="vizCards"></div>
    <div class="section-bar" data-home-section="exploreCards"><div class="section-title">탐색</div></div>
    <div class="cards tools" data-slot="tool-cards" data-home-section="exploreCards"></div>
  `;
  renderKpi(root, data, snapshots, vaultBirths, allNotes);
  renderCards(root, data);

  // 미니 카드 "view all →" → 라우터 navigate
  root.querySelector('[data-slot="weekly"] .more').addEventListener('click', () => { window.location.hash = '#calendar'; });
  root.querySelector('[data-slot="recent-items"] .more').addEventListener('click', () => { window.location.hash = '#additions'; });
}

/* ───────────── 표시 토글 (Settings homeToggles 반영) ───────────── */
function applyHomeToggles(root, userConfig) {
  const ht = (userConfig && userConfig.homeToggles) || {};
  for (const key of ['kpiHero', 'recentActivity', 'vizCards', 'exploreCards']) {
    const show = ht[key] !== false;
    root.querySelectorAll(`[data-home-section="${key}"]`).forEach((el) => {
      el.style.display = show ? '' : 'none';
    });
  }
}

/* ───────────── Render — KPI ───────────── */
const SPARK_LENGTH = 7;

function renderKpi(root, data, snapshots, vaultBirths, allNotes) {
  const slot = root.querySelector('[data-slot="kpi-row"]');
  if (!slot) return;
  if (!data) {
    slot.innerHTML = '<div class="page-error">데이터 없음 (master_index.json 로드 실패)</div>';
    return;
  }
  const m = data.master;
  const connectionCount = countConnections(data);
  const tagCountRaw = countTags(data);
  const snaps = Array.isArray(snapshots) ? snapshots : [];
  const births = Array.isArray(vaultBirths) ? vaultBirths : [];
  const notes = Array.isArray(allNotes) ? allNotes : [];
  // R142.5 — KPI 카드도 R142 client filter 적용된 노트 기반으로 derive.
  //   master raw (m.note_count, m.tag_index) 와 캘린더/additions 페이지의 visible 카운트
  //   불일치 회피. notes 가 비동기 fetch 라 초기 빈 배열일 때 master raw fallback.
  const visibleNoteCount = notes.length || m.note_count || 0;
  const visibleTagSet = new Set();
  notes.forEach((n) => (Array.isArray(n.tags) ? n.tags : []).forEach((t) => visibleTagSet.add(t)));
  const visibleTagCount = visibleTagSet.size || tagCountRaw;
  // Notes: 노트만 갱신/생성 둘 다 의미 있음 → 두 sub-link. 다른 카드는 created 단일.
  const notesCreated = computeLatestNote(notes, 'created');
  const notesMtime = computeLatestNote(notes, 'mtime');
  // R148 — Tags/Connections change 도 노트 기반 derive (디바이스 무관).
  //   timeseries snapshot 시점이 디바이스마다 다르면 같은 master 데이터인데도
  //   "+N today" 가 다르게 표시되는 문제 회피. 노트의 mtime 분포 기반으로 통일.
  // R153 — Connected 도 노트 기반 2지표 derive (신규 owner-user-tag 쌍 + 기존 connection 의 새 노트).
  const connPairs = computeConnectionsNewPairs(notes, m.connections);
  const connNotes = computeConnectionsNewNotes(notes, m.connections);
  const items = [
    { label: 'Vaults',    num: m.vault_count,    change: computeVaultsFromBirths(births), view: 'vaults' },
    { label: 'Notes',     num: visibleNoteCount, notes: { created: notesCreated, mtime: notesMtime } },
    { label: 'Connected', num: connectionCount,  conns: { pairs: connPairs, notes: connNotes } },
    { label: 'Tags',      num: visibleTagCount,  change: computeTagsRecentFromNotes(notes),          view: 'tags' },
  ];
  slot.innerHTML = items.map((it) => {
    const head = `<div class="head"><span class="label">${escapeHtml(it.label)}</span></div>
      <div class="num">${it.num.toLocaleString()}</div>`;
    // Notes 카드: 생성/갱신 두 sub-link
    if (it.notes) {
      return `<div class="kpi multi">${head}${notesSubLink(it.notes.created, 'created', '생성')}${notesSubLink(it.notes.mtime, 'mtime', '갱신')}</div>`;
    }
    // R153 — Connected 카드: 연결/노트 두 sub-link (둘 다 #connections 직진)
    if (it.conns) {
      return `<div class="kpi multi">${head}${connectionsSubLink(it.conns.pairs, '연결')}${connectionsSubLink(it.conns.notes, '노트')}</div>`;
    }
    // 단일 카드 — change.date 있으면 그 날짜의 additions 페이지로 링크 (R116).
    // basis=created: timeseries delta 는 인덱스 빌드 시 신규 노트 추가 기반이라 mtime 으로 가면 0건 빈 결과.
    const inner = `${head}${changeText(it.change)}`;
    if (it.change && it.change.date) {
      const viewQ = (it.view && it.view !== 'notes') ? `&view=${it.view}` : '';
      return `<a class="kpi linkable" href="#additions?date=${it.change.date}${viewQ}&basis=created">${inner}</a>`;
    }
    // R152 — change 없어도 view 있으면 해당 페이지 직진 (Connected 등 vault-pair 단위 카드 진입 동선).
    if (it.view) {
      return `<a class="kpi linkable" href="#${it.view}">${inner}</a>`;
    }
    return `<div class="kpi">${inner}</div>`;
  }).join('');
}

function notesSubLink(change, basis, label) {
  if (!change || !change.date || change.delta <= 0) {
    return `<div class="change"><span class="vault-label">${escapeHtml(label)}</span><span class="date">—</span></div>`;
  }
  const dateLabel = change.date.slice(5).replace('-', '/');
  return `<a class="change up sub-link" href="#additions?date=${change.date}&basis=${basis}">
    <span class="delta-num">+${change.delta}</span><span class="vault-label">${escapeHtml(label)}</span><span class="date">${dateLabel}</span>
  </a>`;
}

function connectionsSubLink(change, label) {
  if (!change || !change.date || change.delta <= 0) {
    return `<div class="change"><span class="vault-label">${escapeHtml(label)}</span><span class="date">—</span></div>`;
  }
  const dateLabel = change.date.slice(5).replace('-', '/');
  return `<a class="change up sub-link" href="#connections">
    <span class="delta-num">+${change.delta}</span><span class="vault-label">${escapeHtml(label)}</span><span class="date">${dateLabel}</span>
  </a>`;
}

/**
 * notes 배열에서 가장 최근 일자 + 그 일자의 노트 수 산출.
 * basis = 'created' | 'mtime'.
 */
export function computeLatestNote(notes, basis) {
  if (!Array.isArray(notes) || !notes.length) return { delta: 0, date: null };
  const dailyAdded = new Map();
  for (const n of notes) {
    const stamp = (basis === 'created' ? n.created : n.mtime) || '';
    const date = String(stamp).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    dailyAdded.set(date, (dailyAdded.get(date) || 0) + 1);
  }
  if (!dailyAdded.size) return { delta: 0, date: null };
  const sorted = [...dailyAdded.keys()].sort();
  const last = sorted[sorted.length - 1];
  return { delta: dailyAdded.get(last), date: last };
}

/**
 * snapshots 역순으로 탐색해 변화 (delta != 0) 가 있는 가장 최근 snapshot 찾기.
 * 일별 group: 그 날 마지막 snapshot 의 count vs 그 직전 날 마지막 snapshot 의 count.
 *
 * @param {object[]} snapshots
 * @param {string} key  vault_count / note_count / concept_count / tag_count
 * @returns {{delta: number, date: string|null}}
 */
export function computeRecentChange(snapshots, key) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return { delta: 0, date: null };
  }
  // 일별 누적 추가량 — 같은 날 여러 빌드 있으면 그 날 양수 변화 모두 합산
  // 사용자 의도 = "가장 최신 작업일 일자 + 당일 추가된 데이터 개수"
  const dailyAdded = new Map();
  for (let i = 1; i < snapshots.length; i++) {
    const cur = snapshots[i];
    const prev = snapshots[i - 1];
    if (!cur || !cur.date) continue;
    const curVal = (typeof cur[key] === 'number') ? cur[key] : 0;
    const prevVal = (prev && typeof prev[key] === 'number') ? prev[key] : 0;
    const diff = curVal - prevVal;
    if (diff > 0) {
      dailyAdded.set(cur.date, (dailyAdded.get(cur.date) || 0) + diff);
    }
  }
  const dates = [...dailyAdded.keys()].sort();
  if (!dates.length) return { delta: 0, date: null };
  const lastDate = dates[dates.length - 1];
  return { delta: dailyAdded.get(lastDate), date: lastDate };
}

/**
 * R148 — Tags KPI change 를 노트 기반 derive.
 *
 * timeseries snapshot 시점이 디바이스마다 다르면 같은 master 데이터인데도
 * `computeRecentChange(snaps, 'tag_count')` 가 디바이스마다 다른 +N 표시 (예: main +4 vs notebook +12).
 *
 * 대신 노트의 mtime 기반 — "가장 최근 mtime 일자 + 그 날 mtime 인 노트들의 unique tags Set size".
 * master.notes 만 보면 됨 → 디바이스 무관.
 *
 * @param {object[]} notes — { mtime, tags, ... }
 * @returns {{delta: number, date: string|null}}
 */
export function computeTagsRecentFromNotes(notes) {
  if (!Array.isArray(notes) || !notes.length) return { delta: 0, date: null };
  const byDate = new Map();
  for (const n of notes) {
    const date = String(n && n.mtime || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    const tags = Array.isArray(n.tags) ? n.tags : [];
    for (const t of tags) byDate.get(date).add(t);
  }
  if (!byDate.size) return { delta: 0, date: null };
  const sortedDates = [...byDate.keys()].sort();
  const last = sortedDates[sortedDates.length - 1];
  return { delta: byDate.get(last).size, date: last };
}

function normalizeConnections(connections) {
  if (!connections) return [];
  if (Array.isArray(connections)) return connections;
  if (typeof connections === 'object') {
    return Object.entries(connections).map(([tag, v]) => ({ tag, ...(v || {}) }));
  }
  return [];
}

function buildFirstSeen(notes, tagFilter) {
  const firstSeen = new Map();
  for (const n of notes) {
    const date = String(n && n.created || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const vault = n.vault_id;
    if (!vault) continue;
    const tags = Array.isArray(n.tags) ? n.tags : [];
    for (const t of tags) {
      if (tagFilter && !tagFilter.has(t)) continue;
      const key = `${vault}::${t}`;
      const prev = firstSeen.get(key);
      if (!prev || date < prev) firstSeen.set(key, date);
    }
  }
  return firstSeen;
}

/**
 * R153 — 지표 1: 신규 owner-user-tag 쌍 형성일 분포 → 가장 최근 일자 + 그 날 신규 쌍 수.
 * 디바이스 무관 — 노트 created 분포만 의존. (vault, tag) 첫 등장 일자 기반.
 * @param {object[]} notes
 * @param {object|Array} connections — master.connections
 * @returns {{delta: number, date: string|null}}
 */
export function computeConnectionsNewPairs(notes, connections) {
  if (!Array.isArray(notes) || !notes.length) return { delta: 0, date: null };
  const conns = normalizeConnections(connections);
  if (!conns.length) return { delta: 0, date: null };
  const tagFilter = new Set(conns.map((c) => c.tag).filter(Boolean));
  const firstSeen = buildFirstSeen(notes, tagFilter);
  const dailyPairs = new Map();
  for (const c of conns) {
    if (!c.owner || !c.tag || !Array.isArray(c.users)) continue;
    const ownerDate = firstSeen.get(`${c.owner}::${c.tag}`);
    if (!ownerDate) continue;
    for (const user of c.users) {
      const userDate = firstSeen.get(`${user}::${c.tag}`);
      if (!userDate) continue;
      const formed = ownerDate > userDate ? ownerDate : userDate;
      dailyPairs.set(formed, (dailyPairs.get(formed) || 0) + 1);
    }
  }
  if (!dailyPairs.size) return { delta: 0, date: null };
  const sorted = [...dailyPairs.keys()].sort();
  const last = sorted[sorted.length - 1];
  return { delta: dailyPairs.get(last), date: last };
}

/**
 * R153 — 지표 2: 기존 connection 에 추가된 노트 수.
 * owned tag (master.connections 의 tag) 를 가진 노트 중 (vault, tag) 첫 등장이 아닌 노트의
 * created 분포. 가장 최근 일자 + 그 날 추가된 노트 수. 지표 1 (첫 등장) 과 중복 회피.
 * @param {object[]} notes
 * @param {object|Array} connections
 * @returns {{delta: number, date: string|null}}
 */
export function computeConnectionsNewNotes(notes, connections) {
  if (!Array.isArray(notes) || !notes.length) return { delta: 0, date: null };
  const conns = normalizeConnections(connections);
  if (!conns.length) return { delta: 0, date: null };
  const tagToVaults = new Map();
  for (const c of conns) {
    if (!c.tag) continue;
    const set = new Set([c.owner, ...(Array.isArray(c.users) ? c.users : [])].filter(Boolean));
    tagToVaults.set(c.tag, set);
  }
  const tagFilter = new Set(tagToVaults.keys());
  const firstSeen = buildFirstSeen(notes, tagFilter);
  const dailyNotes = new Map();
  for (const n of notes) {
    const date = String(n && n.created || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const vault = n.vault_id;
    if (!vault) continue;
    const tags = Array.isArray(n.tags) ? n.tags : [];
    let counted = false;
    for (const t of tags) {
      if (!tagToVaults.has(t)) continue;
      if (!tagToVaults.get(t).has(vault)) continue;
      if (firstSeen.get(`${vault}::${t}`) === date) continue;
      counted = true;
      break;
    }
    if (counted) dailyNotes.set(date, (dailyNotes.get(date) || 0) + 1);
  }
  if (!dailyNotes.size) return { delta: 0, date: null };
  const sorted = [...dailyNotes.keys()].sort();
  const last = sorted[sorted.length - 1];
  return { delta: dailyNotes.get(last), date: last };
}

function changeText(change) {
  if (!change || !change.date || change.delta <= 0) {
    return '<div class="change"><span class="date">—</span></div>';
  }
  const dateLabel = change.date.slice(5).replace('-', '/');
  const labelSuffix = change.label ? `<span class="vault-label">${change.label}</span>` : '';
  return `<div class="change up"><span class="delta-num">+${change.delta}</span>${labelSuffix}<span class="date">${dateLabel}</span></div>`;
}


async function fetchTimeseries() {
  try {
    const r = await fetch('/api/timeseries', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    return Array.isArray(json.snapshots) ? json.snapshots : [];
  } catch (err) {
    console.warn('[home] /api/timeseries fetch failed:', err.message);
    return [];
  }
}

async function fetchVaultBirths() {
  try {
    const r = await fetch('/api/vault-births', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    const raw = Array.isArray(json.vaults) ? json.vaults : [];
    return raw.filter((v) => v && !isSystemVault(v.vaultId));
  } catch (err) {
    console.warn('[home] /api/vault-births fetch failed:', err.message);
    return [];
  }
}

async function fetchAllNotes() {
  try {
    const r = await fetch('/api/all-notes', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    const raw = Array.isArray(json) ? json : (Array.isArray(json.notes) ? json.notes : []);
    return filterVisibleNotes(raw);
  } catch (err) {
    console.warn('[home] /api/all-notes fetch failed:', err.message);
    return [];
  }
}

/**
 * Vaults 카드 fallback — vault 폴더의 fs.statSync().birthtime 활용 (정확).
 * 가장 최근 birthtime 일자 + 그 일자 안 모든 vault 카운트 + 첫 vault 명 표시.
 * 같은 날 여러 vault 추가 시 "FirstVault 외 N" 표기.
 */
function computeVaultsFromBirths(births) {
  if (!Array.isArray(births) || !births.length) return { delta: 0, date: null };
  // births 는 server.js 가 birthtime 내림차순 정렬 보장
  const latest = births[0];
  if (!latest || !latest.birthtime) return { delta: 0, date: null };
  const latestDate = latest.birthtime.slice(0, 10);
  // 같은 일자 안 vault 모두 카운트
  const sameDay = births.filter((v) => v && v.birthtime && v.birthtime.slice(0, 10) === latestDate);
  const label = sameDay.length === 1
    ? latest.vaultId
    : `${latest.vaultId} 외 ${sameDay.length - 1}`;
  return {
    delta: sameDay.length,
    date: latestDate,
    label,
  };
}

/* ───────────── Render — Cards ───────────── */
function renderCards(root, data) {
  const viewSlot = root.querySelector('[data-slot="view-cards"]');
  const toolSlot = root.querySelector('[data-slot="tool-cards"]');
  if (viewSlot) viewSlot.innerHTML = VIEW_CARDS.map((c) => cardHtml(c, data)).join('');
  if (toolSlot) toolSlot.innerHTML = TOOL_CARDS.map((c) => cardHtml(c, data)).join('');
}

function cardHtml(c, data) {
  return `
    <a class="card" href="#${c.page}" data-page="${c.page}">
      <div class="glyph">${c.glyph}</div>
      <div class="title">${escapeHtml(c.title)}</div>
      <div class="desc">${escapeHtml(typeof c.desc === 'function' ? c.desc(data) : c.desc)}</div>
      <div class="stat">${escapeHtml(typeof c.stat === 'function' ? c.stat(data) : c.stat)}</div>
    </a>
  `;
}

/* ───────────── Render — Activity ───────────── */
function renderActivity(root, act) {
  const grid = root.querySelector('[data-slot="activity-grid"]');
  const summary = root.querySelector('[data-slot="act-summary"]');
  const list = root.querySelector('[data-slot="bar-list"]');
  if (!grid || !summary || !list) return;

  const days = Array.isArray(act?.weekly) ? act.weekly : [];
  const max = days.reduce((m, d) => Math.max(m, d.count || 0), 0) || 1;
  grid.innerHTML = days.map((d) => {
    const pct = Math.round((d.count / max) * 100);
    return `<div class="act"><div class="bar2"><span style="height:${pct}%"></span></div><div class="num2">${d.count}</div><div class="day">${escapeHtml(d.label)}</div></div>`;
  }).join('') || '<div class="page-placeholder" style="min-height:60px;grid-column:1/-1;">데이터 없음</div>';

  const total = days.reduce((s, d) => s + (d.count || 0), 0);
  summary.textContent = `이번 주 합계 ${total} 노트 갱신`;

  const recent = Array.isArray(act?.recent) ? act.recent : [];
  if (recent.length === 0) {
    list.innerHTML = '<div class="page-placeholder" style="min-height:80px;">데이터 없음</div>';
  } else {
    const maxAge = recent.reduce((m, r) => Math.max(m, r.ageDays || 0), 0) || 1;
    list.innerHTML = recent.slice(0, 6).map((r) => {
      const widthPct = Math.max(40, Math.round(100 - (r.ageDays / maxAge) * 60));
      const color = KIND_COLOR[r.kind] || 'var(--accent)';
      return `<div class="bar">
        <span class="name"><span class="kind">${escapeHtml(r.kind || 'NOTE')}</span>${escapeHtml(r.title || '')}</span>
        <span class="track"><span class="fill" style="width:${widthPct}%;background:${color}"></span></span>
        <span class="num">${escapeHtml(formatDate(r.mtime))}</span>
      </div>`;
    }).join('');
  }
}

function renderActivityError(root, err) {
  const grid = root.querySelector('[data-slot="activity-grid"]');
  const list = root.querySelector('[data-slot="bar-list"]');
  const summary = root.querySelector('[data-slot="act-summary"]');
  const msg = `활동 데이터 로드 실패 — ${err?.message || err}`;
  if (grid) grid.innerHTML = `<div class="page-placeholder" style="grid-column:1/-1;min-height:60px;">${escapeHtml(msg)}</div>`;
  if (list) list.innerHTML = `<div class="page-placeholder" style="min-height:60px;">${escapeHtml(msg)}</div>`;
  if (summary) summary.textContent = '';
}

/* ───────────── /api/activity fetch ───────────── */
async function fetchActivity() {
  const res = await fetch('/api/activity', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ───────────── Helpers ───────────── */
/**
 * "Cross-Vault Connections" = owner != null AND 외부 vault 가 사용한 케이스 수.
 * 우선순위: Phase O-5 스칼라 (connection_count) → 객체 (connections) → legacy concept_map 추론.
 */
function countConnections(data) {
  const m = data?.master;
  if (!m) return 0;
  if (typeof m.connection_count === 'number') return m.connection_count;
  if (m.connections && typeof m.connections === 'object' && !Array.isArray(m.connections)) {
    return Object.keys(m.connections).length;
  }
  if (Array.isArray(m.connections)) return m.connections.length;
  // legacy fallback (Phase O-5 이전)
  const vaults = m.vaults || {};
  const cm = m.concept_map || {};
  let n = 0;
  for (const [tag, entry] of Object.entries(cm)) {
    const vlist = Array.isArray(entry?.vaults) ? entry.vaults : [];
    if (vlist.includes(tag) && vaults[tag]) n += 1;
  }
  return n;
}
function countTags(data)     { return data?.master?.tag_index   ? Object.keys(data.master.tag_index).length   : 0; }
function countCategories(data) {
  if (!data?.master?.vaults) return 0;
  const set = new Set();
  for (const meta of Object.values(data.master.vaults)) {
    set.add((meta.path || '').split('/')[1] || 'unknown');
  }
  return set.size;
}
function countTypes(data) {
  if (!Array.isArray(data?.master?.notes)) return 0;
  const set = new Set();
  for (const n of data.master.notes) set.add(n.type || '(untyped)');
  return set.size;
}
function formatDate(iso) {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : String(iso).slice(0, 10);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
