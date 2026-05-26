/**
 * owned-tags-build.test.js — self-running tests for OWNED_TAGS.md aggregation.
 * Run: node src/commands/owned-tags-build.test.js
 */

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseOwnedTagsTable,
  classifyVaultPath,
  renderRootOwnedTagsMd,
  extractTheme,
  findOwnedTagsFiles,
  ownedTagsBuild,
} from './owned-tags-build.js';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ────────────────────────────────────────────────
// Table parser
// ────────────────────────────────────────────────

test('1. parseOwnedTagsTable: basic 5-col table', () => {
  const body = `
## 볼트 주제
Python 언어, 과학 계산.

## 소유 태그

| 태그 | 의도 | 본 vault 사용 | 외부 사용 vaults | 분류 |
|------|------|------------|----------------|------|
| \`Python\` | 언어 자체 | 150 | AI_Coding:5 | 자동 |
| \`Pandas\` | 분석 라이브러리 | 30 | – | 명시 |

## 비-소유 태그 (참고)
research 등.
`;
  const rows = parseOwnedTagsTable(body);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].tag, 'Python');
  assert.equal(rows[0].kind, '자동');
  assert.equal(rows[0].ownUsage, '150');
  assert.equal(rows[1].tag, 'Pandas');
  assert.equal(rows[1].kind, '명시');
});

test('2. parseOwnedTagsTable: stops at next H2', () => {
  const body = `
## 소유 태그

| 태그 | 분류 |
|------|------|
| \`A\` | 자동 |

## 비-소유 태그

| 태그 |
|------|
| \`SHOULD_NOT_APPEAR\` |
`;
  const rows = parseOwnedTagsTable(body);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tag, 'A');
});

test('3. parseOwnedTagsTable: skips empty / no section', () => {
  const rows = parseOwnedTagsTable('# Title\n\nNo section here.');
  assert.deepEqual(rows, []);
});

// ────────────────────────────────────────────────
// classifyVaultPath
// ────────────────────────────────────────────────

test('4. classifyVaultPath: Domains_Game → Domain', () => {
  const r = classifyVaultPath('Vaults/Domains_Game/Unity');
  assert.equal(r.category, 'Domain');
  assert.equal(r.parentFolder, 'Domains_Game');
});

test('5. classifyVaultPath: Lab_Game → Lab', () => {
  const r = classifyVaultPath('Vaults/Lab_Game/CombatToolKit');
  assert.equal(r.category, 'Lab');
});

test('6. classifyVaultPath: Projects_Infra → Project', () => {
  const r = classifyVaultPath('Vaults/Projects_Infra/Project_AIMindVaults');
  assert.equal(r.category, 'Project');
});

test('7. classifyVaultPath: Personal → Personal', () => {
  const r = classifyVaultPath('Vaults/Personal/Diary');
  assert.equal(r.category, 'Personal');
});

test('8. classifyVaultPath: Domain_Art (singular) → Domain', () => {
  const r = classifyVaultPath('Vaults/Domain_Art/ArtInsight');
  assert.equal(r.category, 'Domain');
});

test('9. classifyVaultPath: Windows backslash path', () => {
  const r = classifyVaultPath('Vaults\\Domains_Dev\\Python');
  assert.equal(r.category, 'Domain');
  assert.equal(r.parentFolder, 'Domains_Dev');
});

// ────────────────────────────────────────────────
// extractTheme
// ────────────────────────────────────────────────

test('10. extractTheme: pulls body of 볼트 주제', () => {
  const body = `
## 볼트 주제

Python 언어, 과학 계산, 데이터 분석.

## 소유 태그

| 태그 |
|------|
`;
  const t = extractTheme(body);
  assert.match(t, /Python 언어/);
});

// ────────────────────────────────────────────────
// renderRootOwnedTagsMd
// ────────────────────────────────────────────────

test('11. renderRootOwnedTagsMd: frontmatter + category grouping', () => {
  const entries = [
    {
      vault: 'Python',
      relPath: 'Vaults/Domains_Dev/Python',
      category: 'Domain',
      parentFolder: 'Domains_Dev',
      theme: 'Python 언어.',
      rows: [
        { tag: 'Python', kind: '자동', intent: 'lang', ownUsage: '', externalUsage: '' },
        { tag: 'Pandas', kind: '명시', intent: 'lib', ownUsage: '', externalUsage: '' },
      ],
    },
    {
      vault: 'JissouGame',
      relPath: 'Vaults/Projects_Game/JissouGame',
      category: 'Project',
      parentFolder: 'Projects_Game',
      theme: '',
      rows: [{ tag: 'JissouGame', kind: '자동', intent: '', ownUsage: '', externalUsage: '' }],
    },
  ];
  const md = renderRootOwnedTagsMd(entries, [], {
    totalTags: 3,
    totalVaults: 2,
    builtIso: '2026-05-13',
  });
  assert.match(md, /type: owned-tags-index/);
  assert.match(md, /total_owned_tags: 3/);
  assert.match(md, /total_vaults: 2/);
  assert.match(md, /## Domain Vaults/);
  assert.match(md, /### Python/);
  assert.match(md, /## Project Vaults/);
  assert.match(md, /### JissouGame/);
  assert.match(md, /자동.*`Python`/);
  assert.match(md, /명시.*`Pandas`/);
});

test('12. renderRootOwnedTagsMd: conflict section appears when conflicts present', () => {
  const md = renderRootOwnedTagsMd(
    [],
    [
      {
        tag: 'Shared',
        owners: [
          { vault: 'A', kind: '명시' },
          { vault: 'B', kind: '명시' },
        ],
      },
    ],
    { totalTags: 0, totalVaults: 0, builtIso: '2026-05-13' },
  );
  assert.match(md, /## 1태그 1owner 충돌/);
  assert.match(md, /Shared/);
  assert.match(md, /A \(명시\)/);
});

// ────────────────────────────────────────────────
// findOwnedTagsFiles + ownedTagsBuild end-to-end (tmp fixture)
// ────────────────────────────────────────────────

test('13. findOwnedTagsFiles: discovers nested Tags/OWNED_TAGS.md', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'owned-tags-test-'));
  try {
    const vaultsDir = join(tmp, 'Vaults');
    const vA = join(vaultsDir, 'Domains_X', 'Alpha');
    const vB = join(vaultsDir, 'Lab_Y', 'Beta');
    await mkdir(join(vA, 'Tags'), { recursive: true });
    await mkdir(join(vB, 'Tags'), { recursive: true });
    await writeFile(join(vA, 'Tags', 'OWNED_TAGS.md'), '---\ntype: owned-tags\nvault: Alpha\n---\n');
    await writeFile(join(vB, 'Tags', 'OWNED_TAGS.md'), '---\ntype: owned-tags\nvault: Beta\n---\n');
    // Decoy file in a non-vault path
    await mkdir(join(vaultsDir, 'random'), { recursive: true });
    await writeFile(join(vaultsDir, 'random', 'OWNED_TAGS.md'), 'no');

    const found = await findOwnedTagsFiles(vaultsDir);
    const paths = found.map(f => f.ownedTagsPath.replace(/\\/g, '/')).sort();
    assert.equal(found.length, 2);
    assert.ok(paths[0].endsWith('Alpha/Tags/OWNED_TAGS.md'));
    assert.ok(paths[1].endsWith('Beta/Tags/OWNED_TAGS.md'));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('14. ownedTagsBuild: end-to-end conflict detection', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'owned-tags-build-e2e-'));
  try {
    const vA = join(tmp, 'Vaults', 'Domains_X', 'Alpha');
    const vB = join(tmp, 'Vaults', 'Domains_X', 'Beta');
    await mkdir(join(vA, 'Tags'), { recursive: true });
    await mkdir(join(vB, 'Tags'), { recursive: true });
    await writeFile(
      join(vA, 'Tags', 'OWNED_TAGS.md'),
      `---
type: owned-tags
vault: Alpha
---

## 볼트 주제

Alpha theme.

## 소유 태그

| 태그 | 의도 | 본 vault 사용 | 외부 사용 vaults | 분류 |
|------|------|------------|----------------|------|
| \`Shared\` | shared | 1 | – | 명시 |
| \`Alpha\` | vault_id | 1 | – | 자동 |
`,
    );
    await writeFile(
      join(vB, 'Tags', 'OWNED_TAGS.md'),
      `---
type: owned-tags
vault: Beta
---

## 볼트 주제

Beta theme.

## 소유 태그

| 태그 | 의도 | 본 vault 사용 | 외부 사용 vaults | 분류 |
|------|------|------------|----------------|------|
| \`Shared\` | shared | 1 | – | 명시 |
`,
    );

    const output = join(tmp, 'Tags', 'OWNED_TAGS.md');
    await ownedTagsBuild({ root: tmp, apply: true, outputPath: output });
    const md = await readFile(output, 'utf8');
    assert.match(md, /total_vaults: 2/);
    assert.match(md, /## 1태그 1owner 충돌/);
    assert.match(md, /Shared/);
    assert.match(md, /Alpha/);
    assert.match(md, /Beta/);
    // ownedTagsBuild sets exitCode=2 on BAD; the test runner relies on
    // process.exit() with explicit success when no asserts failed, so we
    // clear the exit code here after asserting conflict detection worked.
    process.exitCode = 0;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────

(async () => {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL  ${name}`);
      console.error('    ' + (err.stack || err.message).split('\n').join('\n    '));
      failed++;
    }
  }
  console.log(`\n${passed}/${tests.length} passed${failed ? ', ' + failed + ' failed' : ''}`);
  if (failed) process.exit(1);
})();
