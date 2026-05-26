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
 *   - dedup: last snapshot.timestamp === new timestamp → overwrite last (정확히 같은 빌드 시점만)
 *     (이전 정책 = 일별 dedup → 사용자 빌드 다회 시 변화 안 보여서 빌드별 push 로 변경)
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
  if (last && last.timestamp === snapshot.timestamp) {
    // 정확히 같은 빌드 시점 (millisecond 단위) — 덮어쓰기
    data.snapshots[data.snapshots.length - 1] = snapshot;
  } else {
    // 다른 빌드 — push (일별이어도 매 빌드 누적)
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
