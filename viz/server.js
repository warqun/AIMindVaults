#!/usr/bin/env node
// AIMindVaults Visualization Server (W3, Phase 2)
// HTTP + SSE + fs.watch debounced. External deps: 0 (Node.js built-in only).
// Spec: Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/spec/20260506_시각화_데이터모델_인터페이스명세.md § 3.4

import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, sep, basename } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const VIZ_DIR = dirname(__filename);
const ROOT_DIR = resolve(VIZ_DIR, '..');
const MASTER_INDEX_PATH = join(ROOT_DIR, '.vault_data', 'master_index.json');
const TIMESERIES_PATH = join(ROOT_DIR, '.vault_data', 'timeseries.json');

const DEFAULT_PORT = parseInt(process.env.AIMV_VIZ_PORT ?? '8765', 10);
const PORT_FALLBACKS = [DEFAULT_PORT, DEFAULT_PORT + 1, DEFAULT_PORT + 2];
const DEBOUNCE_MS = 500;
const HEARTBEAT_MS = 30_000;
// idle 자동 종료 — 콘솔 숨김(VBS) 실행 시 앱 창을 닫으면 서버가 스스로 종료.
// 0 이면 비활성 (콘솔에서 Ctrl+C 로 종료하던 기존 동작).
const IDLE_SHUTDOWN_MS = parseInt(process.env.AIMV_VIZ_IDLE_MS ?? '15000', 10);
// 부팅 후 첫 연결까지 유예 — 브라우저가 안 뜨면 좀비 프로세스 방지.
const BOOT_GRACE_MS = parseInt(process.env.AIMV_VIZ_BOOT_GRACE_MS ?? '90000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const sseClients = new Set();

let idleTimer = null;
function armIdleShutdown(ms, reason) {
  if (IDLE_SHUTDOWN_MS <= 0) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log(`[server] idle shutdown (${reason})`);
    process.exit(0);
  }, ms);
}
function cancelIdleShutdown() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
}

function broadcast(event, dataObj) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(dataObj)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { /* client gone */ }
  }
}

function safeJoin(base, sub) {
  const baseAbs = resolve(base);
  const target = resolve(base, sub);
  if (target !== baseAbs && !target.startsWith(baseAbs + sep)) return null;
  return target;
}

async function serveFile(filePath, res, mimeOverride) {
  try {
    const buf = await readFile(filePath);
    const mime = mimeOverride ?? (MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(buf);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`${err.code === 'ENOENT' ? 'Not Found' : 'Read Error'}: ${err.message}`);
  }
}

function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  res.write(`event: hello\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);
  cancelIdleShutdown();
  req.on('close', () => {
    sseClients.delete(res);
    if (sseClients.size === 0) armIdleShutdown(IDLE_SHUTDOWN_MS, 'no active clients');
  });
}

async function getMasterBuilt() {
  try {
    const buf = await readFile(MASTER_INDEX_PATH, 'utf-8');
    return JSON.parse(buf).built ?? null;
  } catch { return null; }
}

// 다중 에이전트 폴더 스캔 — Claude / Codex / (확장 가능)
const RULES_SCOPE = [
  // Claude
  { dir: '.claude/rules/core',      kind: 'core',   agent: 'claude' },
  { dir: '.claude/rules/custom',    kind: 'custom', agent: 'claude' },
  { dir: '.claude/commands/core',   kind: 'core',   agent: 'claude' },
  { dir: '.claude/commands/custom', kind: 'custom', agent: 'claude' },
  { dir: '.claude/hooks',           kind: 'hook',   agent: 'claude' },
  // Codex
  { dir: '.codex/rules',            kind: 'core',   agent: 'codex'  },
  { dir: '.codex/skills',           kind: 'custom', agent: 'codex'  },
  // 향후: .cursor / .antigravity 등 추가 가능
];

async function scanRulesDir(absDir, kind, agent, repoBase) {
  const out = [];
  let entries;
  try { entries = await readdir(absDir, { withFileTypes: true, recursive: false }); }
  catch { return out; }
  for (const ent of entries) {
    if (ent.isDirectory()) continue;
    const fname = ent.name;
    if (fname.startsWith('.') || fname === 'MANIFEST.md' || fname === '__pycache__') continue;
    const ext = extname(fname).toLowerCase();
    if (ext !== '.md' && ext !== '.py') continue;
    const abs = join(absDir, fname);
    let content = '';
    try { content = await readFile(abs, 'utf-8'); }
    catch (err) { content = `(read error: ${err.code || err.message})`; }
    const rel = abs.slice(repoBase.length + 1).replace(/\\/g, '/');
    out.push({ path: rel, kind, agent, name: fname, content });
  }
  return out;
}

async function handleApiRules(res) {
  const all = [];
  for (const { dir, kind, agent } of RULES_SCOPE) {
    const target = safeJoin(ROOT_DIR, dir);
    if (!target) continue;
    const items = await scanRulesDir(target, kind, agent, ROOT_DIR);
    all.push(...items);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(all));
}

async function loadVaultPathMap() {
  try {
    const buf = await readFile(MASTER_INDEX_PATH, 'utf-8');
    const master = JSON.parse(buf);
    const map = {};
    for (const [vid, meta] of Object.entries(master.vaults || {})) map[vid] = meta.path;
    return map;
  } catch { return {}; }
}

async function handleApiNote(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const vault = (u.searchParams.get('vault') || '').trim();
  const notePath = (u.searchParams.get('path') || '').trim();
  if (!vault || !notePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request: vault & path required'); return;
  }
  if (notePath.includes('..') || vault.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden'); return;
  }
  const map = await loadVaultPathMap();
  const vaultRel = map[vault];
  if (!vaultRel) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Vault not found in master_index.json'); return;
  }
  const vaultAbs = safeJoin(ROOT_DIR, vaultRel);
  if (!vaultAbs) { res.writeHead(403); res.end('Forbidden'); return; }
  const target = safeJoin(vaultAbs, notePath);
  if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    const buf = await readFile(target, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(buf);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(err.code === 'ENOENT' ? `Not Found: ${basename(target)}` : `Read Error: ${err.message}`);
  }
}

/* ───────────── /api/activity (W1) ─────────────
 * 홈 페이지의 "최근 7일 작업량" + "최근 추가된 항목" 데이터 집계.
 * master_index.json 의 vaults 경로를 따라 각 vault_index.json 의 notes[].mtime 을 모아 집계.
 * 응답 형식:
 *   { computedAt: ISO,
 *     weekly: [{ date: 'YYYY-MM-DD', label: '월'|'화'|...|'오늘', count: N }, ... 7 items],
 *     recent: [{ kind: 'NOTE', vault_id, title, type, mtime, ageDays }, ... up to 8] }
 */
async function handleApiActivity(res) {
  try {
    const masterRaw = await readFile(MASTER_INDEX_PATH, 'utf-8');
    const master = JSON.parse(masterRaw);
    const vaultEntries = Object.entries(master.vaults || {});
    const reads = await Promise.allSettled(vaultEntries.map(async ([vid, meta]) => {
      const p = join(ROOT_DIR, meta.path, '.vault_data', 'vault_index.json');
      const buf = await readFile(p, 'utf-8');
      return [vid, JSON.parse(buf)];
    }));

    const allNotes = [];
    for (const r of reads) {
      if (r.status !== 'fulfilled') continue;
      const [vid, vidx] = r.value;
      for (const n of (vidx.notes || [])) {
        if (!n.mtime) continue;
        allNotes.push({
          vault_id: vid,
          title: n.title || basename(n.path || ''),
          path: n.path,
          type: n.type || '(untyped)',
          mtime: n.mtime,
        });
      }
    }

    const now = Date.now();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const weekDays = [];
    const weekDayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * dayMs);
      const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const label = i === 0 ? '오늘' : weekDayLabels[d.getDay()];
      weekDays.push({ date: dateStr, label, count: 0 });
    }
    const dateIndex = new Map(weekDays.map((d, i) => [d.date, i]));

    for (const n of allNotes) {
      const m = String(n.mtime).match(/^(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      const idx = dateIndex.get(m[1]);
      if (idx !== undefined) weekDays[idx].count += 1;
    }

    const recent = allNotes
      .slice()
      .sort((a, b) => (a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : 0))
      .slice(0, 8)
      .map((n) => {
        const t = Date.parse(n.mtime);
        const ageDays = Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / dayMs)) : 0;
        return { kind: 'NOTE', vault_id: n.vault_id, title: n.title, type: n.type, mtime: n.mtime, ageDays };
      });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ computedAt: new Date().toISOString(), weekly: weekDays, recent }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`activity aggregate failed: ${err.message}`);
  }
}

function pad2(n) { return String(n).padStart(2, '0'); }

/* ───────────── /api/all-notes ─────────────
 * 모든 vault_index 의 노트 mtime + created 통합 응답.
 * 응답: { computedAt, notes: [{vault_id, title, path, type, tags, mtime, created}, ...] }
 * Calendar heatmap 페이지가 client 사이드 일자별 집계용 (basis=mtime|created 클라이언트 선택).
 */
async function handleApiAllNotes(res) {
  try {
    const masterRaw = await readFile(MASTER_INDEX_PATH, 'utf-8');
    const master = JSON.parse(masterRaw);
    const vaultEntries = Object.entries(master.vaults || {});
    const reads = await Promise.allSettled(vaultEntries.map(async ([vid, meta]) => {
      const p = join(ROOT_DIR, meta.path, '.vault_data', 'vault_index.json');
      const buf = await readFile(p, 'utf-8');
      return [vid, JSON.parse(buf)];
    }));
    const notes = [];
    for (const r of reads) {
      if (r.status !== 'fulfilled') continue;
      const [vid, vidx] = r.value;
      for (const n of (vidx.notes || [])) {
        if (!n.mtime && !n.created) continue;
        notes.push({
          vault_id: vid,
          title: n.title || basename(n.path || ''),
          path: n.path,
          type: n.type || '(untyped)',
          tags: Array.isArray(n.tags) ? n.tags.slice(0, 8) : [],
          mtime: n.mtime,
          created: n.created || null,
        });
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ computedAt: new Date().toISOString(), notes }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`all-notes aggregate failed: ${err.message}`);
  }
}

/* ───────────── /api/additions?date=YYYY-MM-DD&basis=mtime|created ─────────────
 * 특정 날짜 (YYYY-MM-DD) 의 추가/편집 노트 리스트.
 * basis=mtime (기본) — 그 날짜에 수정된 노트
 * basis=created    — 그 날짜에 처음 생성된 노트
 * 응답: { date, basis, count, notes: [{...,mtime,created}, ...] }
 * date 미지정 시 해당 basis 기준 가장 최근 날짜 자동 선택.
 */
async function handleApiAdditions(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const dateQ = url.searchParams.get('date');
    const basisRaw = (url.searchParams.get('basis') || 'mtime').toLowerCase();
    const basis = basisRaw === 'created' ? 'created' : 'mtime';
    const masterRaw = await readFile(MASTER_INDEX_PATH, 'utf-8');
    const master = JSON.parse(masterRaw);
    const vaultEntries = Object.entries(master.vaults || {});
    const reads = await Promise.allSettled(vaultEntries.map(async ([vid, meta]) => {
      const p = join(ROOT_DIR, meta.path, '.vault_data', 'vault_index.json');
      const buf = await readFile(p, 'utf-8');
      return [vid, JSON.parse(buf)];
    }));
    const allNotes = [];
    for (const r of reads) {
      if (r.status !== 'fulfilled') continue;
      const [vid, vidx] = r.value;
      for (const n of (vidx.notes || [])) {
        const stamp = basis === 'created' ? (n.created || n.mtime) : n.mtime;
        if (!stamp) continue;
        const m = String(stamp).match(/^(\d{4}-\d{2}-\d{2})/);
        if (!m) continue;
        allNotes.push({
          date: m[1],
          vault_id: vid,
          title: n.title || basename(n.path || ''),
          path: n.path,
          type: n.type || '(untyped)',
          tags: Array.isArray(n.tags) ? n.tags.slice(0, 8) : [],
          mtime: n.mtime || null,
          created: n.created || null,
        });
      }
    }
    let targetDate = dateQ;
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      // default = 가장 최근 날짜 (선택된 basis 기준)
      targetDate = allNotes.reduce((a, n) => n.date > a ? n.date : a, '0000-00-00');
    }
    const sortKey = basis === 'created' ? 'created' : 'mtime';
    const filtered = allNotes
      .filter((n) => n.date === targetDate)
      .sort((a, b) => ((b[sortKey] || '') > (a[sortKey] || '') ? 1 : -1));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ date: targetDate, basis, count: filtered.length, notes: filtered }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`additions aggregate failed: ${err.message}`);
  }
}

/* ───────────── /api/timeseries (W2) ─────────────
 * `.vault_data/timeseries.json` 의 snapshots 노출.
 * spec § 2.3.1 — 부재 시 빈 구조 반환 (404 X).
 * 응답: { schemaVersion, snapshots, generated }
 */
async function handleApiTimeseries(res) {
  let payload = { schemaVersion: 1, snapshots: [], generated: null };
  try {
    const raw = await readFile(TIMESERIES_PATH, 'utf-8');
    const ts = JSON.parse(raw);
    const snapshots = Array.isArray(ts.snapshots) ? ts.snapshots : [];
    const last = snapshots.length ? snapshots[snapshots.length - 1] : null;
    payload = {
      schemaVersion: ts.schemaVersion || 1,
      snapshots,
      generated: last?.timestamp || null,
    };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[/api/timeseries] read failed: ${err.message}`);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(payload));
}

/* ───────────── /api/vault-births ─────────────
 * 각 vault 폴더의 fs.statSync().birthtime (NTFS file creation time) 반환.
 * vault.built (sync 시간) 와 다르게 vault 가 처음 만들어진 시점 = 정확한 추가 일자.
 * 응답: { vaults: [{vaultId, path, birthtime, note_count}, ...] } — birthtime 내림차순 정렬
 */
async function handleApiVaultBirths(res) {
  let payload = { vaults: [] };
  try {
    const masterRaw = await readFile(MASTER_INDEX_PATH, 'utf-8');
    const master = JSON.parse(masterRaw);
    const { statSync } = await import('node:fs');
    const list = [];
    for (const [vaultId, meta] of Object.entries(master.vaults || {})) {
      const vaultPath = meta && meta.path ? join(ROOT_DIR, meta.path) : null;
      if (!vaultPath) continue;
      try {
        const s = statSync(vaultPath);
        list.push({
          vaultId,
          path: meta.path,
          birthtime: s.birthtime.toISOString(),
          note_count: typeof meta.note_count === 'number' ? meta.note_count : 0,
        });
      } catch (err) {
        // skip unreadable vault
      }
    }
    list.sort((a, b) => b.birthtime.localeCompare(a.birthtime));
    payload = { vaults: list };
  } catch (err) {
    console.warn(`[/api/vault-births] failed: ${err.message}`);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(payload));
}

async function handleRequest(req, res) {
  // 정체성 헤더 — 런처가 다른 AIMindVaults 클론과 구별할 때 사용 (X-AIMV-Root 비교).
  res.setHeader('X-AIMV-Root', ROOT_DIR);
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (pathname === '/' || pathname === '/index.html') {
    return serveFile(join(VIZ_DIR, 'index.html'), res, 'text/html; charset=utf-8');
  }
  if (pathname === '/sse') return handleSSE(req, res);
  if (pathname === '/health') {
    const built = await getMasterBuilt();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, built }));
    return;
  }
  if (pathname === '/data/master_index.json') {
    return serveFile(MASTER_INDEX_PATH, res, 'application/json; charset=utf-8');
  }
  if (pathname === '/api/rules') return handleApiRules(res);
  if (pathname === '/api/note') return handleApiNote(req, res);
  if (pathname === '/api/activity') return handleApiActivity(res);
  if (pathname === '/api/all-notes') return handleApiAllNotes(res);
  if (pathname === '/api/additions') return handleApiAdditions(req, res);
  if (pathname === '/api/timeseries') return handleApiTimeseries(res);
  if (pathname === '/api/vault-births') return handleApiVaultBirths(res);
  if (pathname === '/router.js') return serveFile(join(VIZ_DIR, 'router.js'), res);
  if (pathname.startsWith('/static/') || pathname.startsWith('/lib/') || pathname.startsWith('/pages/') || pathname.startsWith('/components/') || pathname.startsWith('/styles/')) {
    let sub;
    if (pathname.startsWith('/static/')) sub = pathname.slice('/static/'.length);
    else sub = pathname.slice(1); // 'lib/...', 'pages/...', etc.
    const target = safeJoin(VIZ_DIR, sub);
    if (!target) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    return serveFile(target, res);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

function watchMasterIndex() {
  let timer = null;
  let lastChange = 'modify';
  try {
    const watcher = watch(MASTER_INDEX_PATH, (eventType) => {
      lastChange = eventType === 'rename' ? 'rename' : 'modify';
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        broadcast('data-changed', {
          timestamp: new Date().toISOString(),
          file: 'master_index.json',
          change: lastChange,
        });
      }, DEBOUNCE_MS);
    });
    watcher.on('error', (err) => console.error(`[server] watcher error: ${err.message}`));
    return watcher;
  } catch (err) {
    console.error(`[server] watch failed (${MASTER_INDEX_PATH}): ${err.message}`);
    return null;
  }
}

// timeseries.json 감시 — 변경 시 master_index 와 같은 SSE data-changed 이벤트 발화 (spec § 2.3.2)
function watchTimeseries() {
  let timer = null;
  let lastChange = 'modify';
  try {
    const watcher = watch(TIMESERIES_PATH, (eventType) => {
      lastChange = eventType === 'rename' ? 'rename' : 'modify';
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        broadcast('data-changed', {
          timestamp: new Date().toISOString(),
          file: 'timeseries.json',
          change: lastChange,
        });
      }, DEBOUNCE_MS);
    });
    watcher.on('error', (err) => console.error(`[server] timeseries watcher error: ${err.message}`));
    return watcher;
  } catch (err) {
    // timeseries.json 부재 시 W1 첫 실행 후 생성 — 에러 로그만 남기고 무시
    console.error(`[server] watch failed (${TIMESERIES_PATH}): ${err.message}`);
    return null;
  }
}

async function startServer() {
  for (const port of PORT_FALLBACKS) {
    try {
      const server = createServer(handleRequest);
      await new Promise((ok, fail) => {
        const onError = (err) => { server.removeListener('error', onError); fail(err); };
        server.once('error', onError);
        server.listen(port, '127.0.0.1', () => { server.removeListener('error', onError); ok(); });
      });
      return { server, port };
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      console.error(`[server] port ${port} in use, trying next...`);
    }
  }
  throw new Error(`No available port in [${PORT_FALLBACKS.join(', ')}]`);
}

async function main() {
  try {
    await stat(MASTER_INDEX_PATH);
  } catch {
    console.error(`[server] master_index.json not found at ${MASTER_INDEX_PATH}`);
    console.error('[server] Run: node {hub}/.sync/_tools/cli-node/bin/cli.js master-index-build');
  }
  const { server, port } = await startServer();
  const watcher = watchMasterIndex();
  const tsWatcher = watchTimeseries();
  const heartbeat = setInterval(() => broadcast('heartbeat', { timestamp: new Date().toISOString() }), HEARTBEAT_MS);
  const url = `http://localhost:${port}`;
  console.log(`[server] AIMindVaults Visualization listening on ${url}`);
  console.log(`[server] master_index: ${MASTER_INDEX_PATH}`);
  console.log(`[server] timeseries:   ${TIMESERIES_PATH}`);
  console.log('[server] 이 창을 닫으면 시각화가 종료됩니다.');
  if (IDLE_SHUTDOWN_MS > 0) {
    armIdleShutdown(BOOT_GRACE_MS, 'no client after boot');
    console.log(`[server] idle 자동 종료 활성 — 마지막 앱 창을 닫고 ${IDLE_SHUTDOWN_MS / 1000}s 후 종료 (부팅 유예 ${BOOT_GRACE_MS / 1000}s). AIMV_VIZ_IDLE_MS=0 으로 비활성.`);
  }
  const shutdown = () => {
    clearInterval(heartbeat);
    if (watcher) watcher.close();
    if (tsWatcher) tsWatcher.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`[server] fatal: ${err.message}`);
  process.exit(1);
});
