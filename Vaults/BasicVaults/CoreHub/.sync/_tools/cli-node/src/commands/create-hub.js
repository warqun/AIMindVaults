/**
 * create-hub — Create a Preset Hub vault derived from a Core Hub.
 *
 * Steps:
 *  1. Mirror-copy Core Hub to target (minus per-device configs)
 *  2. Write `.sync/hub-marker.json` with hubType="preset", coreHub=<rel>
 *  3. Keep `.sync/.hub_marker` (backward compat)
 *  4. Update make-md systemName to the new hub name
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { join, resolve, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorDirectory } from '../lib/fs-mirror.js';
import { isHub, readHubMarker } from '../lib/hub-resolver.js';
import * as log from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLONE_EXCLUDE_DIRS = ['.git', '.stfolder', 'smart-connections', 'cache', '.vault_data'];
const CLONE_EXCLUDE_FILES = [
  'workspace.json', 'workspace-mobile.json', 'graph.json',
  'backlink-in-document.json', '.stignore',
];
const PER_DEVICE_CONFIGS = [
  '.obsidian/plugins/obsidian-git/data.json',
  '.obsidian/plugins/claudian/data.json',
];

/**
 * @param {object} opts
 * @param {string} opts.targetPath - Destination path for the new Preset Hub
 * @param {string} [opts.from] - Core Hub to derive from (auto-detect: AIHubVault via script location)
 * @param {string} opts.hubId - Preset Hub identifier (required)
 * @param {string} [opts.hubName] - Display name (defaults to folder name)
 * @param {string} [opts.description] - Short description
 * @param {boolean} [opts.dryRun]
 */
export async function createHub(opts) {
  if (!opts.targetPath) {
    log.error('--target-path is required.');
    process.exitCode = 1;
    return;
  }
  if (!opts.hubId) {
    log.error('--hub-id is required (e.g. "game-dev", "writing").');
    process.exitCode = 1;
    return;
  }

  const targetPath = resolve(opts.targetPath);
  const hubName = opts.hubName || basename(targetPath);

  // Detect source (Core Hub)
  const sourceRoot = opts.from
    ? resolve(opts.from)
    : resolve(__dirname, '..', '..', '..', '..', '..');

  if (!existsSync(sourceRoot)) {
    log.error(`Source Hub path not found: ${sourceRoot}`);
    process.exitCode = 1;
    return;
  }

  if (!isHub(sourceRoot)) {
    log.error(`Source is not a Hub (no .hub_marker / hub-marker.json): ${sourceRoot}`);
    process.exitCode = 1;
    return;
  }

  // Optional: verify source is a Core Hub (not a Preset)
  const sourceMarker = readHubMarker(sourceRoot);
  if (sourceMarker && sourceMarker.hubType === 'preset') {
    log.warn(`Source is a Preset Hub (hubId="${sourceMarker.hubId}"). Preset-of-preset derivation discouraged in flat MVP topology.`);
  }

  log.info('====================================================');
  log.info(' Preset Hub Creation');
  log.info('====================================================');
  log.info(` Source (Core Hub): ${sourceRoot}`);
  log.info(` Target            : ${targetPath}`);
  log.info(` hubId             : ${opts.hubId}`);
  log.info(` hubName           : ${hubName}`);
  log.info('----------------------------------------------------');

  // Safety: prevent target inside source
  if (
    targetPath.startsWith(sourceRoot + '/') ||
    targetPath.startsWith(sourceRoot + '\\')
  ) {
    log.error('Target is inside source directory. Would cause infinite recursive copy.');
    process.exitCode = 1;
    return;
  }

  // Step 1: Mirror copy
  log.info('\n[1/4] Copying Core Hub files...');
  try {
    const result = await mirrorDirectory(sourceRoot, targetPath, {
      excludeDirs: CLONE_EXCLUDE_DIRS,
      excludeFiles: CLONE_EXCLUDE_FILES,
      noPrune: true,
      dryRun: opts.dryRun,
      log: (msg) => log.info(`  ${msg}`),
    });
    log.info(`  Copied: ${result.copied}, Unchanged: ${result.unchanged}`);
  } catch (err) {
    log.error(`Copy failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  if (opts.dryRun) {
    log.info('\n[DRY_RUN] Skipping post-copy steps.');
    return;
  }

  // Step 2: Remove per-device plugin configs
  log.info('\n[2/4] Removing per-device plugin configs...');
  for (const rel of PER_DEVICE_CONFIGS) {
    const filePath = join(targetPath, rel);
    if (existsSync(filePath)) {
      await unlink(filePath);
      log.info(`  - Removed: ${rel}`);
    }
  }

  // Step 3: Write hub-marker.json (hubType="preset")
  log.info('\n[3/5] Writing hub-marker.json...');
  const markerPath = join(targetPath, '.sync', 'hub-marker.json');
  const relCoreHub = relative(targetPath, sourceRoot).split(/[/\\]/).join('/');
  const today = new Date().toISOString().slice(0, 10);
  const marker = {
    hubId: opts.hubId,
    hubType: 'preset',
    hubName,
    version: '1.0.0',
    coreHub: relCoreHub || '.',
    description: opts.description || `Preset Hub derived from ${sourceMarker?.hubName || 'Core Hub'}`,
    createdAt: today,
  };
  await writeFile(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');
  log.info(`  - Wrote: .sync/hub-marker.json (hubId="${opts.hubId}", coreHub="${marker.coreHub}")`);

  // Step 4: Rewrite Preset-specific vault-root files (CLAUDE.md, _STATUS.md, README.md)
  //          The clone inherits Core Hub's versions which incorrectly describe the
  //          new Preset as a Core Hub. Replace with Preset-focused minimal stubs.
  log.info('\n[4/5] Writing Preset-specific entry files...');
  const claudeMd = `---
type: vault-entry
tags:
  - ${basename(targetPath)}
  - PresetHub
  - Multi-Hub
agent: claude
created: ${today}
updated: ${today}
---

# ${hubName} — Preset Hub

> Multi-Hub 아키텍처의 **Preset Hub**. \`hubId="${opts.hubId}"\`, \`coreHub="${marker.coreHub}"\`.

## 이 볼트의 역할

${opts.description || `Preset Hub derived from ${sourceMarker?.hubName || 'Core Hub'}`}

## Core 편집은 Core Hub 에서만

\`.sync/_tools/\`, \`.sync/_Standards/Core/\`, \`.sync/schemas/\`, Core 6 플러그인 편집 금지. Core Hub (\`${marker.coreHub}\`) 에서 \`bump-version --broadcast\` 로 자동 수신.

## 이 볼트에서 편집 가능한 것 (Custom 계층)

- \`.obsidian/plugins/\` 에 Custom 플러그인 설치
- \`.claude/rules/custom/\` · \`.claude/commands/custom/\` 에 개인 규칙·스킬 (볼트 내부 사용 시)
- 편집 후 이 볼트의 \`_WORKSPACE_VERSION.md\` 에 bump-version 기록

## 위성 바인딩

위성 볼트가 이 Preset 에 바인딩하려면 자기 \`.sync/hub-source.json\` 에:

\`\`\`json
{
  "hubPath": "<상대경로 to ${basename(targetPath)}>",
  "hubId": "${opts.hubId}",
  "bindAt": "${today}"
}
\`\`\`

또는 \`aimv clone --hub <이 볼트 경로>\` 로 생성.
`;
  await writeFile(join(targetPath, 'CLAUDE.md'), claudeMd, 'utf8');

  const statusMd = `---
type: status
tags:
  - ${basename(targetPath)}
  - PresetHub
  - Multi-Hub
agent: claude
updated: ${today}
last_session: claude / ${today} (${basename(targetPath)} 초기 생성)
---

# ${hubName} 상태

> Preset Hub 초기 상태. 바인딩된 위성 없음.

## Now

- \`create-hub\` 로 Core Hub 에서 파생 생성 완료 (${today})
- hub-marker.json 작성됨 (hubType=preset, hubId=${opts.hubId})
- Core 6 플러그인 유지

## Next

- 바인딩할 위성 추가 또는 이 Preset 에 Custom 오버레이 추가

## Blocked

- 없음

## Decisions

- (${today}) \`${opts.hubId}\` Preset 으로 초기 생성
`;
  await writeFile(join(targetPath, '_STATUS.md'), statusMd, 'utf8');

  const readmeMd = `# ${hubName}

AIMindVaults Multi-Hub 아키텍처의 **Preset Hub** (hubId="${opts.hubId}").

Core 계층 변경 시 Core Hub 에서 \`bump-version --broadcast\` 로 자동 수신. 자세한 역할·규칙은 \`CLAUDE.md\` 참조.
`;
  await writeFile(join(targetPath, 'README.md'), readmeMd, 'utf8');

  log.info('  - Wrote: CLAUDE.md, _STATUS.md, README.md (Preset-specific)');

  // Step 5: Update make-md systemName
  log.info('\n[5/5] Updating plugin settings...');
  const makeMdPath = join(targetPath, '.obsidian', 'plugins', 'make-md', 'data.json');
  if (existsSync(makeMdPath)) {
    try {
      const content = readFileSync(makeMdPath, 'utf8');
      const updated = content.replace(/"systemName"\s*:\s*"[^"]*"/, `"systemName": "${hubName}"`);
      if (content !== updated) {
        await writeFile(makeMdPath, updated, 'utf8');
        log.info(`  - make-md systemName -> ${hubName} [OK]`);
      } else {
        log.info('  - make-md systemName: already up to date');
      }
    } catch (err) {
      log.warn(`  Could not update make-md: ${err.message}`);
    }
  } else {
    log.info('  - make-md plugin not found, skipping');
  }

  log.info('\n====================================================');
  log.info(' Preset Hub Ready');
  log.info('====================================================');
  log.info(` Path  : ${targetPath}`);
  log.info(` hubId : ${opts.hubId}`);
  log.info(` Next  : Customize Custom layer (.claude/rules/custom/, .obsidian/plugins/)`);
  log.info('        Satellites bind via .sync/hub-source.json');
}
