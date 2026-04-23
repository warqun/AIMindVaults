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
program
  .command('review')
  .description('Post-edit UTF-8 validation + auto index build')
  .option('-r, --vault-root <path>', 'Vault root path (auto-detect if omitted)')
  .option('-s, --scope <name>', 'Content scope folder (auto-detect: Contents/Project/docs)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (opts) => {
    const { postEditReview } = await import('../src/commands/post-edit-review.js');
    await postEditReview({ vaultRoot: opts.vaultRoot, scope: opts.scope, verbose: opts.verbose });
  });

// Phase 4: sync commands
program
  .command('sync')
  .description('Workspace sync between vault and Hub')
  .option('-r, --vault-root <path>', 'Vault root path (auto-detect from CWD)')
  .option('--hub-path <path>', 'Hub vault path (auto-detect via .hub_marker)')
  .option('-d, --dry-run', 'Preview changes without executing')
  .option('--no-prune', 'Skip deleting target-only files')
  .option('--verify-content', 'Force file hash verification even if versions match')
  .action(async (opts) => {
    const { syncWorkspace } = await import('../src/commands/sync-workspace.js');
    await syncWorkspace({ vaultRoot: opts.vaultRoot, hubPath: opts.hubPath, dryRun: opts.dryRun, noPrune: opts.noPrune, verifyContent: opts.verifyContent });
  });

program
  .command('pre-sync')
  .description('Auto-update cli-node from Hub, then run sync')
  .option('-r, --vault-root <path>', 'Vault root path')
  .action(async (opts) => {
    const { preSync } = await import('../src/commands/pre-sync.js');
    await preSync({ vaultRoot: opts.vaultRoot });
  });

// Phase 5: clone/broadcast commands
program
  .command('clone')
  .description('Clone vault to a new location')
  .requiredOption('-t, --target-path <path>', 'Destination path for the new vault')
  .option('-n, --project-name <name>', 'Display name (defaults to folder name)')
  .option('-s, --source-path <path>', 'Source vault (auto-detect if omitted)')
  .action(async (opts) => {
    const { cloneVault } = await import('../src/commands/clone-vault.js');
    await cloneVault({ targetPath: opts.targetPath, projectName: opts.projectName, sourcePath: opts.sourcePath });
  });

program
  .command('broadcast')
  .description('Broadcast file from Hub .sync/ to all satellite vaults')
  .requiredOption('-p, --relative-path <path>', 'Path relative to .sync/')
  .option('-d, --dry-run', 'Preview without executing')
  .option('-f, --force', 'Create file even if it does not exist in target')
  .option('-e, --exclude <patterns...>', 'Vault name patterns to skip')
  .option('--vaults-root <path>', 'Vaults/ folder path')
  .action(async (opts) => {
    const { hubBroadcast } = await import('../src/commands/hub-broadcast.js');
    await hubBroadcast({ relativePath: opts.relativePath, dryRun: opts.dryRun, force: opts.force, exclude: opts.exclude, vaultsRoot: opts.vaultsRoot });
  });

// Phase 7: deploy commands
program
  .command('deploy')
  .description('Deploy distribution to SellingVault (cross-platform)')
  .requiredOption('-t, --target <path>', 'Target path (e.g. C:/SellingVault/Korean/AIMindVaults)')
  .option('-s, --source <path>', 'Source AIMindVaults root (auto-detect from CWD)')
  .option('-d, --dry-run', 'Preview changes without executing')
  .option('-f, --force', 'Overwrite protected files (CLAUDE.md, _STATUS.md, etc.)')
  .option('-v, --verbose', 'Show detailed file operations')
  .action(async (opts) => {
    const { deployDist } = await import('../src/commands/deploy-dist.js');
    await deployDist({ source: opts.source, target: opts.target, dryRun: opts.dryRun, force: opts.force, verbose: opts.verbose });
  });

// Phase 6: utility commands
program
  .command('trash-clean')
  .description('Clean .trash/ folders across vaults')
  .option('-v, --vault <names...>', 'Filter by vault names')
  .option('-d, --dry-run', 'Preview without deleting')
  .option('--vaults-root <path>', 'Vaults/ folder path')
  .action(async (opts) => {
    const { trashClean } = await import('../src/commands/trash-clean.js');
    await trashClean({ vault: opts.vault, dryRun: opts.dryRun, vaultsRoot: opts.vaultsRoot });
  });

program
  .command('open')
  .description('Pre-sync then open Obsidian vault')
  .option('-r, --vault-root <path>', 'Vault root path')
  .action(async (opts) => {
    const { openVault } = await import('../src/commands/open-vault.js');
    await openVault({ vaultRoot: opts.vaultRoot });
  });

program
  .command('bridge')
  .description('Obsidian CLI bridge')
  .requiredOption('-a, --action <action>', 'Action: vault-info|search|read|open|append|create|history|plugins-list|post-review|...')
  .option('-r, --vault-root <path>', 'Vault root path')
  .option('--vault-name <name>', 'Vault name')
  .option('-p, --path <path>', 'Note path')
  .option('-q, --query <query>', 'Search query')
  .option('-c, --content <text>', 'Content for append/create')
  .option('--version <n>', 'History version', '1')
  .option('--from <n>', 'Diff from version', '2')
  .option('--to <n>', 'Diff to version', '1')
  .option('-l, --limit <n>', 'Search result limit', '50')
  .option('--plugin-id <id>', 'Plugin ID for install')
  .option('-s, --scope <name>', 'Content scope folder')
  .action(async (opts) => {
    const { obsidianBridge } = await import('../src/commands/obsidian-bridge.js');
    await obsidianBridge({
      action: opts.action, vaultRoot: opts.vaultRoot, vaultName: opts.vaultName,
      path: opts.path, query: opts.query, content: opts.content,
      version: parseInt(opts.version), from: parseInt(opts.from), to: parseInt(opts.to),
      limit: parseInt(opts.limit), pluginId: opts.pluginId, scope: opts.scope,
    });
  });

program
  .command('route')
  .description('Task-to-agent routing')
  .requiredOption('-t, --task <description>', 'Task description')
  .action(async (opts) => {
    const { taskRouter } = await import('../src/commands/task-router.js');
    taskRouter({ task: opts.task });
  });

program
  .command('standards')
  .description('Display _Standards/ directory structure')
  .option('-r, --vault-root <path>', 'Vault root path (auto-detect if omitted)')
  .option('-d, --deep', 'Show subdirectories (NoteTemplates, VaultTypes, Domain)')
  .action(async (opts) => {
    const { checkStandards } = await import('../src/commands/check-standards.js');
    checkStandards({ vaultRoot: opts.vaultRoot, deep: opts.deep });
  });

program.parse();
