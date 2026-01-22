import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getCacheInfo, clearCache, isGitRepoCache } from '../utils/cache.js';

export async function infoCommand(): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black(' UI/UX Pro Max Info '));

  const cacheInfo = await getCacheInfo();
  const isGitRepo = await isGitRepoCache();

  console.log();
  p.log.step('Cache Information');
  p.log.message(`  Path: ${chalk.dim(cacheInfo.path)}`);
  p.log.message(`  Status: ${cacheInfo.exists ? chalk.green('cached') : chalk.yellow('not cached')}`);
  
  if (cacheInfo.exists) {
    p.log.message(`  Type: ${isGitRepo ? chalk.green('git repo (can update)') : chalk.yellow('local copy (cannot update)')}`);
  }
  
  if (cacheInfo.meta) {
    p.log.message(`  Version: ${chalk.cyan(cacheInfo.meta.version)}`);
    p.log.message(`  Updated: ${chalk.dim(new Date(cacheInfo.meta.lastUpdated).toLocaleString())}`);
    p.log.message(`  Source: ${chalk.dim(cacheInfo.meta.repoUrl)}`);
  }

  console.log();
  p.outro('');
}

interface ClearOptions {
  yes?: boolean;
}

export async function clearCommand(options: ClearOptions): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black(' UI/UX Pro Max Clear Cache '));

  const cacheInfo = await getCacheInfo();

  if (!cacheInfo.exists) {
    p.log.info('Cache is already empty');
    p.outro('');
    return;
  }

  if (!options.yes) {
    const confirmed = await p.confirm({
      message: `Delete cached data at ${cacheInfo.path}?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Cancelled');
      process.exit(0);
    }
  }

  const spinner = p.spinner();
  spinner.start('Clearing cache...');
  
  await clearCache();
  
  spinner.stop('Cache cleared');

  console.log();
  p.outro(chalk.green('Done!'));
}
