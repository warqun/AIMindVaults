import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  buildOptionA,
  buildOptionB,
  buildOptionC,
  buildOptionConnections,
  deriveConnections,
  presetColorByCategory,
  buildVaultColor,
  clampSize,
  __internal,
} from './buildOption.js';
import { loadIndex } from './loadIndex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REAL_MASTER_PATH = resolve(__dirname, '../../.vault_data/master_index.json');

const SAMPLE = {
  master: {
    built: '2026-05-06T13:58:42',
    vault_count: 3,
    note_count: 5,
    vaults: {
      Unity: { path: 'Vaults/Domains_Game/Unity', note_count: 3, domain_tags: ['Unity'], built: '2026-05-06T13:00:00' },
      AI: { path: 'Vaults/Domains_Infra/AI', note_count: 1, domain_tags: ['AI'], built: '2026-05-06T13:00:00' },
      AIMV: { path: 'Vaults/Projects_Infra/Project_AIMindVaults', note_count: 1, domain_tags: [], built: '2026-05-06T13:00:00' },
    },
    notes: [
      { vault_id: 'Unity', title: 'u1', path: 'Contents/u1.md', type: 'knowledge', tags: ['Unity', 'guide'] },
      { vault_id: 'Unity', title: 'u2', path: 'Contents/u2.md', type: 'study-note', tags: ['Unity'] },
      { vault_id: 'Unity', title: 'u3', path: 'Contents/u3.md', type: '', tags: [] },
      { vault_id: 'AI', title: 'a1', path: 'Contents/a1.md', type: 'guide', tags: ['AI', 'guide'] },
      { vault_id: 'AIMV', title: 'p1', path: 'Contents/p1.md', type: 'plan', tags: ['guide'] },
    ],
    tag_index: {
      Unity: ['Unity:Contents/u1.md', 'Unity:Contents/u2.md'],
      AI: ['AI:Contents/a1.md'],
      guide: ['Unity:Contents/u1.md', 'AI:Contents/a1.md', 'AIMV:Contents/p1.md'],
    },
    concept_map: {
      guide: { vaults: ['Unity', 'AI', 'AIMV'], count: 3 },
    },
  },
};

test('helpers — clampSize 경계값', () => {
  assert.equal(clampSize(10, 16, 80, 1), 16);
  assert.equal(clampSize(20, 16, 80, 1), 20);
  assert.equal(clampSize(100, 16, 80, 1), 80);
  assert.equal(clampSize(20, 16, 80, 0.5), 16);
  assert.equal(clampSize(20, 16, 80, 0), 20);
});

test('helpers — presetColorByCategory hex 반환 + 미등록 fallback', () => {
  assert.match(presetColorByCategory('Domains_Game'), /^#[0-9a-f]{6}$/);
  assert.match(presetColorByCategory('NoSuchCategory'), /^#[0-9a-f]{6}$/);
});

test('helpers — buildVaultColor: userConfig.colors override 우선', () => {
  const cfg = { ...__internal.DEFAULT_USER_CONFIG, colors: { Unity: '#123456' } };
  const meta = SAMPLE.master.vaults.Unity;
  assert.equal(buildVaultColor('Unity', cfg, meta), '#123456');
  assert.equal(buildVaultColor('AI', cfg, SAMPLE.master.vaults.AI), presetColorByCategory('Domains_Infra'));
});

test('buildOptionA — 정상 IndexData → graph series 구조', () => {
  const opt = buildOptionA(SAMPLE);
  assert.ok(Array.isArray(opt.series));
  const s = opt.series[0];
  assert.equal(s.type, 'graph');
  assert.equal(s.layout, 'force');
  assert.equal(s.roam, true);
  assert.equal(s.draggable, true);
  assert.deepEqual(s.force.edgeLength, [60, 180]);
  assert.equal(s.data.length, 3);
  assert.equal(s.links.length, 3);
  for (const n of s.data) {
    assert.ok(typeof n.id === 'string');
    assert.ok(typeof n.value === 'number');
    assert.ok(n.symbolSize >= 16 && n.symbolSize <= 80);
    assert.match(n.itemStyle.color, /^#[0-9a-f]{6}$/);
  }
  for (const e of s.links) {
    assert.ok(e.lineStyle.width >= 1 && e.lineStyle.width <= 12);
    assert.equal(e.lineStyle.opacity, 0.5);
  }
});

test('buildOptionA — autoScale off 시 균일 baseSize', () => {
  const opt = buildOptionA(SAMPLE, { ...__internal.DEFAULT_USER_CONFIG, autoScale: false });
  const sizes = new Set(opt.series[0].data.map((n) => n.symbolSize));
  assert.equal(sizes.size, 1, 'autoScale=false 면 모든 노드 동일 크기');
});

test('buildOptionA — userConfig 없음(undefined) 시 기본값으로 동작', () => {
  const opt = buildOptionA(SAMPLE);
  assert.ok(opt.series[0].data.length > 0);
});

test('buildOptionA — 빈 vaults → 빈 노드/링크', () => {
  const empty = { master: { built: '2026-05-06T00:00:00', vault_count: 0, note_count: 0, vaults: {}, notes: [], tag_index: {}, concept_map: {} } };
  const opt = buildOptionA(empty);
  assert.equal(opt.series[0].data.length, 0);
  assert.equal(opt.series[0].links.length, 0);
});

test('buildOptionB — Sankey 노드 좌(concept)/우(vault) + 링크', () => {
  const opt = buildOptionB(SAMPLE);
  const s = opt.series[0];
  assert.equal(s.type, 'sankey');
  assert.equal(s.nodeAlign, 'justify');
  const conceptNodes = s.data.filter((n) => n.name.startsWith('concept:'));
  const vaultNodes = s.data.filter((n) => n.name.startsWith('vault:'));
  assert.equal(conceptNodes.length, 1, 'guide 1 concept');
  assert.equal(vaultNodes.length, 3, '3 vaults span guide');
  assert.equal(s.links.length, 3);
  for (const l of s.links) {
    assert.ok(l.source.startsWith('concept:'));
    assert.ok(l.target.startsWith('vault:'));
    assert.ok(l.value > 0);
  }
  for (const n of conceptNodes) assert.equal(n.itemStyle.color, '#aaaaaa');
});

test('buildOptionB — topNConcepts 절단', () => {
  const opt = buildOptionB(SAMPLE, { ...__internal.DEFAULT_USER_CONFIG, topNConcepts: 0 });
  assert.equal(opt.series[0].data.length, 0);
  assert.equal(opt.series[0].links.length, 0);
});

test('buildOptionC — 3종 옵션 [categoryPie, typePie, tagBar]', () => {
  const opts = buildOptionC(SAMPLE);
  assert.equal(opts.length, 3);
  const [cat, type, tag] = opts;
  assert.equal(cat.series[0].type, 'pie');
  assert.equal(type.series[0].type, 'pie');
  assert.equal(tag.series[0].type, 'bar');
  const catNames = cat.series[0].data.map((d) => d.name).sort();
  assert.deepEqual(catNames, ['Domains_Game', 'Domains_Infra', 'Projects_Infra']);
  const typeNames = type.series[0].data.map((d) => d.name);
  assert.ok(typeNames.includes('(untyped)'));
  assert.ok(typeNames.includes('knowledge'));
  assert.equal(tag.yAxis.type, 'category');
  assert.equal(tag.xAxis.type, 'value');
});

test('buildOptionC — topNTags userConfig 반영', () => {
  const opts = buildOptionC(SAMPLE, { ...__internal.DEFAULT_USER_CONFIG, topNTags: 1 });
  assert.equal(opts[2].yAxis.data.length, 1);
});

test('buildOptionC — 빈 vaults → 빈 데이터', () => {
  const empty = { master: { built: '2026-05-06T00:00:00', vault_count: 0, note_count: 0, vaults: {}, notes: [], tag_index: {}, concept_map: {} } };
  const opts = buildOptionC(empty);
  assert.equal(opts[0].series[0].data.length, 0);
  assert.equal(opts[1].series[0].data.length, 0);
  assert.equal(opts[2].yAxis.data.length, 0);
});

test('실 데이터 — master_index.json 32 vault 통과', async () => {
  const data = await loadIndex({ masterPath: REAL_MASTER_PATH });
  const a = buildOptionA(data);
  const b = buildOptionB(data);
  const c = buildOptionC(data);
  assert.equal(a.series[0].type, 'graph');
  assert.ok(a.series[0].data.length >= 30, 'A: 노드 30+');
  assert.equal(b.series[0].type, 'sankey');
  assert.ok(b.series[0].data.length > 0);
  assert.equal(c.length, 3);
  assert.ok(c[2].yAxis.data.length > 0);
});

test('deriveConnections — concept_map 에서 owner 추론 (vault_id 정확 일치)', () => {
  const conns = deriveConnections(SAMPLE.master);
  // SAMPLE 의 concept_map.guide.vaults = ['Unity', 'AI', 'AIMV'], tag='guide' → 어떤 vault_id 와도 불일치 → owner null
  assert.equal(conns.length, 1);
  assert.equal(conns[0].tag, 'guide');
  assert.equal(conns[0].owner, null);
});

test('deriveConnections — vault_id 정확 일치 시 owner 추론', () => {
  const sample = {
    master: {
      vaults: { Unity: { path: 'Vaults/Domains_Game/Unity', note_count: 2 }, AI: { path: 'Vaults/Domains_Infra/AI', note_count: 1 } },
      concept_map: { Unity: { vaults: ['Unity', 'AI'], count: 3 } },
      tag_index: { Unity: ['Unity:Contents/u1.md', 'Unity:Contents/u2.md', 'AI:Contents/a1.md'] },
    },
  };
  const conns = deriveConnections(sample.master);
  assert.equal(conns[0].owner, 'Unity');
  assert.deepEqual(conns[0].users, ['AI']);
  assert.equal(conns[0].ownedNotes, 2);
  assert.deepEqual(conns[0].userNotes, [{ vault: 'AI', count: 1 }]);
});

test('deriveConnections — master.connections 가 Array 면 그대로 반환', () => {
  const pre = [{ tag: 't', owner: 'O', users: [], ownedNotes: 0, userNotes: [], totalCount: 0 }];
  const conns = deriveConnections({ connections: pre });
  assert.equal(conns, pre);
});

test('buildOptionConnections — Sankey 3-단 (owner → tag → user)', () => {
  const sample = {
    master: {
      vaults: { Unity: { path: 'Vaults/Domains_Game/Unity', note_count: 2 }, AI: { path: 'Vaults/Domains_Infra/AI', note_count: 1 } },
      concept_map: { Unity: { vaults: ['Unity', 'AI'], count: 3 } },
      tag_index: { Unity: ['Unity:Contents/u1.md', 'Unity:Contents/u2.md', 'AI:Contents/a1.md'] },
    },
  };
  const opt = buildOptionConnections(sample);
  const s = opt.series[0];
  assert.equal(s.type, 'sankey');
  const names = s.data.map((n) => n.name).sort();
  assert.deepEqual(names, ['owner:Unity', 'tag:Unity', 'user:AI']);
  assert.equal(s.links.length, 2);
  assert.equal(s.links[0].source, 'owner:Unity');
  assert.equal(s.links[0].target, 'tag:Unity');
  assert.equal(s.links[1].source, 'tag:Unity');
  assert.equal(s.links[1].target, 'user:AI');
});

test('buildOptionConnections — owner null entries 제외', () => {
  const opt = buildOptionConnections(SAMPLE);
  const s = opt.series[0];
  assert.equal(s.data.length, 0);
  assert.equal(s.links.length, 0);
});
