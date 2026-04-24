/**
 * create-hub — Create a Preset Hub vault derived from a Core Hub.
 *
 * ─────────────────────────────────────────────────────────────
 * Path resolution (where paths come from)
 * ─────────────────────────────────────────────────────────────
 *   opts.targetPath (required)  — Destination absolute/relative path for the
 *                                 new Preset Hub. Resolved via path.resolve().
 *                                 Typical: C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>
 *   opts.from       (optional)  — Core Hub source. If omitted, auto-detected
 *                                 from THIS script's location (see ascent formula
 *                                 in detectSourceRoot below).
 *   opts.hubId      (required)  — Preset identifier. Must be kebab-case
 *                                 (^[a-z0-9][a-z0-9-]*$, enforced by
 *                                 hub-marker.schema.json).
 *   opts.hubName    (optional)  — Display name (defaults to target folder
 *                                 basename).
 *
 * ─────────────────────────────────────────────────────────────
 * 5-step workflow (what this command DOES automatically)
 * ─────────────────────────────────────────────────────────────
 *   1/5  Mirror-copy Core Hub to target (minus .git / caches / per-device)
 *   2/5  Remove per-device plugin configs left behind by the mirror copy
 *   3/5  Write .sync/hub-marker.json (hubType="preset", coreHub=<rel path>)
 *   4/5  Rewrite vault-root entry files (CLAUDE.md / _STATUS.md / README.md)
 *        with Preset-focused stubs (clone inherits Core Hub's copies which
 *        would incorrectly describe the new vault as a Core Hub).
 *   5/5  Update make-md plugin's systemName to the new hub name (sidebar nav).
 *
 * ─────────────────────────────────────────────────────────────
 * What this command does NOT do (manual follow-up required)
 * ─────────────────────────────────────────────────────────────
 *   • Install Custom plugins (only Core 7 are carried over from Core Hub)
 *   • Fill coreHubVersion in hub-marker.json (user must edit — defaults none)
 *   • Register the new Hub in root _STATUS.md vault registry
 *   • Record entry in _ROOT_VERSION.md
 *   • Configure Preset-specific templates / QuickAdd / Dataview dashboards
 *
 * See `.claude/commands/core/create-preset-hub.md` for the full post-CLI
 * workflow, sync semantics, and satellite binding instructions.
 *
 * ─────────────────────────────────────────────────────────────
 * Sync semantics after creation (where updates flow)
 * ─────────────────────────────────────────────────────────────
 *   • Core layer updates   : CoreHub → this Preset Hub (Push)
 *                            trigger = `bump-version --broadcast` on CoreHub
 *                            → chains core-sync-all automatically
 *   • Custom layer updates : edit here, `bump-version` here; satellites
 *                            bound to this Preset will pull on next pre-sync
 *   • Satellite binding    : satellite's `.sync/hub-source.json` points to
 *                            this hub via relative `hubPath` + `hubId`
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

// Directories excluded from the mirror copy.
//  - .git / .stfolder / cache / .vault_data : per-device, never cloned
//  - smart-connections                      : heavy vector index, rebuilt on demand
const CLONE_EXCLUDE_DIRS = ['.git', '.stfolder', 'smart-connections', 'cache', '.vault_data'];

// Files excluded from the mirror copy — Obsidian regenerates these per device.
const CLONE_EXCLUDE_FILES = [
  'workspace.json', 'workspace-mobile.json', 'graph.json',
  'backlink-in-document.json', '.stignore',
];

// Per-device plugin configs that survived the mirror copy but must be
// removed so the new Preset Hub starts with clean state.
//  - obsidian-git/data.json : device-specific repo paths, auth tokens
//  - claudian/data.json     : Claude Code session state
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

  // Detect source (Core Hub).
  //
  // When --from is omitted, we ascend from this script's directory to the
  // hub root. This file lives at:
  //   {HubRoot}/.sync/_tools/cli-node/src/commands/create-hub.js
  //                                    └──────── __dirname ────────┘
  // So 5 '..' segments = HubRoot:
  //   ..(1) src   ..(2) cli-node   ..(3) _tools   ..(4) .sync   ..(5) HubRoot
  //
  // IMPORTANT: this assumes the CLI is always invoked from a Core Hub's own
  // `_tools/cli-node/`. If a user runs a copied CLI from elsewhere without
  // passing --from, auto-detection may resolve to the wrong hub. For clarity
  // in skill docs, prefer `cd {CoreHub} && node .sync/_tools/cli-node/bin/cli.js ...`.
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

  // Safety: prevent target inside source.
  // Mirror-copying A → A/sub would recurse infinitely (copies its own output).
  // See also: `_tools/cli-node/../lib/fs-mirror.js` for the raw mirror logic.
  if (
    targetPath.startsWith(sourceRoot + '/') ||
    targetPath.startsWith(sourceRoot + '\\')
  ) {
    log.error('Target is inside source directory. Would cause infinite recursive copy.');
    process.exitCode = 1;
    return;
  }

  // ───────────────────────────────────────────────────────────
  // Step 1/5 — Mirror copy Core Hub → target.
  //   noPrune:true means existing files at target are preserved unless
  //   they have the same relative path as a source file (which gets
  //   overwritten). This lets `create-hub` be re-run idempotently.
  // ───────────────────────────────────────────────────────────
  log.info('\n[1/5] Copying Core Hub files...');
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

  // ───────────────────────────────────────────────────────────
  // Step 2/5 — Remove per-device plugin configs carried over from Core Hub.
  //   These files contain device-specific paths/tokens that should not
  //   leak into the new Preset Hub. Plugins will regenerate them on load.
  // ───────────────────────────────────────────────────────────
  log.info('\n[2/5] Removing per-device plugin configs...');
  for (const rel of PER_DEVICE_CONFIGS) {
    const filePath = join(targetPath, rel);
    if (existsSync(filePath)) {
      await unlink(filePath);
      log.info(`  - Removed: ${rel}`);
    }
  }

  // ───────────────────────────────────────────────────────────
  // Step 3/5 — Write .sync/hub-marker.json (hubType="preset").
  //   This file is the declarative identity of the new Preset Hub. Schema:
  //   `.sync/schemas/hub-marker.schema.json`. Fields written automatically:
  //     hubId, hubType, hubName, version, coreHub, description, createdAt
  //   NOT written (user must edit manually):
  //     coreHubVersion — the semver range this Preset requires from Core Hub.
  //       Without it, core-sync-all skips compatibility checks. Recommended
  //       default: "^1.0.0" (same major).
  //
  //   `coreHub` is stored as a POSIX-style relative path (forward slashes)
  //   so the marker is portable across Windows/Mac/Linux checkouts.
  // ───────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────
  // Step 4/5 — Rewrite vault-root entry files with Preset-focused stubs.
  //   The mirror copy inherits Core Hub's CLAUDE.md / _STATUS.md / README.md
  //   which describe a Core Hub's role. Overwriting them avoids misleading
  //   any agent (Claude Code, Codex) that first reads those files.
  //
  //   Generated content is intentionally minimal — user is expected to
  //   elaborate CLAUDE.md with Preset-specific rules (plugin bundle,
  //   folder structure, templates) matching the Preset spec document.
  // ───────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────
  // Step 5/5 — Update make-md plugin's systemName.
  //   make-md displays `systemName` as the left-sidebar root label
  //   (Obsidian's own vault nav shows folder name; make-md is separate).
  //   Without this update, a new Preset would show the Core Hub's name,
  //   which is visually confusing.
  //
  //   If make-md is not installed at the time of create-hub (e.g. Core
  //   bundle change), this step is a no-op — plugin-seed.js handles
  //   data.json bootstrap on next core-sync-all.
  // ───────────────────────────────────────────────────────────
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
