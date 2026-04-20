/**
 * hub-resolver — Hub detection and resolution.
 *
 * Centralizes Hub-finding logic previously duplicated in sync-workspace.js
 * and pre-sync.js. Adds Multi-Hub support while preserving backward compat.
 *
 * Resolution priority (for satellite → hub binding):
 *   1. Explicit hubPath option
 *   2. Satellite's .sync/hub-source.json (new)
 *   3. First Hub found under Vaults/ (legacy scan)
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

/**
 * Check if a given vault path is a Hub.
 * A vault is a Hub if it has .sync/.hub_marker or .sync/hub-marker.json.
 * @param {string} vaultRoot
 * @returns {boolean}
 */
export function isHub(vaultRoot) {
  const syncDir = join(vaultRoot, '.sync');
  return existsSync(join(syncDir, '.hub_marker')) ||
         existsSync(join(syncDir, 'hub-marker.json'));
}

/**
 * Read hub-marker.json if present. Returns null if missing or invalid.
 * @param {string} hubVaultRoot
 * @returns {object|null}
 */
export function readHubMarker(hubVaultRoot) {
  const markerPath = join(hubVaultRoot, '.sync', 'hub-marker.json');
  if (!existsSync(markerPath)) return null;
  try {
    return JSON.parse(readFileSync(markerPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read hub-source.json if present. Returns null if missing or invalid.
 * @param {string} satelliteVaultRoot
 * @returns {object|null}
 */
export function readHubSource(satelliteVaultRoot) {
  const sourcePath = join(satelliteVaultRoot, '.sync', 'hub-source.json');
  if (!existsSync(sourcePath)) return null;
  try {
    return JSON.parse(readFileSync(sourcePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Find AIMindVaults root (parent containing Vaults/BasicVaults/).
 *
 * Uses `Vaults/BasicVaults/` as the anchor rather than bare `Vaults/` because
 * individual satellite vaults may contain their own `Vaults/` subfolder for
 * content organization (e.g. Funding vault), which would otherwise match
 * prematurely and short-circuit the search.
 *
 * @param {string} startPath
 * @returns {string|null}
 */
export function findAIMindVaultsRoot(startPath) {
  let dir = resolve(startPath);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'Vaults', 'BasicVaults'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Scan Vaults/ for all Hubs (directories with .hub_marker or hub-marker.json).
 * Does not recurse into a Hub once found.
 * @param {string} aimRoot - AIMindVaults root
 * @param {string} [excludeVault] - Absolute vault path to exclude (e.g. self)
 * @returns {string[]} Absolute paths of found Hub vaults
 */
export function scanHubs(aimRoot, excludeVault) {
  const vaultsDir = join(aimRoot, 'Vaults');
  if (!existsSync(vaultsDir)) return [];
  const excludeResolved = excludeVault ? resolve(excludeVault) : null;
  const results = [];

  function search(dir, depth) {
    if (depth > 3) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = join(dir, entry.name);
        const resolved = resolve(full);
        if (resolved === excludeResolved) continue;
        if (isHub(full)) {
          results.push(resolved);
          continue; // Don't recurse into a Hub
        }
        search(full, depth + 1);
      }
    } catch {}
  }

  search(vaultsDir, 0);
  return results;
}

/**
 * Find first Hub under Vaults/ (legacy behavior for backward compat).
 * @param {string} aimRoot
 * @param {string} [excludeVault]
 * @returns {string|null}
 */
export function findFirstHub(aimRoot, excludeVault) {
  const hubs = scanHubs(aimRoot, excludeVault);
  return hubs.length > 0 ? hubs[0] : null;
}

/**
 * Find Hubs of a specific type (requires hub-marker.json with hubType).
 * @param {string} aimRoot
 * @param {'core'|'preset'} hubType
 * @returns {string[]} Absolute paths of matching Hubs
 */
export function findHubsByType(aimRoot, hubType) {
  return scanHubs(aimRoot).filter(hubPath => {
    const marker = readHubMarker(hubPath);
    return marker && marker.hubType === hubType;
  });
}

/**
 * Resolve the Hub that a satellite vault should sync with.
 *
 * @param {string} satelliteVaultRoot - Absolute path to satellite vault
 * @param {object} [opts]
 * @param {string} [opts.hubPath] - Explicit hub path (highest priority)
 * @returns {{
 *   hubPath: string|null,
 *   source: 'explicit'|'hub-source.json'|'scan'|'not-found',
 *   hubSource?: object,
 *   warning?: string
 * }}
 */
export function resolveHub(satelliteVaultRoot, opts = {}) {
  const satellite = resolve(satelliteVaultRoot);

  // 1. Explicit option
  if (opts.hubPath) {
    const explicit = resolve(opts.hubPath);
    if (existsSync(explicit) && isHub(explicit)) {
      return { hubPath: explicit, source: 'explicit' };
    }
    return { hubPath: null, source: 'not-found' };
  }

  // 2. hub-source.json (Multi-Hub explicit binding)
  const hubSource = readHubSource(satellite);
  if (hubSource && hubSource.hubPath) {
    const resolvedHub = resolve(satellite, hubSource.hubPath);
    if (existsSync(resolvedHub) && isHub(resolvedHub)) {
      let warning;
      // Optional hubId validation
      if (hubSource.hubId) {
        const marker = readHubMarker(resolvedHub);
        if (marker && marker.hubId && marker.hubId !== hubSource.hubId) {
          warning = `hubId mismatch: hub-source.json says "${hubSource.hubId}", hub-marker.json says "${marker.hubId}"`;
        }
      }
      return { hubPath: resolvedHub, source: 'hub-source.json', hubSource, warning };
    }
    // hub-source.json exists but path invalid — don't silently fall through;
    // caller can handle this by checking source === 'not-found'
    return {
      hubPath: null,
      source: 'not-found',
      hubSource,
      warning: `hub-source.json points to missing/invalid hub: ${hubSource.hubPath}`,
    };
  }

  // 3. Legacy scan fallback
  const aimRoot = findAIMindVaultsRoot(satellite);
  if (!aimRoot) return { hubPath: null, source: 'not-found' };

  const firstHub = findFirstHub(aimRoot, satellite);
  if (firstHub) {
    return { hubPath: firstHub, source: 'scan' };
  }

  return { hubPath: null, source: 'not-found' };
}

/**
 * Given a Hub vault root, return its cli-node directory.
 * @param {string} hubVaultRoot
 * @returns {string}
 */
export function getHubCliNode(hubVaultRoot) {
  return join(hubVaultRoot, '.sync', '_tools', 'cli-node');
}
