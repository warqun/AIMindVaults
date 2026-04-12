#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

program
  .name('aimv')
  .description('AIMindVaults cross-platform CLI tools')
  .version(pkg.version);

// Phase 2: index commands
const index = program.command('index').description('Vault index operations');

index
  .command('build')
  .description('Build vault content index (crawl Contents/ → JSON)')
  .option('-r, --vault-root <path>', 'Vault root path (auto-detect if omitted)')
  .option('-i, --incremental', 'Incremental build (skip unchanged files)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (opts) => {
    const { indexBuild } = await import('../src/commands/index-build.js');
    await indexBuild({ vaultRoot: opts.vaultRoot, incremental: opts.incremental, verbose: opts.verbose });
  });

index
  .command('search')
  .description('Search vault index by keyword/tag/type')
  .option('-r, --vault-root <path>', 'Vault root path')
  .option('-q, --query <keyword>', 'Keyword search')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--type <type>', 'Filter by frontmatter type')
  .option('-f, --format <fmt>', 'Output format: table|compact', 'table')
  .option('-n, --top <n>', 'Max results', '10')
  .action(async (opts) => {
    const { indexSearch } = await import('../src/commands/index-search.js');
    await indexSearch({ vaultRoot: opts.vaultRoot, query: opts.query, tag: opts.tag, type: opts.type, format: opts.format, top: parseInt(opts.top) });
  });

index
  .command('master-build')
  .description('Build cross-vault master index')
  .option('-r, --root <path>', 'AIMindVaults root path')
  .option('--vault-name <name>', 'Partial update for single vault')
  .action(async (opts) => {
    const { masterIndexBuild } = await import('../src/commands/master-index-build.js');
    await masterIndexBuild({ aimindvaultsRoot: opts.root, vaultName: opts.vaultName });
  });

index
  .command('master-search')
  .description('Search cross-vault master index')
  .option('-r, --root <path>', 'AIMindVaults root path')
  .option('-q, --query <keyword>', 'Keyword search')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--vault <vault>', 'Filter by vault name')
  .option('-f, --format <fmt>', 'Output format: table|compact', 'table')
  .option('-n, --top <n>', 'Max results', '15')
  .option('-c, --concepts-only', 'Show cross-vault concept map only')
  .action(async (opts) => {
    const { masterIndexSearch } = await import('../src/commands/master-index-search.js');
    await masterIndexSearch({ aimindvaultsRoot: opts.root, query: opts.query, tag: opts.tag, vault: opts.vault, format: opts.format, top: parseInt(opts.top), conceptsOnly: opts.conceptsOnly });
  });

// Phase 3: review commands
// program.command('review').description('Post-edit review');

// Phase 4: sync commands
// program.command('sync').description('Workspace sync');

program.parse();
