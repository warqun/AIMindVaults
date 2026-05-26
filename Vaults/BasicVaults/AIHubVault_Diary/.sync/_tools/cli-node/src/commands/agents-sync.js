import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const SYNC_MAP = [
  { source: '.agents/rules/core', targets: ['.claude/rules/core', '.codex/rules/core'] },
  { source: '.agents/commands/core', targets: ['.claude/commands/core', '.codex/skills/core'] },
  { source: '.agents/hooks/core', targets: ['.claude/hooks/core'] },
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
  const customRules = join(root, '.agents/rules/custom');
  try {
    const entries = await readdir(customRules, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
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
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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

async function syncMapping(root, sourceRel, targetRel, dryRun, verbose, prefix = '') {
  const sourceAbs = join(root, sourceRel);
  if (!existsSync(sourceAbs)) {
    return { same: 0, created: 0, updated: 0, orphans: [] };
  }
  const sourceFiles = await walkDir(sourceAbs, sourceAbs);
  const stats = { same: 0, created: 0, updated: 0, orphans: [] };
  for (const relPath of sourceFiles) {
    const sRel = join(sourceRel, relPath).replace(/\\/g, '/');
    const tRel = join(targetRel, relPath).replace(/\\/g, '/');
    const result = await syncFile(root, sRel, tRel, dryRun);
    stats[result]++;
  }
  const targetAbs = join(root, targetRel);
  if (existsSync(targetAbs)) {
    const targetFiles = await walkDir(targetAbs, targetAbs);
    const sourceSet = new Set(sourceFiles.map(p => p.replace(/\\/g, '/')));
    for (const relPath of targetFiles) {
      if (!sourceSet.has(relPath.replace(/\\/g, '/'))) {
        stats.orphans.push(`${targetRel}/${relPath.replace(/\\/g, '/')}`);
      }
    }
  }
  if (verbose || stats.created || stats.updated || stats.orphans.length) {
    console.log(`  ${prefix}${sourceRel} -> ${targetRel}: same=${stats.same} created=${stats.created} updated=${stats.updated} orphans=${stats.orphans.length}`);
  }
  return stats;
}

async function updateManifestTimestamp(root) {
  const manifestPath = join(root, '.agents/_MANIFEST.md');
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const today = new Date().toISOString().slice(0, 10);
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
