/**
 * obsidian_ai_bridge — Wrapper for Obsidian CLI commands.
 * Port of obsidian_ai_bridge.ps1 (123 LOC → ~80 LOC).
 *
 * Delegates to `obsidian` CLI binary with structured arguments.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { detectVaultRoot } from '../lib/vault-path.js';
import * as log from '../lib/logger.js';

const SCOPE_CANDIDATES = ['Contents', 'Project', 'docs'];

function detectScope(vaultRoot) {
  for (const name of SCOPE_CANDIDATES) {
    if (existsSync(join(vaultRoot, name))) return name;
  }
  return null;
}

function runObsidian(args) {
  try {
    const result = execSync(`obsidian ${args.join(' ')}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    process.stdout.write(result);
  } catch (err) {
    if (err.stdout) process.stdout.write(err.stdout);
    if (err.stderr) process.stderr.write(err.stderr);
    process.exitCode = err.status || 1;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.action
 * @param {string} [opts.vaultRoot]
 * @param {string} [opts.vaultName]
 * @param {string} [opts.path]
 * @param {string} [opts.query]
 * @param {string} [opts.content]
 * @param {number} [opts.version]
 * @param {number} [opts.from]
 * @param {number} [opts.to]
 * @param {number} [opts.limit]
 * @param {string} [opts.pluginId]
 * @param {string} [opts.scope]
 */
export async function obsidianBridge(opts) {
  const vaultRoot = opts.vaultRoot ? opts.vaultRoot : detectVaultRoot();
  if (!vaultRoot) {
    log.error('Vault root not found.');
    process.exitCode = 1;
    return;
  }

  const vaultName = opts.vaultName || basename(vaultRoot);
  const scope = opts.scope || detectScope(vaultRoot);
  const v = `vault=${vaultName}`;

  const actions = {
    'vault-info': () => runObsidian(['vault', v]),
    'search': () => {
      if (!opts.query) throw new Error('--query required');
      const args = ['search', v, `query=${opts.query}`, `limit=${opts.limit || 50}`];
      if (opts.path) args.push(`path=${opts.path}`);
      runObsidian(args);
    },
    'search-context': () => {
      if (!opts.query) throw new Error('--query required');
      const args = ['search:context', v, `query=${opts.query}`, `limit=${opts.limit || 50}`];
      if (opts.path) args.push(`path=${opts.path}`);
      runObsidian(args);
    },
    'read': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['read', v, `path=${opts.path}`]);
    },
    'open': () => {
      const args = ['open', v];
      if (opts.path) args.push(`path=${opts.path}`);
      else if (opts.query) args.push(`file=${opts.query}`);
      else throw new Error('--path or --query required');
      runObsidian(args);
    },
    'append': () => {
      if (!opts.path) throw new Error('--path required');
      if (opts.content == null) throw new Error('--content required');
      runObsidian(['append', v, `path=${opts.path}`, `content=${opts.content}`]);
    },
    'create': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['create', v, `path=${opts.path}`, `content=${opts.content || ''}`, 'overwrite']);
    },
    'history': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['history', v, `path=${opts.path}`]);
    },
    'history-read': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['history:read', v, `path=${opts.path}`, `version=${opts.version || 1}`]);
    },
    'history-restore': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['history:restore', v, `path=${opts.path}`, `version=${opts.version || 1}`]);
    },
    'diff': () => {
      if (!opts.path) throw new Error('--path required');
      runObsidian(['diff', v, `path=${opts.path}`, `from=${opts.from || 2}`, `to=${opts.to || 1}`]);
    },
    'plugins-list': () => runObsidian(['plugins', v, 'filter=community', 'versions', 'format=tsv']),
    'plugin-install': () => {
      if (!opts.pluginId) throw new Error('--plugin-id required');
      runObsidian(['plugin:install', v, `id=${opts.pluginId}`, 'enable']);
    },
    'post-review': () => {
      // Delegate to our own review command
      return import('./post-edit-review.js').then(m => m.postEditReview({ vaultRoot, scope }));
    },
  };

  const handler = actions[opts.action];
  if (!handler) {
    log.error(`Unknown action: ${opts.action}. Valid: ${Object.keys(actions).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  try {
    await handler();
  } catch (err) {
    log.error(err.message);
    process.exitCode = 1;
  }
}
