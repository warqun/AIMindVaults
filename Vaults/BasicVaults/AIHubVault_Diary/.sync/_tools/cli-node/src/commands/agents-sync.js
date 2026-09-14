import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { localDate, localIso } from '../lib/local-time.js';

const SYNC_MAP = [
  { source: '.agents/rules/core', targets: ['.claude/rules/core', '.codex/rules/core'] },
  { source: '.agents/commands/core', targets: ['.claude/commands/core', '.codex/skills/core'] },
  { source: '.agents/hooks/core', targets: ['.claude/hooks/core'] },
];

// `custom/` **최상위** 파일. 종전엔 도메인 폴더 (`custom/<domain>/`) 만 돌아서
// `agent-ownership.md` 처럼 폴더 없이 놓인 룰이 **어느 미러에도 안 갔다** —
// `.claude/` 쪽은 손으로 복사한 낡은 사본이었고 `.codex/` 쪽은 아예 없었다.
// 정작 에이전트 권한을 정하는 룰이 Codex 에 안 보이던 셈이다 (2026-09-08 발견).
const ROOT_CUSTOM_MAP = [
  { source: '.agents/rules/custom', targets: ['.claude/rules/custom', '.codex/rules/custom'] },
  { source: '.agents/commands/custom', targets: ['.claude/commands/custom', '.codex/skills/custom'] },
];

const DOMAIN_SYNC_MAP = (domain) => [
  { source: `.agents/rules/custom/${domain}`, targets: [`.claude/rules/custom/${domain}`, `.codex/rules/custom/${domain}`] },
  { source: `.agents/commands/custom/${domain}`, targets: [`.claude/commands/custom/${domain}`, `.codex/skills/custom/${domain}`] },
];

function findAIMindVaultsRoot(startDir) {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.agents')) && existsSync(join(dir, 'CLAUDE.md'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error('AIMindVaults root not found (no .agents/ + CLAUDE.md in ancestry)');
}

async function listDomains(root) {
  const names = new Set();
  for (const rel of ['.agents/rules/custom', '.agents/commands/custom']) {
    try {
      const entries = await readdir(join(root, rel), { withFileTypes: true });
      for (const e of entries) if (e.isDirectory()) names.add(e.name);
    } catch { /* 없으면 무시 */ }
  }
  return [...names].sort();
}

function commentPrefix(ext) {
  // .md 헤더 주석은 Claude `Skill` 도구 description 으로 잘못 인식되어 제거
  // (정본 표식은 .agents/ 폴더 위치 자체로 충분)
  if (['py', 'sh', 'ps1', 'yaml', 'yml'].includes(ext)) return ['# ', ''];
  if (['js', 'mjs', 'ts', 'css'].includes(ext)) return ['// ', ''];
  return null;
}

function buildHeader(relSource, ext) {
  const cp = commentPrefix(ext);
  if (!cp) return null;
  const now = localIso().replace('T', ' ');
  return `${cp[0]}DO NOT EDIT — sync copy of ${relSource} from agents-sync (${now})${cp[1]}\n\n`;
}

function stripHeader(content) {
  return content.replace(/^(<!--|#|\/\/)\s*DO NOT EDIT — sync copy of [^\n]+\n\n/, '');
}

async function syncFile(root, relSource, relTarget, dryRun) {
  const sourcePath = join(root, relSource);
  const targetPath = join(root, relTarget);
  const sourceContent = await readFile(sourcePath, 'utf-8');
  const ext = relSource.toLowerCase().split('.').pop();
  const header = buildHeader(relSource.replace(/\\/g, '/'), ext);
  const mirrorContent = header ? `${header}${sourceContent}` : sourceContent;

  let existing = '';
  try { existing = await readFile(targetPath, 'utf-8'); } catch {}
  const existingBody = header ? stripHeader(existing) : existing;
  if (existingBody === sourceContent) return 'same';

  if (!dryRun) {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, mirrorContent, 'utf-8');
  }
  return existing ? 'updated' : 'created';
}

async function walkDir(absDir, baseAbs) {
  const out = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkDir(fullPath, baseAbs));
    } else if (entry.isFile()) {
      out.push(relative(baseAbs, fullPath));
    }
  }
  return out;
}

async function syncMapping(root, sourceRel, targetRel, dryRun, verbose, prefix = '', topOnly = false) {
  const sourceAbs = join(root, sourceRel);
  if (!existsSync(sourceAbs)) {
    return { same: 0, created: 0, updated: 0, orphans: [] };
  }
  let sourceFiles = await walkDir(sourceAbs, sourceAbs);
  // 최상위만 — 도메인 폴더는 DOMAIN_SYNC_MAP 이 따로 돌므로 중복 집계하지 않는다.
  if (topOnly) sourceFiles = sourceFiles.filter(p => !/[\\/]/.test(p));
  const stats = { same: 0, created: 0, updated: 0, orphans: [] };
  // 이미 SKILL.md 를 가진 디렉터리 (공식 형식으로 배포된 스킬) 는 진입점을 만들지 않는다.
  const skillDirs = new Set(
    sourceFiles.filter(p => /(^|[\\/])SKILL\.md$/i.test(p))
      .map(p => p.replace(/\\/g, '/').split('/').slice(0, -1).join('/')));
  const wantsEntries = targetRel.startsWith('.codex/skills');

  for (const relPath of sourceFiles) {
    const sRel = join(sourceRel, relPath).replace(/\\/g, '/');
    const tRel = join(targetRel, relPath).replace(/\\/g, '/');
    const result = await syncFile(root, sRel, tRel, dryRun);
    stats[result]++;
    if (wantsEntries && /\.md$/i.test(relPath) && !/SKILL\.md$/i.test(relPath)) {
      const dirOf = relPath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
      if (!skillDirs.has(dirOf)) {
        stats[await emitCodexSkillEntry(root, sRel, tRel, dryRun)]++;
      }
    }
  }
  const targetAbs = join(root, targetRel);
  if (existsSync(targetAbs) && !topOnly) {
    const targetFiles = await walkDir(targetAbs, targetAbs);
    const sourceSet = new Set(sourceFiles.map(p => p.replace(/\\/g, '/')));
    for (const relPath of targetFiles) {
      const rel = relPath.replace(/\\/g, '/');
      if (sourceSet.has(rel)) continue;
      // 우리가 만든 Codex 진입점은 소스에 대응 파일이 없다 — orphan 이 아니다.
      if (wantsEntries && /\/SKILL\.md$/i.test(rel)
          && sourceSet.has(`${rel.slice(0, -('/SKILL.md'.length))}.md`)) continue;
      stats.orphans.push(`${targetRel}/${rel}`);
    }
  }
  if (verbose || stats.created || stats.updated || stats.orphans.length) {
    console.log(`  ${prefix}${sourceRel} -> ${targetRel}: same=${stats.same} created=${stats.created} updated=${stats.updated} orphans=${stats.orphans.length}`);
  }
  return stats;
}

// --- Codex 스킬 진입점 생성 -----------------------------------------------
// 파일을 미러했다고 스킬로 **발견되는 것은 아니다.** Codex 는 `SKILL.md` (name +
// description frontmatter) 를 가진 디렉터리만 스킬 목록에 올린다. 우리 커맨드는
// 평범한 `<name>.md` 라서 미러가 성공해도 Codex 목록에 안 뜨고, 사람이 경로를
// 알려 줘야만 쓸 수 있었다 (2026-09-08 Codex 실측 보고).
//
// 그래서 미러 옆에 **얇은 진입점**을 같이 깐다. 본문을 복제하지 않는다 —
// frontmatter + "정본을 읽어라" 만 두어 내용은 계속 한 곳에만 있게 한다.
const SKILL_ENTRY_MARK = '<!-- agents-sync: codex skill entry -->';

function skillDescription(content, name) {
  const fm = content.match(/^description:\s*"?(.+?)"?\s*$/m);
  if (fm) return fm[1].trim();
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].replace(/^\/\S+\s+—\s+/, '').trim();
  return `AIMindVaults ${name} 절차`;
}

function skillTriggers(content) {
  const m = content.match(/^##\s*트리거[^\n]*\n+([\s\S]*?)(?=\n##\s|\n*$)/m);
  if (!m) return '';
  const line = m[1].replace(/[\r\n]+/g, ' ').replace(/[-*`]/g, ' ').replace(/\s+/g, ' ').trim();
  return line.slice(0, 300);
}

async function emitCodexSkillEntry(root, sourceRel, mirrorRel, dryRun) {
  const name = mirrorRel.split('/').pop().replace(/\.md$/i, '');
  const dirRel = `${mirrorRel.replace(/\.md$/i, '')}/SKILL.md`;
  const content = await readFile(join(root, sourceRel), 'utf-8');
  const desc = skillDescription(content, name);
  const trig = skillTriggers(content);
  const body = `---
name: ${name}
description: ${desc}${trig ? ` 트리거: ${trig}` : ''}
---

${SKILL_ENTRY_MARK}

# ${name}

절차 **정본**은 아래 파일이다. 이 스킬이 호출되면 먼저 읽고 그대로 따른다.

- 정본: \`${sourceRel}\`
- 미러 (내용 동일): \`${mirrorRel}\`

정본을 고칠 때는 \`.agents/\` 쪽만 고치고 \`agents-sync\` 를 다시 돌린다.
여기를 직접 고치면 다음 sync 에 덮인다.
`;
  const targetPath = join(root, dirRel);
  let existing = '';
  try { existing = await readFile(targetPath, 'utf-8'); } catch {}
  if (existing === body) return 'same';
  if (!dryRun) {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, body, 'utf-8');
  }
  return existing ? 'updated' : 'created';
}

async function updateManifestTimestamp(root) {
  const manifestPath = join(root, '.agents/_MANIFEST.md');
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const today = localDate();
    const updated = content.replace(/^last_updated:.*$/m, `last_updated: ${today}`);
    if (updated !== content) {
      await writeFile(manifestPath, updated, 'utf-8');
      console.log(`  MANIFEST last_updated -> ${today}`);
    }
  } catch (err) {
    console.log(`  WARN: MANIFEST timestamp update failed: ${err.message}`);
  }
}

export async function agentsSync(opts = {}) {
  const { root: rootOpt, dryRun, verify, area, verbose } = opts;
  const root = rootOpt || findAIMindVaultsRoot(process.cwd());

  console.log(`[agents-sync] root: ${root}`);
  if (dryRun) console.log(`[agents-sync] DRY-RUN (no changes)`);
  if (verify) console.log(`[agents-sync] VERIFY (exit 1 if drift)`);

  const domains = await listDomains(root);
  console.log(`[agents-sync] domains: ${domains.length ? domains.join(', ') : '(none)'}`);

  const total = { same: 0, created: 0, updated: 0, orphans: 0 };

  for (const mapping of SYNC_MAP) {
    const areaName = mapping.source.split('/').slice(-2).join('/');
    if (area && area !== 'core' && area !== areaName) continue;
    for (const target of mapping.targets) {
      const stats = await syncMapping(root, mapping.source, target, dryRun, verbose);
      total.same += stats.same;
      total.created += stats.created;
      total.updated += stats.updated;
      total.orphans += stats.orphans.length;
    }
  }

  for (const mapping of ROOT_CUSTOM_MAP) {
    if (area === 'core') continue;
    for (const target of mapping.targets) {
      const stats = await syncMapping(root, mapping.source, target, dryRun, verbose, '[custom] ', true);
      total.same += stats.same;
      total.created += stats.created;
      total.updated += stats.updated;
      total.orphans += stats.orphans.length;
    }
  }

  for (const domain of domains) {
    if (area && area !== domain && area !== 'all') continue;
    if (area === 'core') continue;
    for (const mapping of DOMAIN_SYNC_MAP(domain)) {
      for (const target of mapping.targets) {
        const stats = await syncMapping(root, mapping.source, target, dryRun, verbose, `[${domain}] `);
        total.same += stats.same;
        total.created += stats.created;
        total.updated += stats.updated;
        total.orphans += stats.orphans.length;
      }
    }
  }

  const changed = total.created + total.updated;
  console.log(`\n=== agents-sync DONE ===`);
  console.log(`  Same:    ${total.same}`);
  console.log(`  Created: ${total.created}`);
  console.log(`  Updated: ${total.updated}`);
  console.log(`  Orphans: ${total.orphans} (보고만, 자동 제거 안 함)`);
  console.log(`AGENTS_SYNC_RESULT=${changed > 0 ? 'CHANGED' : 'NOOP'}`);
  console.log(`AGENTS_SYNC_CHANGED=${changed}`);
  console.log(`AGENTS_SYNC_ORPHANS=${total.orphans}`);

  if (verify && changed > 0) {
    console.log(`[agents-sync] VERIFY FAIL: drift detected (changed=${changed})`);
    process.exit(1);
  }

  if (!dryRun && changed > 0) {
    await updateManifestTimestamp(root);
  }

  return { total, root, domains };
}
