/**
 * post_note_edit_review — UTF-8 validation + auto index build.
 * Port of post_note_edit_review.ps1 (~110 LOC → ~90 LOC).
 *
 * Checks all .md files under scope for:
 *   1. Strict UTF-8 validity (fatal decode)
 *   2. U+FFFD replacement character count
 *
 * On pass, automatically triggers incremental index build.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { detectVaultRoot } from '../lib/vault-path.js';
import * as log from '../lib/logger.js';

const SCOPE_CANDIDATES = ['Contents', 'Project', 'docs'];
const REPLACEMENT_CHAR = '\uFFFD';

/**
 * Detect scope folder within vault root.
 * @param {string} vaultRoot
 * @returns {string|null} scope name (e.g. 'Contents')
 */
function detectScope(vaultRoot) {
  for (const name of SCOPE_CANDIDATES) {
    if (existsSync(join(vaultRoot, name))) return name;
  }
  return null;
}

/**
 * Recursively collect all .md files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectMdFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Check a single file for UTF-8 validity and U+FFFD chars.
 * @param {string} filePath
 * @returns {Promise<{path: string, utf8Valid: boolean, replacementCount: number}|null>}
 */
async function checkFile(filePath) {
  const buf = await readFile(filePath);

  // Strict UTF-8 decode — throws on invalid sequences
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let utf8Valid = true;
  let text = '';
  try {
    text = decoder.decode(buf);
  } catch {
    utf8Valid = false;
  }

  // Count U+FFFD replacement characters (only if valid UTF-8)
  let replacementCount = 0;
  if (utf8Valid) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === REPLACEMENT_CHAR) replacementCount++;
    }
  }

  if (!utf8Valid || replacementCount > 0) {
    return { path: filePath, utf8Valid, replacementCount };
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string} [opts.vaultRoot]
 * @param {string} [opts.scope]
 * @param {boolean} [opts.verbose]
 */
export async function postEditReview(opts = {}) {
  // 1. Resolve vault root
  const vaultRoot = opts.vaultRoot || detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root auto-detect failed');
    process.exitCode = 1;
    return;
  }

  // 2. Resolve scope
  const scopeName = opts.scope || detectScope(vaultRoot);
  if (!scopeName) {
    log.error(`Content folder not found under ${vaultRoot} (Contents/, Project/, docs/)`);
    process.exitCode = 1;
    return;
  }

  const target = join(vaultRoot, scopeName);
  if (!existsSync(target)) {
    log.error(`Scope path not found: ${target}`);
    process.exitCode = 1;
    return;
  }

  // 3. Collect and validate files
  const files = await collectMdFiles(target);
  const bad = [];
  for (const f of files) {
    const result = await checkFile(f);
    if (result) bad.push(result);
  }

  // 4. Output results (envVar format for Shell Commands compatibility)
  log.envVar('POST_EDIT_REVIEW_SCOPE', target);
  log.envVar('POST_EDIT_REVIEW_FILES', files.length);
  log.envVar('POST_EDIT_REVIEW_BAD', bad.length);

  if (bad.length > 0) {
    log.info('');
    log.info('Bad files:');
    for (const b of bad.sort((a, c) => a.path.localeCompare(c.path))) {
      const rel = relative(vaultRoot, b.path).split(sep).join('/');
      log.info(`  ${rel}  utf8=${b.utf8Valid}  fffd=${b.replacementCount}`);
    }
    process.exitCode = 2;
    return;
  }

  log.envVar('POST_EDIT_REVIEW_OK', 1);

  // 5. Auto-trigger incremental index build
  try {
    const { indexBuild } = await import('./index-build.js');
    await indexBuild({ vaultRoot, incremental: true, verbose: opts.verbose });

    const { getIndexPath } = await import('../lib/vault-path.js');
    const indexPath = getIndexPath(vaultRoot);
    if (existsSync(indexPath)) {
      log.envVar('POST_EDIT_INDEX_UPDATED', 1);
      log.envVar('POST_EDIT_INDEX_PATH', indexPath);
    } else {
      throw new Error(`Index file not created: ${indexPath}`);
    }
  } catch (err) {
    log.envVar('POST_EDIT_INDEX_UPDATED', 0);
    log.envVar('POST_EDIT_INDEX_ERROR', err.message);
  }
}
