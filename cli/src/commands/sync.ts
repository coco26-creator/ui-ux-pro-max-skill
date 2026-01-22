import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getRepoSource } from '../utils/cache.js';
import { isSkillInstalled, detectInstalledAgentsFromMarkers } from '../utils/detect.js';
import { installAgent } from '../utils/installer.js';
import { agents } from '../utils/agents.js';

interface SyncOptions {
  local?: string;
  yes?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black(' UI/UX Pro Max Sync '));

  try {
    const cwd = process.cwd();
    
    // Step 1: Always fetch/update cache
    const sourceSpinner = p.spinner();
    sourceSpinner.start('Fetching latest version...');
    
    const source = await getRepoSource({
      local: options.local,
      forceRefresh: !options.local, // Always refresh unless using local
    });

    if (source.isLocal) {
      sourceSpinner.stop(`Using local: ${chalk.dim(source.path)}`);
    } else if (source.fromCache && !source.isGitRepo) {
      sourceSpinner.stop(`Using local cache ${chalk.cyan(source.version)} ${chalk.dim('(not a git repo)')}`);
      p.log.warn(`Cache is not a git repo. Run ${chalk.cyan('uipro clear')} then ${chalk.cyan('uipro sync')} to fetch from GitHub.`);
    } else if (source.fromCache) {
      sourceSpinner.stop(`Using cached version ${chalk.cyan(source.version)}`);
    } else {
      sourceSpinner.stop(`Downloaded version ${chalk.cyan(source.version)}`);
    }

    // Step 2: Check if skill is installed in current directory
    const skillInstalled = await isSkillInstalled(cwd);
    
    if (!skillInstalled) {
      // Not installed - just updated cache
      console.log();
      p.log.success('Cache updated successfully!');
      p.log.info(`Run ${chalk.cyan('uipro init')} to install the skill to your project.`);
      console.log();
      p.outro(chalk.green('Done!'));
      return;
    }

    // Step 3: Skill is installed - sync files
    const installedAgents = await detectInstalledAgentsFromMarkers(cwd);
    
    if (installedAgents.length === 0) {
      p.log.warn('Could not detect which agents are installed');
      p.outro('');
      return;
    }

    p.log.info(`Found ${installedAgents.length} agent(s) to sync: ${installedAgents.map(a => chalk.cyan(agents[a]?.displayName || a)).join(', ')}`);

    if (!options.yes) {
      const confirmed = await p.confirm({
        message: 'Sync skill files to latest version?',
        initialValue: true,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Sync cancelled');
        process.exit(0);
      }
    }

    // Sync each agent
    const installSpinner = p.spinner();
    installSpinner.start('Syncing skill files...');

    const allChanges: string[] = [];
    const syncedAgents: string[] = [];

    for (const agentName of installedAgents) {
      try {
        const changes = await installAgent(source.path, cwd, agentName);
        allChanges.push(...changes);
        syncedAgents.push(agents[agentName]?.displayName || agentName);
      } catch (error) {
        p.log.warn(`Failed to sync ${agentName}: ${error}`);
      }
    }

    installSpinner.stop('Sync complete');

    // Summary
    console.log();
    p.log.success(chalk.green(`Synced ${syncedAgents.length} agent(s):`));
    for (const name of syncedAgents) {
      p.log.message(`  ${chalk.green('✓')} ${name}`);
    }

    console.log();
    p.log.step(`Updated ${allChanges.length} file(s)`);

    console.log();
    p.outro(chalk.green('Done! Restart your AI coding assistant to use the updated skill.'));

  } catch (error) {
    p.log.error(error instanceof Error ? error.message : 'Unknown error occurred');
    p.outro(chalk.red('Sync failed'));
    process.exit(1);
  }
}
