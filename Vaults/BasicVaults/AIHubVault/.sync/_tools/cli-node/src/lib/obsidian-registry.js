/**
 * Obsidian global vault registry helpers.
 *
 * Reads/writes `%APPDATA%/Obsidian/obsidian.json` (or platform equivalent),
 * detects running Obsidian processes, and manages atomic edits with backups.
 *
 * Research basis: 2026-04-24 deep research (see
 * `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/onboarding/
 *  20260424_Obsidian_Bulk_등록_딥리서치_보고서.md`).
 *
 * Key findings applied here:
 *   - obsidian.json is the 1st-party registry; sidecar {vault_id}.json is
 *     NOT required in 2026.
 *   - 16-hex vault id is pure random (not a path hash).
 *   - Live Obsidian writes back in-memory state on shutdown → editing while
 *     running can silently revert changes. Process check is mandatory.
 *   - Atomic write via temp + rename prevents partial writes.
 *   - Startup pruning: unreachable vault paths are removed at launch; verify
 *     every path is accessible before inserting.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { copyFile, readFile, rename, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { platform, homedir } from 'node:os';

export function getObsidianConfigPath() {
  if (platform() === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) return null;
    return join(appData, 'Obsidian', 'obsidian.json');
  }
  if (platform() === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'obsidian', 'obsidian.json');
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : join(homedir(), '.config');
  return join(base, 'obsidian', 'obsidian.json');
}

/**
 * Detect if any Obsidian process is running.
 * Windows: `tasklist`. macOS/Linux: `pgrep` then fallback to `ps`.
 */
export function isObsidianRunning() {
  if (platform() === 'win32') {
    const result = spawnSync('tasklist', ['/FI', 'IMAGENAME eq Obsidian.exe', '/NH'], {
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    });
    if (result.status !== 0) return null;
    return /Obsidian\.exe/i.test(result.stdout || '');
  }
  const pgrep = spawnSync('pgrep', ['-f', 'Obsidian'], {
    encoding: 'utf8',
    shell: false,
  });
  if (pgrep.status === 0) return (pgrep.stdout || '').trim().length > 0;
  if (pgrep.error && pgrep.error.code !== 'ENOENT') return null;
  const ps = spawnSync('ps', ['-A'], { encoding: 'utf8', shell: false });
  if (ps.status !== 0) return null;
  return /[Oo]bsidian/.test(ps.stdout || '');
}

/**
 * Normalize a filesystem path for registry comparison.
 * - Windows: forward slashes collapsed to backslashes, drive letter upper-case.
 * - Others: resolve and keep slashes.
 */
export function normalizeVaultPath(p) {
  if (!p) return p;
  const resolved = resolve(p);
  if (platform() === 'win32') {
    let out = resolved.replace(/\//g, '\\');
    if (/^[a-z]:/.test(out)) out = out[0].toUpperCase() + out.slice(1);
    return out;
  }
  return resolved;
}

/**
 * Read obsidian.json. Returns { exists, data, raw }.
 */
export async function readRegistry(configPath) {
  if (!existsSync(configPath)) {
    return { exists: false, data: { vaults: {} }, raw: '' };
  }
  const raw = await readFile(configPath, 'utf8');
  const clean = raw.replace(/^\uFEFF/, '');
  let data;
  try {
    data = JSON.parse(clean);
  } catch (err) {
    throw new Error(`Failed to parse ${configPath}: ${err.message}`);
  }
  if (!data || typeof data !== 'object') data = {};
  if (!data.vaults || typeof data.vaults !== 'object') data.vaults = {};
  return { exists: true, data, raw };
}

function timestampTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Create timestamped backup next to obsidian.json.
 * Returns backup path, or null if source missing.
 */
export async function backupRegistry(configPath) {
  if (!existsSync(configPath)) return null;
  const backupPath = `${configPath}.bak_${timestampTag()}`;
  await copyFile(configPath, backupPath);
  return backupPath;
}

export function newVaultId(existingIds) {
  for (let i = 0; i < 16; i++) {
    const id = randomBytes(8).toString('hex');
    if (!existingIds || !existingIds.has(id)) return id;
  }
  // Fallback: timestamp-seeded hash (extremely unlikely path).
  return createHash('sha256')
    .update(`${Date.now()}:${Math.random()}:${randomBytes(16).toString('hex')}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Write obsidian.json atomically: temp file + rename.
 * UTF-8 without BOM, 2-space indent.
 */
export async function writeRegistryAtomic(configPath, data) {
  const json = JSON.stringify(data, null, 2);
  const tempPath = `${configPath}.tmp_${process.pid}_${Date.now()}`;
  await writeFile(tempPath, json, { encoding: 'utf8' });
  await rename(tempPath, configPath);
}

/**
 * Scan `Vaults/**` for directories that look like Obsidian vaults (`.obsidian/` present).
 * Returns absolute vault paths.
 */
export function scanVaultsWithObsidian(aimRoot) {
  const vaultsDir = join(aimRoot, 'Vaults');
  if (!existsSync(vaultsDir)) return [];

  const SKIP_DIRS = new Set(['.git', '.trash', '.vault_data', 'node_modules', '.sync', '.obsidian']);
  const results = [];

  function scan(dir, depth) {
    if (depth > 8) return;
    if (existsSync(join(dir, '.obsidian'))) {
      results.push(resolve(dir));
      return;
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      scan(join(dir, entry.name), depth + 1);
    }
  }

  scan(vaultsDir, 0);
  return [...new Set(results)].sort((a, b) => a.localeCompare(b));
}

/**
 * Build diff between current registry and scanned vault paths.
 *
 * Returns:
 *   toAdd:    paths scanned but not in registry
 *   existing: paths already in registry (keeps existing entry)
 *   stale:    registry entries whose path does not exist on disk or is
 *             outside AIMindVaults scope (candidates for removal)
 */
export function computeRegistryDiff(registryData, scannedPaths, aimRoot) {
  const vaults = registryData.vaults || {};
  const byPath = new Map();
  for (const [id, entry] of Object.entries(vaults)) {
    if (entry && typeof entry.path === 'string') {
      byPath.set(normalizeVaultPath(entry.path), { id, entry });
    }
  }

  const toAdd = [];
  const existing = [];
  const seen = new Set();
  for (const p of scannedPaths) {
    const key = normalizeVaultPath(p);
    seen.add(key);
    if (byPath.has(key)) {
      existing.push({ path: p, id: byPath.get(key).id });
    } else {
      toAdd.push(p);
    }
  }

  const aimScope = aimRoot ? normalizeVaultPath(join(aimRoot, 'Vaults')) : null;
  const stale = [];
  for (const [key, { id, entry }] of byPath.entries()) {
    const accessible = existsSync(entry.path);
    const inScope = aimScope ? key.startsWith(aimScope) : true;
    if (!accessible) {
      stale.push({ id, path: entry.path, reason: 'path_missing', inScope });
    } else if (!seen.has(key) && inScope) {
      stale.push({ id, path: entry.path, reason: 'not_scanned', inScope });
    }
  }

  return { toAdd, existing, stale };
}

/**
 * Insert new entries into registry data.
 * Mutates `data` in-place. Returns number added.
 *
 * Entry shape: { path, ts }. `open` flag is NOT touched (preserves user state).
 */
export function addVaultsToRegistry(data, pathsToAdd) {
  if (!data.vaults) data.vaults = {};
  const existingIds = new Set(Object.keys(data.vaults));
  let added = 0;
  for (const p of pathsToAdd) {
    const id = newVaultId(existingIds);
    existingIds.add(id);
    data.vaults[id] = {
      path: normalizeVaultPath(p),
      ts: Date.now(),
    };
    added++;
  }
  return added;
}

/**
 * Restore registry from a backup file.
 */
export async function restoreRegistry(configPath, backupPath) {
  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  await copyFile(backupPath, configPath);
}
