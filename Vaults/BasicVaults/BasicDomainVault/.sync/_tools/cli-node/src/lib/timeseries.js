/**
 * timeseries — KPI snapshot accumulator for master_index builds.
 *
 * spec: Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/spec/20260508_KPI_시계열_인터페이스_명세.md § 2.1, § 2.2
 *
 * File: <outDir>/timeseries.json
 * Schema:
 *   { schemaVersion: 1, snapshots: Snapshot[], max_snapshots: number }
 * Snapshot:
 *   { timestamp, date, vault_count, note_count, concept_count, connection_count, tag_count }
 *   - concept_count: legacy field (concept_map keys) — 옛 모델 호환성 유지
 *   - connection_count: Phase O-5 신규, connections (owner→users) 엣지 수
 *
 * Rules:
 *   - dedup: last snapshot.date === new snapshot.date → overwrite last (R135 — 일별 dedup 으로 복귀)
 *     (한 세션 다회 build 시 같은 날 안 42 snapshot 누적되어 sparkline 평선 되는 Gap 4 해결.
 *     기존 정책 = 빌드별 push 가 일 단위 sampling 의도와 충돌. master_index.built 가 동일
 *     ISO timestamp 라도 같은 날 (YYYY-MM-DD) 만이면 마지막 snapshot 으로 덮어씀.)
 *   - cap (FIFO): snapshots.length > max_snapshots → shift()
 *   - missing/corrupt file → seed empty structure with max_snapshots=200
 *   - schemaVersion mismatch → fallback to fresh structure
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_MAX_SNAPSHOTS = 200;
export const SCHEMA_VERSION = 1;

/**
 * Update timeseries.json with a new snapshot derived from master.
 *
 * @param {string} outDir  Directory containing master_index.json (and timeseries.json).
 * @param {object} master  Freshly built master_index object.
 * @returns {Promise<{schemaVersion:number, snapshots:object[], max_snapshots:number}>}
 */
export async function updateTimeseries(outDir, master) {
  const filePath = join(outDir, 'timeseries.json');

  let data = await readExistingOrSeed(filePath);

  // R135 Gap 4 — 기존 누적 정리: 같은 날 snapshot 중복은 마지막만 유지 (timestamp ASC 정렬 보존).
  // 새 일별 dedup 룰 적용 전 기존 데이터에도 일관 적용.
  if (data.snapshots.length > 0) {
    const seen = new Map();
    for (const s of data.snapshots) seen.set(s.date, s);
    data.snapshots = Array.from(seen.values()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }

  const timestamp = master.built;
  const date = String(timestamp).slice(0, 10);
  const snapshot = {
    timestamp,
    date,
    vault_count: master.vault_count ?? 0,
    note_count: master.note_count ?? 0,
    concept_count: master.concept_map ? Object.keys(master.concept_map).length : 0,
    connection_count: typeof master.connection_count === 'number'
      ? master.connection_count
      : (master.connections ? Object.keys(master.connections).length : 0),
    tag_count: master.tag_index ? Object.keys(master.tag_index).length : 0,
  };

  const last = data.snapshots[data.snapshots.length - 1];
  if (last && last.date === snapshot.date) {
    // 같은 날 — 마지막 snapshot 으로 덮어씀 (R135 Gap 4: 일별 dedup)
    data.snapshots[data.snapshots.length - 1] = snapshot;
  } else {
    // 다른 날 — push (일 단위 sampling 누적)
    data.snapshots.push(snapshot);
  }

  while (data.snapshots.length > data.max_snapshots) {
    data.snapshots.shift();
  }

  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

async function readExistingOrSeed(filePath) {
  if (!existsSync(filePath)) return seed();
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.snapshots)) {
      return {
        schemaVersion: SCHEMA_VERSION,
        snapshots: parsed.snapshots,
        max_snapshots: typeof parsed.max_snapshots === 'number' ? parsed.max_snapshots : DEFAULT_MAX_SNAPSHOTS,
      };
    }
    return seed();
  } catch {
    return seed();
  }
}

function seed() {
  return { schemaVersion: SCHEMA_VERSION, snapshots: [], max_snapshots: DEFAULT_MAX_SNAPSHOTS };
}
