import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getRepoSource, RepoSource } from '../utils/cache.js';
import { agents, detectInstalledAgents, getAllAgentNames } from '../utils/agents.js';
import { installAgent } from '../utils/installer.js';

interface InitOptions {
  agent?: string;
  yes?: boolean;
  local?: string;
  refresh?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black(' UI/UX Pro Max '));

  try {
    // Determine target agents
    let targetAgents: string[];

    if (options.agent) {
      // Validate agent name
      const validAgents = getAllAgentNames();
      if (!validAgents.includes(options.agent)) {
        p.log.error(`Invalid agent: ${options.agent}`);
        p.log.info(`Valid agents: ${validAgents.join(', ')}`);
        process.exit(1);
      }
      targetAgents = [options.agent];
      p.log.info(`Installing for: ${chalk.cyan(agents[options.agent].displayName)}`);
    } else {
      // Detect installed agents
      const spinner = p.spinner();
      spinner.start('Detecting installed agents...');
      const installedAgents = detectInstalledAgents();
      spinner.stop(`Detected ${installedAgents.length} agent(s)`);

      if (installedAgents.length > 0 && !options.yes) {
        p.log.info(`Found: ${installedAgents.map(a => chalk.cyan(agents[a].displayName)).join(', ')}`);
      }

      if (options.yes) {
        // Auto mode: install for detected agents, or all if none detected
        targetAgents = installedAgents.length > 0 ? installedAgents : getAllAgentNames();
      } else {
        // Interactive mode: let user select
        const allAgentChoices = Object.entries(agents).map(([key, config]) => ({
          value: key,
          label: config.displayName,
          hint: installedAgents.includes(key) ? 'detected' : undefined,
        }));

        const selected = await p.multiselect({
          message: 'Select agents to install for:',
          options: allAgentChoices,
          initialValues: installedAgents.length > 0 ? installedAgents : ['claude'],
          required: true,
        });

        if (p.isCancel(selected)) {
          p.cancel('Installation cancelled');
          process.exit(0);
        }

        targetAgents = selected as string[];
      }
    }

    if (targetAgents.length === 0) {
      p.log.error('No agents selected');
      process.exit(1);
    }

    // Get repo source (from cache, GitHub, or local)
    const sourceSpinner = p.spinner();
    sourceSpinner.start('Loading skill data...');
    
    let source: RepoSource;
    try {
      source = await getRepoSource({
        local: options.local,
        forceRefresh: options.refresh,
      });
    } catch (error) {
      sourceSpinner.stop('Failed to load skill data');
      throw error;
    }

    if (source.isLocal) {
      sourceSpinner.stop(`Using local: ${chalk.dim(source.path)}`);
    } else if (source.fromCache && !source.isGitRepo) {
      sourceSpinner.stop(`Using local cache ${chalk.cyan(source.version)} ${chalk.dim('(not a git repo)')}`);
      p.log.warn(`Cache is not a git repo. Run ${chalk.cyan('uipro clear')} then ${chalk.cyan('uipro init')} to fetch from GitHub.`);
    } else if (source.fromCache) {
      sourceSpinner.stop(`Using cached version ${chalk.cyan(source.version)}`);
    } else {
      sourceSpinner.stop(`Downloaded version ${chalk.cyan(source.version)}`);
    }

    // Install for each agent
    const installSpinner = p.spinner();
    installSpinner.start('Installing skill...');

    const cwd = process.cwd();
    const allChanges: string[] = [];
    const installedAgentNames: string[] = [];

    for (const agentName of targetAgents) {
      try {
        const changes = await installAgent(source.path, cwd, agentName);
        allChanges.push(...changes);
        installedAgentNames.push(agents[agentName].displayName);
      } catch (error) {
        p.log.warn(`Failed to install for ${agents[agentName].displayName}: ${error}`);
      }
    }

    installSpinner.stop('Installation complete');

    // Summary
    console.log();
    p.log.success(chalk.green(`Installed for ${installedAgentNames.length} agent(s):`));
    for (const name of installedAgentNames) {
      p.log.message(`  ${chalk.green('✓')} ${name}`);
    }

    console.log();
    p.log.step('Installed files:');
    const uniqueChanges = [...new Set(allChanges)];
    for (const change of uniqueChanges.slice(0, 10)) {
      p.log.message(`  ${chalk.dim(change)}`);
    }
    if (uniqueChanges.length > 10) {
      p.log.message(`  ${chalk.dim(`... and ${uniqueChanges.length - 10} more`)}`);
    }

    console.log();
    p.outro(chalk.green('Done! Restart your AI coding assistant to use the skill.'));

  } catch (error) {
    p.log.error(error instanceof Error ? error.message : 'Unknown error occurred');
    p.outro(chalk.red('Installation failed'));
    process.exit(1);
  }
}
