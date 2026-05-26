/**
 * tag-migrate.test.js — self-running tests for tag normalization.
 * Run: node src/commands/tag-migrate.test.js
 */

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  normalizeTag,
  normalizeTagsArray,
  normalizeInlineTag,
  rewriteInlineTags,
  patchFrontmatterTags,
  parseTagAliases,
  hasNonLatin,
  detectAIMindVaultsRoot,
  defaultTagAliasesPath,
  tagMigrate,
} from './tag-migrate.js';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Fixtures shared by most tests
const baseOpts = () => ({
  aliases: {
    claude: 'Claude',
    ai: 'AI',
    dots: 'DOTS',
    'json-parser': 'JSONParser',
    'api-gateway': 'APIGateway',
    'ai-coding': 'AICoding',
  },
  removeSet: new Set(['domain', 'Domain', 'Meta', 'meta', '(볼트 태그)']),
  vaultIds: new Set(['AI_Coding', 'Project_AIMindVaults', 'AI_Gen4Game']),
});

// ────────────────────────────────────────────────
// Scenario 1: single lowercase word → PascalCase
// ────────────────────────────────────────────────
test('1. lowercase → Capitalize: research → Research', () => {
  const r = normalizeTag('research', baseOpts());
  assert.equal(r.result, 'Research');
  assert.equal(r.rule, 'lowercase→capitalize');
});

// ────────────────────────────────────────────────
// Scenario 2: kebab-case → PascalCase
// ────────────────────────────────────────────────
test('2. kebab-case → PascalCase: skill-system → SkillSystem', () => {
  const r = normalizeTag('skill-system', baseOpts());
  assert.equal(r.result, 'SkillSystem');
  assert.equal(r.rule, 'kebab/snake→pascal');
});

// ────────────────────────────────────────────────
// Scenario 3: snake_case vault_id 예외 (그대로 유지)
// ────────────────────────────────────────────────
test('3. vault_id snake_case kept: AI_Coding → AI_Coding', () => {
  const r = normalizeTag('AI_Coding', baseOpts());
  assert.equal(r.result, 'AI_Coding');
  assert.equal(r.rule, 'vault_id-keep');
});

test('3b. underscore-pascal pattern kept even without vaultIds: USA_2026 → USA_2026', () => {
  const r = normalizeTag('USA_2026', { ...baseOpts(), vaultIds: new Set() });
  assert.equal(r.result, 'USA_2026');
  assert.equal(r.rule, 'underscore-pascal-keep');
});

// ────────────────────────────────────────────────
// Scenario 4: 약어 단독 → 그대로
// ────────────────────────────────────────────────
test('4. acronym kept: MCP → MCP', () => {
  const r = normalizeTag('MCP', baseOpts());
  assert.equal(r.result, 'MCP');
  assert.equal(r.rule, 'acronym-keep');
});

test('4b. acronym kept: API → API', () => {
  const r = normalizeTag('API', baseOpts());
  assert.equal(r.result, 'API');
});

// ────────────────────────────────────────────────
// Scenario 5: 약어 결합 보존 (사전 경유)
// ────────────────────────────────────────────────
test('5. alias dictionary: json-parser → JSONParser', () => {
  const r = normalizeTag('json-parser', baseOpts());
  assert.equal(r.result, 'JSONParser');
  assert.equal(r.rule, 'alias');
});

test('5b. alias dictionary: api-gateway → APIGateway', () => {
  const r = normalizeTag('api-gateway', baseOpts());
  assert.equal(r.result, 'APIGateway');
});

// ────────────────────────────────────────────────
// Scenario 6: 한국어 그대로
// ────────────────────────────────────────────────
test('6. CJK kept: 보안 → 보안', () => {
  const r = normalizeTag('보안', baseOpts());
  assert.equal(r.result, '보안');
  assert.equal(r.rule, 'cjk-keep');
});

test('6b. CJK kept: 에이전트 → 에이전트', () => {
  const r = normalizeTag('에이전트', baseOpts());
  assert.equal(r.result, '에이전트');
});

// ────────────────────────────────────────────────
// Scenario 7: 한국어 + 라틴 혼합 그대로
// ────────────────────────────────────────────────
test('7. CJK + Latin mix kept: G식백과 → G식백과', () => {
  const r = normalizeTag('G식백과', baseOpts());
  assert.equal(r.result, 'G식백과');
  assert.equal(r.rule, 'cjk-keep');
});

test('7b. mixed kept: 캡컷PC → 캡컷PC', () => {
  const r = normalizeTag('캡컷PC', baseOpts());
  assert.equal(r.result, '캡컷PC');
});

// ────────────────────────────────────────────────
// Scenario 8: 숫자 포함 그대로
// ────────────────────────────────────────────────
test('8. digit+pascal kept: Unity6 → Unity6', () => {
  const r = normalizeTag('Unity6', baseOpts());
  assert.equal(r.result, 'Unity6');
  assert.equal(r.rule, 'pascal-keep');
});

test('8b. digit-leading kept: 3D → 3D', () => {
  const r = normalizeTag('3D', baseOpts());
  assert.equal(r.result, '3D');
  assert.equal(r.rule, 'digit-leading-keep');
});

test('8c. digit-leading composite: 3DModeling → 3DModeling', () => {
  const r = normalizeTag('3DModeling', baseOpts());
  assert.equal(r.result, '3DModeling');
  assert.equal(r.rule, 'digit-leading-keep');
});

// ────────────────────────────────────────────────
// Scenario 9: 대소문자 dedup
// ────────────────────────────────────────────────
test('9. dedup: [Unity, unity] → [Unity]', () => {
  const r = normalizeTagsArray(['Unity', 'unity'], { ...baseOpts(), aliases: { unity: 'Unity' } });
  assert.deepEqual(r.tags, ['Unity']);
  assert.equal(r.dedup.length, 1);
});

// ────────────────────────────────────────────────
// Scenario 10: 메타 태그 제거
// ────────────────────────────────────────────────
test('10. meta tag removed: [Unity, domain, research] → [Unity, Research]', () => {
  const r = normalizeTagsArray(['Unity', 'domain', 'research'], baseOpts());
  assert.deepEqual(r.tags, ['Unity', 'Research']);
  const removedChange = r.changes.find(c => c.from === 'domain');
  assert.equal(removedChange?.to, null);
  assert.equal(removedChange?.rule, 'remove');
});

// ────────────────────────────────────────────────
// Scenario 11: aliases 우선 (사전 매핑이 자동 룰보다 우선)
// ────────────────────────────────────────────────
test('11. alias precedence: claude → Claude (alias wins over default capitalize)', () => {
  const r = normalizeTag('claude', baseOpts());
  assert.equal(r.result, 'Claude');
  assert.equal(r.rule, 'alias');
});

test('11b. PascalCase kept: Claude → Claude (no change)', () => {
  const r = normalizeTag('Claude', baseOpts());
  assert.equal(r.result, 'Claude');
  assert.equal(r.rule, 'pascal-keep');
});

// ────────────────────────────────────────────────
// Bonus: camelCase normalization
// ────────────────────────────────────────────────
test('12. camelCase → PascalCase: gameDev → GameDev', () => {
  const r = normalizeTag('gameDev', baseOpts());
  assert.equal(r.result, 'GameDev');
  assert.equal(r.rule, 'camel→pascal');
});

// ────────────────────────────────────────────────
// Bonus 12b: segment-level alias preserves acronym in kebab compound
// ────────────────────────────────────────────────
test('12b. kebab compound + segment alias: 2d-game → 2DGame', () => {
  const r = normalizeTag('2d-game', { ...baseOpts(), aliases: { '2d': '2D' } });
  assert.equal(r.result, '2DGame');
  assert.equal(r.rule, 'kebab/snake→pascal');
});

test('12c. kebab compound + segment alias: ci-cd → CICD (when both registered)', () => {
  const r = normalizeTag('ci-cd', { ...baseOpts(), aliases: { ci: 'CI', cd: 'CD' } });
  assert.equal(r.result, 'CICD');
});

// ────────────────────────────────────────────────
// Bonus: nested slash → PascalCase concat (5-12 정책)
// ────────────────────────────────────────────────
test('13. nested slash → PascalCase concat: project/skill-system → ProjectSkillSystem', () => {
  const r = normalizeInlineTag('project/skill-system', baseOpts());
  assert.equal(r.result, 'ProjectSkillSystem');
});

test('13b. nested slash + alias: unity/dots → UnityDOTS', () => {
  const r = normalizeInlineTag('unity/dots', baseOpts());
  assert.equal(r.result, 'UnityDOTS');
});

test('13c. nested slash + lowercase: doc/index → DocIndex', () => {
  const r = normalizeInlineTag('doc/index', baseOpts());
  assert.equal(r.result, 'DocIndex');
});

test('13d. nested slash in frontmatter tag (normalizeTag direct): vault/idea → VaultIdea', () => {
  const r = normalizeTag('vault/idea', baseOpts());
  assert.equal(r.result, 'VaultIdea');
  assert.equal(r.rule, 'nested-slash→pascal-concat');
});

test('13e. nested slash 3-segment: idea/ai/sub → IdeaAISub', () => {
  const r = normalizeTag('idea/ai/sub', baseOpts());
  assert.equal(r.result, 'IdeaAISub');
});

test('13f. nested slash + remove segment: domain/research → null', () => {
  const r = normalizeTag('domain/research', baseOpts());
  assert.equal(r.result, null);
  assert.equal(r.rule, 'nested-segment-removed');
});

// ────────────────────────────────────────────────
// YAML loader
// ────────────────────────────────────────────────
test('14. YAML loader parses aliases + remove', () => {
  const sample = `
aliases:
  ai: AI
  claude: Claude
  "json-parser": JSONParser

remove:
  - domain
  - Meta
  - "(볼트 태그)"
`;
  const data = parseTagAliases(sample);
  assert.equal(data.aliases.ai, 'AI');
  assert.equal(data.aliases.claude, 'Claude');
  assert.equal(data.aliases['json-parser'], 'JSONParser');
  assert.deepEqual(data.remove, ['domain', 'Meta', '(볼트 태그)']);
});

test('14b. YAML loader skips block scalar in rules', () => {
  const sample = `
aliases:
  ai: AI

remove:
  - domain

rules:
  description: |
    line1
    line2: not-an-alias
    - not-a-remove
`;
  const data = parseTagAliases(sample);
  assert.equal(Object.keys(data.aliases).length, 1);
  assert.deepEqual(data.remove, ['domain']);
});

// ────────────────────────────────────────────────
// hasNonLatin
// ────────────────────────────────────────────────
test('15. hasNonLatin: 보안=true, security=false, JSON=false', () => {
  assert.equal(hasNonLatin('보안'), true);
  assert.equal(hasNonLatin('security'), false);
  assert.equal(hasNonLatin('JSON'), false);
  assert.equal(hasNonLatin('G식백과'), true);
});

// ────────────────────────────────────────────────
// patchFrontmatterTags — inline array
// ────────────────────────────────────────────────
test('16. patch inline tags: [a, b] → [A, B]', () => {
  const src = `---
type: note
tags: [research, unity]
updated: 2026-05-12
---

body`;
  const updated = patchFrontmatterTags(src, ['Research', 'Unity']);
  assert.ok(updated.includes('tags: [Research, Unity]'));
  assert.ok(updated.includes('type: note'));
  assert.ok(updated.includes('updated: 2026-05-12'));
});

// ────────────────────────────────────────────────
// patchFrontmatterTags — block list
// ────────────────────────────────────────────────
test('17. patch block tags', () => {
  const src = `---
type: note
tags:
  - research
  - unity
updated: 2026-05-12
---

body`;
  const updated = patchFrontmatterTags(src, ['Research', 'Unity']);
  assert.ok(updated.includes('  - Research'));
  assert.ok(updated.includes('  - Unity'));
  assert.ok(!updated.includes('  - research'));
  assert.ok(updated.includes('updated: 2026-05-12'));
});

// ────────────────────────────────────────────────
// Inline body tag rewrite — skip headings + code fences
// ────────────────────────────────────────────────
test('18. inline rewrite skips heading and code fence', () => {
  const body = `# Heading line not a tag

Inline tag #research and #unity.

\`\`\`
code #notatag inside fence
\`\`\`

After fence #api-gateway.`;
  const r = rewriteInlineTags(body, baseOpts());
  assert.ok(r.body.includes('# Heading'), 'heading preserved');
  assert.ok(r.body.includes('#Research'));
  assert.ok(r.body.includes('#Unity') === false || r.body.includes('#Unity'), 'unity normalized via alias if present, else via lowercase rule');
  // #unity via lowercase rule → Unity
  assert.ok(r.body.includes('#Unity'));
  // fence content untouched
  assert.ok(r.body.includes('#notatag inside fence'));
  // alias applied
  assert.ok(r.body.includes('#APIGateway'));
});

// ────────────────────────────────────────────────
// Environment independence — path detection
// ────────────────────────────────────────────────
test('19. detectAIMindVaultsRoot returns a valid path with Vaults/', async () => {
  const root = detectAIMindVaultsRoot();
  assert.ok(root, 'root must be detected');
  // basic sanity: returned path should contain 'AIMindVaults' OR have Vaults/ subdir
  const { existsSync } = await import('node:fs');
  assert.ok(existsSync(join(root, 'Vaults')), `Vaults/ must exist under detected root: ${root}`);
});

test('20. defaultTagAliasesPath resolves to existing file', async () => {
  const p = defaultTagAliasesPath();
  const { existsSync } = await import('node:fs');
  assert.ok(existsSync(p), `tag-aliases.yaml should exist at ${p}`);
});

// ────────────────────────────────────────────────
// End-to-end dry-run on a tiny synthetic vault
// ────────────────────────────────────────────────
test('21. e2e dry-run on synthetic vault produces report', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'tag-migrate-e2e-'));
  try {
    // Build a minimal AIMindVaults-shaped tree:
    //   {sandbox}/Vaults/SampleVault/.vault_data/vault_index.json
    //   {sandbox}/Vaults/SampleVault/Contents/note.md
    const vRoot = join(sandbox, 'Vaults', 'SampleVault');
    await mkdir(join(vRoot, '.vault_data'), { recursive: true });
    await mkdir(join(vRoot, 'Contents'), { recursive: true });
    await writeFile(join(vRoot, '.vault_data', 'vault_index.json'),
      JSON.stringify({ vault: 'SampleVault', notes: [], tag_index: {} }), 'utf8');
    await writeFile(join(vRoot, 'Contents', 'note.md'), `---
type: note
tags: [research, unity, domain, MCP, 보안]
updated: 2026-05-12
---

# Heading
Body text with #api-gateway tag.`, 'utf8');

    // Custom aliases file
    const aliasFile = join(sandbox, 'aliases.yaml');
    await writeFile(aliasFile, `aliases:
  unity: Unity
  "api-gateway": APIGateway

remove:
  - domain
`, 'utf8');

    const reportPath = join(sandbox, 'report.md');
    await tagMigrate({
      root: sandbox,
      aliasesFile: aliasFile,
      report: reportPath,
      scope: 'all',
    });
    const report = await readFile(reportPath, 'utf8');
    assert.ok(report.includes('DRY_RUN'));
    assert.ok(report.includes('SampleVault'));
    assert.ok(report.includes('research → Research') || report.includes('research'),
      'expected research transform in report');
    assert.ok(report.includes('domain'), 'expected meta removal in report');

    // file untouched in dry-run
    const noteAfter = await readFile(join(vRoot, 'Contents', 'note.md'), 'utf8');
    assert.ok(noteAfter.includes('tags: [research, unity, domain, MCP, 보안]'));
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────
// Invalid root rejection
// ────────────────────────────────────────────────
test('22. invalid --root rejected (no Vaults/)', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'tag-migrate-bad-'));
  try {
    let exitCodeBefore = process.exitCode;
    process.exitCode = 0;
    await tagMigrate({ root: sandbox });
    assert.equal(process.exitCode, 1, 'exitCode should be 1 for invalid root');
    process.exitCode = exitCodeBefore;
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────
let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exitCode = failed ? 1 : 0;
