#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { versionsCommand } from './commands/versions.js';
import { updateCommand } from './commands/update.js';
import { uninstallCommand } from './commands/uninstall.js';
import type { AIType } from './types/index.js';
import { AI_TYPES } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('uipro')
  .description('CLI to install UI/UX Pro Max skill for AI coding assistants')
  .version(pkg.version);

program
  .command('init')
  .description('Install UI/UX Pro Max skill to current project or global directory')
  .option('-a, --ai <type>', `AI assistant type (${AI_TYPES.join(', ')})`)
  .option('-f, --force', 'Overwrite existing files')
  .option('-o, --offline', 'Skip GitHub download, use bundled assets only')
  .option('-g, --global', 'Install to global skills directory instead of local project')
  .option('-p, --path <dir>', 'Custom installation path (only with --global)')
  .action(async (options) => {
    if (options.ai && !AI_TYPES.includes(options.ai)) {
      console.error(`Invalid AI type: ${options.ai}`);
      console.error(`Valid types: ${AI_TYPES.join(', ')}`);
      process.exit(1);
    }
    if (options.path && !options.global) {
      console.error('The --path option can only be used with --global');
      process.exit(1);
    }
    await initCommand({
      ai: options.ai as AIType | undefined,
      force: options.force,
      offline: options.offline,
      global: options.global,
      path: options.path,
    });
  });

program
  .command('versions')
  .description('List available versions')
  .action(versionsCommand);

program
  .command('update')
  .description('Update UI/UX Pro Max to latest version')
  .option('-a, --ai <type>', `AI assistant type (${AI_TYPES.join(', ')})`)
  .action(async (options) => {
    if (options.ai && !AI_TYPES.includes(options.ai)) {
      console.error(`Invalid AI type: ${options.ai}`);
      console.error(`Valid types: ${AI_TYPES.join(', ')}`);
      process.exit(1);
    }
    await updateCommand({
      ai: options.ai as AIType | undefined,
    });
  });

program
  .command('uninstall')
  .description('Uninstall UI/UX Pro Max skill')
  .option('-a, --ai <type>', `AI assistant type (${AI_TYPES.join(', ')})`)
  .option('-g, --global', 'Uninstall from global skills directory')
  .option('-p, --path <dir>', 'Custom path to uninstall from (only with --global)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    if (options.ai && !AI_TYPES.includes(options.ai)) {
      console.error(`Invalid AI type: ${options.ai}`);
      console.error(`Valid types: ${AI_TYPES.join(', ')}`);
      process.exit(1);
    }
    if (options.path && !options.global) {
      console.error('The --path option can only be used with --global');
      process.exit(1);
    }
    await uninstallCommand({
      ai: options.ai as AIType | undefined,
      global: options.global,
      path: options.path,
      force: options.force,
    });
  });

program.parse();
