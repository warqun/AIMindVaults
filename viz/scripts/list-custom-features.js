#!/usr/bin/env node
/**
 * AIMindVaults Visualization — Custom Features 추적 CLI (R164)
 *
 * 역할:
 *   `viz/lib/custom-features.js` registry 의 모든 항목 출력 + viz/ 코드 안의
 *   `@custom-feature: <id>` 주석 마커 grep cross-check. 마커-registry 불일치 리포트.
 *
 * 사용:
 *   node viz/scripts/list-custom-features.js              # 사람 읽기용 (TTY 컬러)
 *   node viz/scripts/list-custom-features.js --json       # 머신 읽기용 (JSON)
 *
 * exit code:
 *   0 — 정상 (불일치 없음, 또는 --json 모드)
 *   1 — orphan marker 발견 (registry 에 없는 id 가 코드 안에서 마커로 등장)
 *
 * 마커 규칙:
 *   주석 줄 안에 `@custom-feature: <id>` 또는 `@custom-feature <id>` 패턴.
 *   id 는 registry 의 CUSTOM_FEATURES[*].id 와 정확히 일치해야 함.
 *
 * 의존성:
 *   Node.js 18+ built-in (fs/promises, path, url) 만. 외부 패키지 0.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, relative } from 'node:path';
import { CUSTOM_FEATURES } from '../lib/custom-features.js';

const __filename = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = dirname(__filename);
const VIZ_DIR = dirname(SCRIPTS_DIR);
const SCAN_EXTS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.ps1']);
const IGNORE_DIRS = new Set(['node_modules', '_build', 'scripts']);

const isJsonMode = process.argv.includes('--json');

// ANSI 컬러 — TTY 이고 JSON 모드 아닐 때만.
const color = (code, s) => (process.stdout.isTTY && !isJsonMode) ? `\x1b[${code}m${s}\x1b[0m` : s;
const c = {
  bold: (s) => color('1', s),
  dim: (s) => color('2', s),
  red: (s) => color('31', s),
  green: (s) => color('32', s),
  yellow: (s) => color('33', s),
  cyan: (s) => color('36', s),
};

const MARKER_RE = /@custom-feature[:\s]+([A-Za-z_][A-Za-z0-9_-]*)/g;

async function walk(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      await walk(join(dir, ent.name), out);
    } else if (SCAN_EXTS.has(extname(ent.name).toLowerCase())) {
      out.push(join(dir, ent.name));
    }
  }
  return out;
}

async function scanMarkers() {
  const files = await walk(VIZ_DIR);
  const hits = new Map(); // id → [{ file, line, snippet }]
  for (const f of files) {
    let txt;
    try { txt = await readFile(f, 'utf-8'); } catch { continue; }
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      MARKER_RE.lastIndex = 0;
      let m;
      while ((m = MARKER_RE.exec(line)) !== null) {
        const id = m[1];
        const rec = { file: relative(VIZ_DIR, f).replace(/\\/g, '/'), line: i + 1, snippet: line.trim().slice(0, 120) };
        if (!hits.has(id)) hits.set(id, []);
        hits.get(id).push(rec);
      }
    }
  }
  return hits;
}

function buildCrossCheck(markerHits) {
  const registryIds = new Set(CUSTOM_FEATURES.map((f) => f.id));
  const markerIds = new Set(markerHits.keys());
  const orphans = [...markerIds].filter((id) => !registryIds.has(id));    // 마커는 있는데 registry 에 없음 (위험 — id 오타 또는 삭제 잔재)
  const unmarked = [...registryIds].filter((id) => !markerIds.has(id));    // registry 엔 있는데 코드 안에 마커 없음 (참고 — 정본 외 위치에 안 박힘)
  return { orphans, unmarked };
}

function printHuman(markerHits, crossCheck) {
  console.log(c.bold('AIMindVaults Visualization — Custom Features Registry'));
  console.log(c.dim(`registry: viz/lib/custom-features.js · ${CUSTOM_FEATURES.length} feature(s)`));
  console.log('');
  for (const f of CUSTOM_FEATURES) {
    const surfaces = f.surfaces.map((s) => s.type + (s.section ? `:${s.section}` : '')).join(', ');
    const def = (f.category === 'toggle' || f.category === 'composite') ? `default=${f.defaultValue}` : '';
    console.log(`  ${c.cyan('●')} ${c.bold(f.id)} ${c.dim('[' + f.category + ']')} ${c.dim('(' + f.addedIn + ')')}`);
    console.log(`    label    : ${f.label}`);
    console.log(`    surfaces : ${surfaces}`);
    if (def) console.log(`    ${def}`);
    const hits = markerHits.get(f.id) || [];
    if (hits.length === 0) {
      console.log(`    markers  : ${c.dim('(없음 — registry 외 코드 위치에 박힌 흔적 없음)')}`);
    } else {
      console.log(`    markers  : ${hits.length} hit(s)`);
      for (const h of hits) {
        console.log(`      ${c.dim('-')} ${h.file}:${h.line}  ${c.dim(h.snippet)}`);
      }
    }
    console.log('');
  }
  if (crossCheck.orphans.length > 0) {
    console.log(c.red(c.bold(`⚠ orphan markers (${crossCheck.orphans.length}) — registry 에 없는 id 가 코드 안에 마커로 등장:`)));
    for (const id of crossCheck.orphans) {
      const hits = markerHits.get(id) || [];
      console.log(`  ${c.red('✗')} ${id} (${hits.length} hit)`);
      for (const h of hits) console.log(`      ${c.dim('-')} ${h.file}:${h.line}`);
    }
    console.log('');
  } else {
    console.log(c.green('✓ orphan markers: 0'));
  }
  if (crossCheck.unmarked.length > 0) {
    console.log(c.yellow(`ℹ unmarked registry ids (${crossCheck.unmarked.length}) — registry 에 있으나 코드 안 마커 없음 (정본만 존재 = 정상일 수 있음):`));
    for (const id of crossCheck.unmarked) console.log(`  ${c.yellow('·')} ${id}`);
  } else {
    console.log(c.green('✓ unmarked registry ids: 0'));
  }
}

function printJson(markerHits, crossCheck) {
  const payload = {
    registry: CUSTOM_FEATURES.map((f) => ({
      id: f.id,
      category: f.category,
      addedIn: f.addedIn,
      label: f.label,
      defaultValue: f.defaultValue,
      surfaces: f.surfaces.map((s) => ({ type: s.type, section: s.section || null, hasAction: !!s.action })),
      markers: (markerHits.get(f.id) || []),
    })),
    orphans: crossCheck.orphans.map((id) => ({ id, markers: markerHits.get(id) || [] })),
    unmarked: crossCheck.unmarked,
    counts: {
      features: CUSTOM_FEATURES.length,
      orphanIds: crossCheck.orphans.length,
      unmarkedIds: crossCheck.unmarked.length,
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

(async () => {
  const markerHits = await scanMarkers();
  const crossCheck = buildCrossCheck(markerHits);
  if (isJsonMode) printJson(markerHits, crossCheck);
  else printHuman(markerHits, crossCheck);
  process.exit(crossCheck.orphans.length > 0 ? 1 : 0);
})().catch((err) => {
  console.error(`[list-custom-features] fatal: ${err.message}`);
  process.exit(2);
});
