import { mkdir, rm, access, cp, mkdtemp, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import type { AIType } from '../types/index.js';
import { AI_FOLDERS } from '../types/index.js';

const execAsync = promisify(exec);

const EXCLUDED_FILES = ['settings.local.json'];

/**
 * Mapping from AI type to the skill source folder in the repo
 * For global install, we need to copy from the correct source location
 */
const GLOBAL_SOURCE_MAPPING: Record<Exclude<AIType, 'all'>, { skillFolder: string; sharedFolder?: string }> = {
  claude: { skillFolder: '.claude/skills/ui-ux-pro-max' },
  antigravity: { skillFolder: '.agent/workflows', sharedFolder: '.shared/ui-ux-pro-max' },
  cursor: { skillFolder: '.cursor/commands', sharedFolder: '.shared/ui-ux-pro-max' },
  windsurf: { skillFolder: '.windsurf/workflows', sharedFolder: '.shared/ui-ux-pro-max' },
  copilot: { skillFolder: '.github/prompts', sharedFolder: '.shared/ui-ux-pro-max' },
  kiro: { skillFolder: '.kiro/steering', sharedFolder: '.shared/ui-ux-pro-max' },
  codex: { skillFolder: '.codex/skills/ui-ux-pro-max' },
  roocode: { skillFolder: '.roo/rules', sharedFolder: '.shared/ui-ux-pro-max' },
  qoder: { skillFolder: '.qoder/skills', sharedFolder: '.shared/ui-ux-pro-max' },
  gemini: { skillFolder: '.gemini/skills/ui-ux-pro-max', sharedFolder: '.shared/ui-ux-pro-max' },
  trae: { skillFolder: '.trae/skills/ui-ux-pro-max', sharedFolder: '.shared/ui-ux-pro-max' },
  opencode: { skillFolder: '.opencode/skills/ui-ux-pro-max', sharedFolder: '.shared/ui-ux-pro-max' },
  continue: { skillFolder: '.continue/skills/ui-ux-pro-max' },
};

export async function extractZip(zipPath: string, destDir: string): Promise<void> {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
    } else {
      await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`);
    }
  } catch (error) {
    throw new Error(`Failed to extract zip: ${error}`);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy folders for local (per-project) installation
 */
export async function copyFolders(
  sourceDir: string,
  targetDir: string,
  aiType: AIType
): Promise<string[]> {
  const copiedFolders: string[] = [];

  const foldersToCopy = aiType === 'all'
    ? Object.values(AI_FOLDERS).flat()
    : AI_FOLDERS[aiType];

  // Deduplicate folders (e.g., .shared might be listed multiple times)
  const uniqueFolders = [...new Set(foldersToCopy)];

  for (const folder of uniqueFolders) {
    const sourcePath = join(sourceDir, folder);
    const targetPath = join(targetDir, folder);

    // Check if source folder exists
    const sourceExists = await exists(sourcePath);
    if (!sourceExists) {
      continue;
    }

    // Create target directory if needed
    await mkdir(targetPath, { recursive: true });

    // Filter function to exclude certain files
    const filterFn = (src: string): boolean => {
      const fileName = basename(src);
      return !EXCLUDED_FILES.includes(fileName);
    };

    // Copy recursively
    try {
      await cp(sourcePath, targetPath, { recursive: true, filter: filterFn });
      copiedFolders.push(folder);
    } catch {
      // Try shell fallback for older Node versions
      try {
        if (process.platform === 'win32') {
          await execAsync(`xcopy "${sourcePath}" "${targetPath}" /E /I /Y`);
        } else {
          await execAsync(`cp -r "${sourcePath}/." "${targetPath}"`);
        }
        copiedFolders.push(folder);
      } catch {
        // Skip if copy fails
      }
    }
  }

  return copiedFolders;
}

/**
 * Copy folders for global installation
 * This copies the skill files and scripts into a single unified directory
 */
export async function copyFoldersGlobal(
  sourceDir: string,
  targetDir: string,
  aiType: AIType
): Promise<string[]> {
  if (aiType === 'all') {
    throw new Error('Global installation is not supported with --ai all');
  }

  const copiedItems: string[] = [];
  const mapping = GLOBAL_SOURCE_MAPPING[aiType];

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true });

  // Filter function to exclude certain files
  const filterFn = (src: string): boolean => {
    const fileName = basename(src);
    return !EXCLUDED_FILES.includes(fileName);
  };

  // Copy the main skill/workflow file(s)
  const skillSourcePath = join(sourceDir, mapping.skillFolder);
  if (await exists(skillSourcePath)) {
    try {
      await cp(skillSourcePath, targetDir, { recursive: true, filter: filterFn });
      copiedItems.push(mapping.skillFolder);
    } catch (error) {
      // Try shell fallback
      if (process.platform === 'win32') {
        await execAsync(`xcopy "${skillSourcePath}" "${targetDir}" /E /I /Y`);
      } else {
        await execAsync(`cp -r "${skillSourcePath}/." "${targetDir}"`);
      }
      copiedItems.push(mapping.skillFolder);
    }
  }

  // Copy the shared folder contents (scripts, data) if it exists
  if (mapping.sharedFolder) {
    const sharedSourcePath = join(sourceDir, mapping.sharedFolder);
    if (await exists(sharedSourcePath)) {
      try {
        await cp(sharedSourcePath, targetDir, { recursive: true, filter: filterFn });
        copiedItems.push(mapping.sharedFolder);
      } catch {
        // Try shell fallback
        if (process.platform === 'win32') {
          await execAsync(`xcopy "${sharedSourcePath}" "${targetDir}" /E /I /Y`);
        } else {
          await execAsync(`cp -r "${sharedSourcePath}/." "${targetDir}"`);
        }
        copiedItems.push(mapping.sharedFolder);
      }
    }
  }

  return copiedItems;
}

export async function cleanup(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Create a temporary directory for extracting ZIP files
 */
export async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'uipro-'));
}

/**
 * Find the extracted folder inside temp directory
 * GitHub release ZIPs often contain a single root folder
 */
async function findExtractedRoot(tempDir: string): Promise<string> {
  const entries = await readdir(tempDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory());

  // If there's exactly one directory, it's likely the extracted root
  if (dirs.length === 1) {
    return join(tempDir, dirs[0].name);
  }

  // Otherwise, assume tempDir itself is the root
  return tempDir;
}

/**
 * Install from a downloaded and extracted ZIP file
 */
export async function installFromZip(
  zipPath: string,
  targetDir: string,
  aiType: AIType,
  isGlobal: boolean = false
): Promise<{ copiedFolders: string[]; tempDir: string }> {
  // Create temp directory
  const tempDir = await createTempDir();

  try {
    // Extract ZIP to temp directory
    await extractZip(zipPath, tempDir);

    // Find the actual root of the extracted content
    const extractedRoot = await findExtractedRoot(tempDir);

    // Copy folders from extracted content to target
    const copiedFolders = isGlobal
      ? await copyFoldersGlobal(extractedRoot, targetDir, aiType)
      : await copyFolders(extractedRoot, targetDir, aiType);

    return { copiedFolders, tempDir };
  } catch (error) {
    // Cleanup on error
    await cleanup(tempDir);
    throw error;
  }
}
