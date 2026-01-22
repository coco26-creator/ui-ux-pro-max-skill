#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { infoCommand, clearCommand } from './commands/info.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('uipro')
  .description('Install UI/UX Pro Max skill for AI coding assistants')
  .version(pkg.version);

program
  .command('init')
  .description('Install UI/UX Pro Max skill to current project')
  .option('-a, --agent <name>', 'Install for specific agent only')
  .option('-y, --yes', 'Skip prompts and auto-detect agents')
  .option('-l, --local <path>', 'Use local repo path (for development)')
  .option('-r, --refresh', 'Force download latest version')
  .action(async (options) => {
    await initCommand({
      agent: options.agent,
      yes: options.yes,
      local: options.local,
      refresh: options.refresh,
    });
  });

program
  .command('sync')
  .description('Fetch latest version and sync installed skill')
  .option('-l, --local <path>', 'Use local repo path (for development)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    await syncCommand({
      local: options.local,
      yes: options.yes,
    });
  });

program
  .command('info')
  .description('Show cache information')
  .action(async () => {
    await infoCommand();
  });

program
  .command('clear')
  .description('Clear cached data')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    await clearCommand({ yes: options.yes });
  });

program.parse();
