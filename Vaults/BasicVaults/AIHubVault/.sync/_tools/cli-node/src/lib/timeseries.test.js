/**
 * timeseries.test.js — self-running test for updateTimeseries.
 * Run: node src/lib/timeseries.test.js
 */

import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { updateTimeseries, DEFAULT_MAX_SNAPSHOTS, SCHEMA_VERSION } from './timeseries.js';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function makeMaster({ built, vaults = 1, notes = 10, concepts = 0, tags = 5, connections = 0, connection_count }) {
  const concept_map = {};
  for (let i = 0; i < concepts; i++) concept_map[`c${i}`] = { vaults: ['a', 'b'], count: 2 };
  const tag_index = {};
  for (let i = 0; i < tags; i++) tag_index[`t${i}`] = ['x:y'];
  const connectionsObj = {};
  for (let i = 0; i < connections; i++) {
    connectionsObj[`x${i}`] = { owner: 'A', users: ['B'], ownedNotes: 1, userNotes: 1 };
  }
  return {
    built,
    vault_count: vaults,
    note_count: notes,
    concept_map,
    tag_index,
    connections: connectionsObj,
    connection_count: typeof connection_count === 'number' ? connection_count : connections,
  };
}

test('first build creates fresh structure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    const ts = await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00' }));
    assert.equal(ts.schemaVersion, SCHEMA_VERSION);
    assert.equal(ts.max_snapshots, DEFAULT_MAX_SNAPSHOTS);
    assert.equal(ts.snapshots.length, 1);
    assert.equal(ts.snapshots[0].date, '2026-05-01');
    assert.equal(ts.snapshots[0].vault_count, 1);
    assert.equal(ts.snapshots[0].note_count, 10);
    assert.equal(ts.snapshots[0].tag_count, 5);
    assert.equal(ts.snapshots[0].concept_count, 0);
    const onDisk = JSON.parse(await readFile(join(dir, 'timeseries.json'), 'utf8'));
    assert.deepEqual(onDisk, ts);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('same-timestamp rebuild dedups (overwrite, no push)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00', notes: 10 }));
    const ts2 = await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00', notes: 25 }));
    assert.equal(ts2.snapshots.length, 1, '정확히 같은 timestamp → dedup');
    assert.equal(ts2.snapshots[0].note_count, 25);
    assert.equal(ts2.snapshots[0].timestamp, '2026-05-01T10:00:00');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('same-day different-timestamp pushes (정책 변경 — 빌드별 push)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00', notes: 10 }));
    const ts2 = await updateTimeseries(dir, makeMaster({ built: '2026-05-01T18:00:00', notes: 25 }));
    assert.equal(ts2.snapshots.length, 2, '같은 날 다른 timestamp → push');
    assert.equal(ts2.snapshots[0].timestamp, '2026-05-01T10:00:00');
    assert.equal(ts2.snapshots[1].timestamp, '2026-05-01T18:00:00');
    assert.equal(ts2.snapshots[1].note_count, 25);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('different-day rebuild pushes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00', notes: 10 }));
    const ts2 = await updateTimeseries(dir, makeMaster({ built: '2026-05-02T10:00:00', notes: 11 }));
    assert.equal(ts2.snapshots.length, 2);
    assert.equal(ts2.snapshots[0].date, '2026-05-01');
    assert.equal(ts2.snapshots[1].date, '2026-05-02');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cap shifts oldest when over max_snapshots', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    // Pre-seed file with 200 snapshots and small max_snapshots to exercise shift cheaply.
    const seeded = {
      schemaVersion: SCHEMA_VERSION,
      max_snapshots: 3,
      snapshots: [
        { timestamp: '2026-04-28T10:00:00', date: '2026-04-28', vault_count: 1, note_count: 1, concept_count: 0, tag_count: 0 },
        { timestamp: '2026-04-29T10:00:00', date: '2026-04-29', vault_count: 1, note_count: 2, concept_count: 0, tag_count: 0 },
        { timestamp: '2026-04-30T10:00:00', date: '2026-04-30', vault_count: 1, note_count: 3, concept_count: 0, tag_count: 0 },
      ],
    };
    await writeFile(join(dir, 'timeseries.json'), JSON.stringify(seeded), 'utf8');
    const ts = await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00', notes: 4 }));
    assert.equal(ts.snapshots.length, 3);
    assert.equal(ts.snapshots[0].date, '2026-04-29');
    assert.equal(ts.snapshots[2].date, '2026-05-01');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('corrupt file falls back to fresh seed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ts-test-'));
  try {
    await writeFile(join(dir, 'timeseries.json'), '{ not json', 'utf8');
    const ts = await updateTimeseries(dir, makeMaster({ built: '2026-05-01T10:00:00' }));
    assert.equal(ts.snapshots.length, 1);
    assert.equal(ts.max_snapshots, DEFAULT_MAX_SNAPSHOTS);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(err.message);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exitCode = failed ? 1 : 0;
