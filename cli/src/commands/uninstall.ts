import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import type { AIType } from '../types/index.js';
import { AI_TYPES, AI_FOLDERS, GLOBAL_PATHS, GLOBAL_UNSUPPORTED_MESSAGES } from '../types/index.js';
import { getAITypeDescription } from '../utils/detect.js';
import { logger } from '../utils/logger.js';

interface UninstallOptions {
    ai?: AIType;
    global?: boolean;
    path?: string;
    force?: boolean;
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

export async function uninstallCommand(options: UninstallOptions): Promise<void> {
    logger.title('UI/UX Pro Max Uninstaller');

    let aiType = options.ai;

    // Prompt for AI type if not provided
    if (!aiType) {
        const response = await prompts({
            type: 'select',
            name: 'aiType',
            message: 'Select AI assistant to uninstall from:',
            choices: AI_TYPES.filter(t => t !== 'all').map(type => ({
                title: getAITypeDescription(type),
                value: type,
            })),
        });

        if (!response.aiType) {
            logger.warn('Uninstall cancelled');
            return;
        }

        aiType = response.aiType as AIType;
    }

    if (aiType === 'all') {
        logger.error('Uninstall with --ai all is not supported. Please specify a single provider.');
        process.exit(1);
    }

    let targetDir: string;
    let foldersToRemove: string[];

    if (options.global) {
        // Global uninstall
        const config = GLOBAL_PATHS[aiType];

        if (config === null) {
            const message = GLOBAL_UNSUPPORTED_MESSAGES[aiType] ||
                `${aiType} does not support global installation.`;
            logger.error(message);
            process.exit(1);
        }

        if (options.path) {
            targetDir = expandHomePath(options.path);
        } else {
            targetDir = getDefaultGlobalPath(aiType) || '';
        }

        if (!targetDir) {
            logger.error('Could not determine global path for ' + aiType);
            process.exit(1);
        }

        foldersToRemove = [targetDir];
        logger.info(`Uninstalling from global path: ${chalk.cyan(targetDir)}`);
    } else {
        // Local uninstall
        targetDir = process.cwd();
        foldersToRemove = AI_FOLDERS[aiType].map(folder => join(targetDir, folder));
        logger.info(`Uninstalling from: ${chalk.cyan(targetDir)}`);
    }

    // Confirm before proceeding (unless --force)
    if (!options.force) {
        const response = await prompts({
            type: 'confirm',
            name: 'confirm',
            message: `This will remove:\n${foldersToRemove.map(f => `  - ${f}`).join('\n')}\n\nContinue?`,
            initial: false,
        });

        if (!response.confirm) {
            logger.warn('Uninstall cancelled');
            return;
        }
    }

    const spinner = ora('Removing files...').start();

    try {
        for (const folder of foldersToRemove) {
            await rm(folder, { recursive: true, force: true });
        }

        spinner.succeed('Files removed!');
        console.log();
        logger.success('UI/UX Pro Max uninstalled successfully!');
        console.log();
    } catch (error) {
        spinner.fail('Uninstall failed');
        if (error instanceof Error) {
            logger.error(error.message);
        }
        process.exit(1);
    }
}
