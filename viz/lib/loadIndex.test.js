import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadIndex, validateIndex } from './loadIndex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REAL_MASTER_PATH = resolve(__dirname, '../../.vault_data/master_index.json');

const SAMPLE_MASTER = {
  built: '2026-05-06T13:58:42',
  vault_count: 2,
  note_count: 3,
  vaults: {
    A: { path: 'Vaults/Cat/A', note_count: 2, domain_tags: ['t1'], built: '2026-05-06T13:00:00' },
    B: { path: 'Vaults/Cat/B', note_count: 1, domain_tags: [], built: '2026-05-06T13:00:00' }
  },
  notes: [
    { vault_id: 'A', title: 'a1', path: 'Contents/a1.md', type: 'note', tags: [] },
    { vault_id: 'A', title: 'a2', path: 'Contents/a2.md', type: 'note', tags: [] },
    { vault_id: 'B', title: 'b1', path: 'Contents/b1.md', type: 'note', tags: [] }
  ],
  tag_index: { t1: ['A:Contents/a1.md'] },
  concept_map: {}
};

const SAMPLE_VAULT = {
  vault: 'A',
  built: '2026-05-06T13:00:00',
  notes: [],
  tag_index: {},
  link_graph: {}
};

async function setupTempDir(files) {
  const dir = await mkdtemp(join(tmpdir(), 'loadIndex-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8');
  }
  return dir;
}

test('정상 — masterPath 만 로딩', async () => {
  const dir = await setupTempDir({ 'master.json': JSON.stringify(SAMPLE_MASTER) });
  try {
    const data = await loadIndex({ masterPath: join(dir, 'master.json') });
    assert.equal(data.master.vault_count, 2);
    assert.equal(data.master.note_count, 3);
    assert.equal(data.vaults, undefined);
    const report = await validateIndex(data);
    assert.equal(report.ok, true, `errors: ${report.errors.join(', ')}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('정상 — masterPath + vaultPaths 동시 로딩', async () => {
  const dir = await setupTempDir({
    'master.json': JSON.stringify(SAMPLE_MASTER),
    'A.json': JSON.stringify(SAMPLE_VAULT)
  });
  try {
    const data = await loadIndex({
      masterPath: join(dir, 'master.json'),
      vaultPaths: { A: join(dir, 'A.json') }
    });
    assert.equal(data.vaults?.A?.vault, 'A');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('master 부재 — ENOENT 시 명확한 에러', async () => {
  await assert.rejects(
    () => loadIndex({ masterPath: '/nonexistent/master.json' }),
    /파일 부재/
  );
});

test('vault 일부 부재 — 일부 성공 시 부분 결과 반환', async () => {
  const dir = await setupTempDir({
    'master.json': JSON.stringify(SAMPLE_MASTER),
    'A.json': JSON.stringify(SAMPLE_VAULT)
  });
  try {
    const data = await loadIndex({
      masterPath: join(dir, 'master.json'),
      vaultPaths: {
        A: join(dir, 'A.json'),
        B: join(dir, 'B.json')
      }
    });
    assert.ok(data.vaults?.A);
    assert.equal(data.vaults?.B, undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('vault 전부 부재 — 전부 실패 시 throw', async () => {
  const dir = await setupTempDir({ 'master.json': JSON.stringify(SAMPLE_MASTER) });
  try {
    await assert.rejects(
      () => loadIndex({
        masterPath: join(dir, 'master.json'),
        vaultPaths: { A: join(dir, 'X.json'), B: join(dir, 'Y.json') }
      }),
      /모든 vault 인덱스 로딩 실패/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JSON 파싱 실패 — 명확한 에러 메시지', async () => {
  const dir = await setupTempDir({ 'master.json': '{not valid json' });
  try {
    await assert.rejects(
      () => loadIndex({ masterPath: join(dir, 'master.json') }),
      /JSON 파싱 실패/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('opts 누락 — 명확한 에러', async () => {
  await assert.rejects(() => loadIndex({}), /masterUrl 또는 masterPath 중 하나 필수/);
});

test('validateIndex — vault_count 불일치 감지', async () => {
  const broken = {
    master: {
      ...SAMPLE_MASTER,
      vault_count: 99
    }
  };
  const report = await validateIndex(broken);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('|'), /vault_count 불일치/);
});

test('validateIndex — built ISO 형식 위반 감지', async () => {
  const broken = { master: { ...SAMPLE_MASTER, built: 'not-a-date' } };
  const report = await validateIndex(broken);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('|'), /built ISO 형식/);
});

test('validateIndex — 실제 master_index.json 통과', async () => {
  const data = await loadIndex({ masterPath: REAL_MASTER_PATH });
  const report = await validateIndex(data);
  assert.equal(report.ok, true, `errors: ${report.errors.join(', ')}`);
});
