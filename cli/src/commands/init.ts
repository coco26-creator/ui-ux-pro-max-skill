import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import type { AIType, GlobalPathConfig } from '../types/index.js';
import { AI_TYPES, GLOBAL_PATHS, GLOBAL_UNSUPPORTED_MESSAGES } from '../types/index.js';
import { copyFolders, installFromZip, createTempDir, cleanup, copyFoldersGlobal } from '../utils/extract.js';
import { detectAIType, getAITypeDescription } from '../utils/detect.js';
import { logger } from '../utils/logger.js';
import {
  getLatestRelease,
  getAssetUrl,
  downloadRelease,
  GitHubRateLimitError,
  GitHubDownloadError,
} from '../utils/github.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From dist/index.js -> ../assets (one level up to cli/, then assets/)
const ASSETS_DIR = join(__dirname, '..', 'assets');

interface InitOptions {
  ai?: AIType;
  force?: boolean;
  offline?: boolean;
  global?: boolean;
  path?: string;
}

/**
 * Resolve ~ to home directory in path
 */
function expandHomePath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Get the default global path for a provider
 */
function getDefaultGlobalPath(aiType: AIType): string | null {
  if (aiType === 'all') return null;
  const config = GLOBAL_PATHS[aiType];
  if (!config) return null;
  return expandHomePath(config.path);
}

/**
 * Check if provider supports global installation
 */
function supportsGlobal(aiType: AIType): boolean {
  if (aiType === 'all') return false;
  return GLOBAL_PATHS[aiType] !== null;
}

/**
 * Get global config for a provider
 */
function getGlobalConfig(aiType: AIType): GlobalPathConfig | null {
  if (aiType === 'all') return null;
  return GLOBAL_PATHS[aiType];
}

/**
 * YAML frontmatter to add to SKILL.md for providers that need it
 */
const YAML_FRONTMATTER = `---
name: UI/UX Pro Max
description: Comprehensive design guide for web and mobile applications. Contains 50+ styles, 97 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types. Use when the user requests UI/UX work (design, build, create, implement, review, fix, improve).
---

`;

/**
 * Add YAML frontmatter to a skill file if needed
 */
async function ensureYamlFrontmatter(filePath: string): Promise<void> {
  try {
    let content = await readFile(filePath, 'utf-8');
    if (!content.startsWith('---')) {
      content = YAML_FRONTMATTER + content;
      await writeFile(filePath, content, 'utf-8');
    }
  } catch {
    // File doesn't exist or can't be read - skip
  }
}

/**
 * Transform paths in skill files from local relative to global relative
 * For global install, scripts/data are colocated, so we use ./scripts/ instead of ../../.shared/...
 */
async function transformPathsForGlobal(filePath: string): Promise<void> {
  try {
    let content = await readFile(filePath, 'utf-8');

    // Replace relative paths like ../../.shared/ui-ux-pro-max/scripts/ with ./scripts/
    // This works because in global install, scripts and data are in the same directory as SKILL.md
    content = content.replace(/\.\.\/\.\.\/\.shared\/ui-ux-pro-max\//g, './');

    // Also handle any direct .shared/ references
    content = content.replace(/\.shared\/ui-ux-pro-max\//g, './');

    await writeFile(filePath, content, 'utf-8');
  } catch {
    // File doesn't exist or can't be read - skip
  }
}

/**
 * Rename workflow file to expected skill entry file
 */
async function renameToSkillEntry(targetDir: string, config: GlobalPathConfig): Promise<void> {
  const possibleSources = [
    'ui-ux-pro-max.md',
    'workflows/ui-ux-pro-max.md',
    'commands/ui-ux-pro-max.md',
    'skills/ui-ux-pro-max/ui-ux-pro-max.md',
  ];

  for (const source of possibleSources) {
    const sourcePath = join(targetDir, source);
    const destPath = join(targetDir, config.skillEntryFile);

    try {
      await rename(sourcePath, destPath);
      return;
    } catch {
      // Try next source
    }
  }
}

/**
 * Try to install from GitHub release
 * Returns the copied folders if successful, null if failed
 */
async function tryGitHubInstall(
  targetDir: string,
  aiType: AIType,
  spinner: ReturnType<typeof ora>,
  isGlobal: boolean = false
): Promise<string[] | null> {
  let tempDir: string | null = null;

  try {
    spinner.text = 'Fetching latest release from GitHub...';
    const release = await getLatestRelease();
    const assetUrl = getAssetUrl(release);

    if (!assetUrl) {
      throw new GitHubDownloadError('No ZIP asset found in latest release');
    }

    spinner.text = `Downloading ${release.tag_name}...`;
    tempDir = await createTempDir();
    const zipPath = join(tempDir, 'release.zip');

    await downloadRelease(assetUrl, zipPath);

    spinner.text = 'Extracting and installing files...';
    const { copiedFolders, tempDir: extractedTempDir } = await installFromZip(
      zipPath,
      targetDir,
      aiType,
      isGlobal
    );

    // Cleanup temp directory
    await cleanup(extractedTempDir);

    return copiedFolders;
  } catch (error) {
    // Cleanup temp directory on error
    if (tempDir) {
      await cleanup(tempDir);
    }

    if (error instanceof GitHubRateLimitError) {
      spinner.warn('GitHub rate limit reached, using bundled assets...');
      return null;
    }

    if (error instanceof GitHubDownloadError) {
      spinner.warn('GitHub download failed, using bundled assets...');
      return null;
    }

    // Network errors or other fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      spinner.warn('Network error, using bundled assets...');
      return null;
    }

    // Unknown errors - still fall back to bundled assets
    spinner.warn('Download failed, using bundled assets...');
    return null;
  }
}

export async function initCommand(options: InitOptions): Promise<void> {
  logger.title('UI/UX Pro Max Installer');

  let aiType = options.ai;

  // Auto-detect or prompt for AI type
  if (!aiType) {
    const { detected, suggested } = detectAIType();

    if (detected.length > 0) {
      logger.info(`Detected: ${detected.map(t => chalk.cyan(t)).join(', ')}`);
    }

    const response = await prompts({
      type: 'select',
      name: 'aiType',
      message: 'Select AI assistant to install for:',
      choices: AI_TYPES.map(type => ({
        title: getAITypeDescription(type),
        value: type,
      })),
      initial: suggested ? AI_TYPES.indexOf(suggested) : 0,
    });

    if (!response.aiType) {
      logger.warn('Installation cancelled');
      return;
    }

    aiType = response.aiType as AIType;
  }

  // Handle global installation
  let targetDir = process.cwd();
  let isGlobal = false;
  let globalConfig: GlobalPathConfig | null = null;

  if (options.global) {
    // Check if provider supports global installation
    if (aiType === 'all') {
      logger.error('Global installation is not supported with --ai all');
      logger.info('Please specify a single AI provider for global installation');
      process.exit(1);
    }

    if (!supportsGlobal(aiType)) {
      const message = GLOBAL_UNSUPPORTED_MESSAGES[aiType] ||
        `${aiType} does not support global installation. Use local install instead.`;
      logger.error(message);
      process.exit(1);
    }

    globalConfig = getGlobalConfig(aiType);
    isGlobal = true;

    // Resolve target path
    if (options.path) {
      // Custom path provided
      targetDir = expandHomePath(options.path);
    } else {
      // Prompt with default
      const defaultPath = getDefaultGlobalPath(aiType);
      const response = await prompts({
        type: 'text',
        name: 'path',
        message: 'Global installation path:',
        initial: defaultPath || '',
      });

      if (!response.path) {
        logger.warn('Installation cancelled');
        return;
      }

      targetDir = expandHomePath(response.path);
    }

    // Ensure target directory exists
    await mkdir(targetDir, { recursive: true });

    logger.info(`Installing globally to: ${chalk.cyan(targetDir)}`);
  }

  logger.info(`Installing for: ${chalk.cyan(getAITypeDescription(aiType))}`);

  const spinner = ora('Installing files...').start();
  let copiedFolders: string[] = [];
  let usedGitHub = false;

  try {
    // Try GitHub download first (unless offline mode)
    if (!options.offline) {
      const githubResult = await tryGitHubInstall(targetDir, aiType, spinner, isGlobal);
      if (githubResult) {
        copiedFolders = githubResult;
        usedGitHub = true;
      }
    }

    // Fall back to bundled assets if GitHub failed or offline mode
    if (!usedGitHub) {
      spinner.text = 'Installing from bundled assets...';
      if (isGlobal) {
        copiedFolders = await copyFoldersGlobal(ASSETS_DIR, targetDir, aiType);
      } else {
        copiedFolders = await copyFolders(ASSETS_DIR, targetDir, aiType);
      }
    }

    // Post-install transformations for global mode
    if (isGlobal && globalConfig) {
      spinner.text = 'Configuring global skill...';

      // Find the skill markdown file and transform paths
      const skillEntryPath = join(targetDir, globalConfig.skillEntryFile);

      // First try to find and rename the workflow file
      await renameToSkillEntry(targetDir, globalConfig);

      // Add YAML frontmatter if needed
      if (globalConfig.yamlFrontmatter) {
        await ensureYamlFrontmatter(skillEntryPath);
      }

      // Transform paths from local relative to global relative
      await transformPathsForGlobal(skillEntryPath);
    }

    spinner.succeed(usedGitHub ? 'Installed from GitHub release!' : 'Installed from bundled assets!');

    // Summary
    console.log();
    if (isGlobal) {
      logger.info(`Installed to: ${chalk.green(targetDir)}`);
    } else {
      logger.info('Installed folders:');
      copiedFolders.forEach(folder => {
        console.log(`  ${chalk.green('+')} ${folder}`);
      });
    }

    console.log();
    logger.success('UI/UX Pro Max installed successfully!');

    // Next steps
    console.log();
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.dim('  1. Restart your AI coding assistant'));
    console.log(chalk.dim('  2. Try: "Build a landing page for a SaaS product"'));
    if (isGlobal) {
      console.log(chalk.dim('  3. The skill is now available in all your projects'));
    }
    console.log();
  } catch (error) {
    spinner.fail('Installation failed');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
