import { access } from 'node:fs/promises';
import { join } from 'node:path';

const SKILL_MARKERS = [
  '.claude/skills/ui-ux-pro-max',
  '.cursor/commands/ui-ux-pro-max.md',
  '.windsurf/workflows/ui-ux-pro-max.md',
  '.github/prompts/ui-ux-pro-max.prompt.md',
  '.kiro/steering/ui-ux-pro-max.md',
  '.trae/skills/ui-ux-pro-max',
  '.opencode/skills/ui-ux-pro-max',
  '.codex/skills/ui-ux-pro-max',
  '.gemini/skills/ui-ux-pro-max',
  '.roo/commands/ui-ux-pro-max.md',
  '.qoder/skills/ui-ux-pro-max',
  '.continue/skills/ui-ux-pro-max',
  '.codebuddy/commands/ui-ux-pro-max.md',
  '.agent/workflows/ui-ux-pro-max',
  '.shared/ui-ux-pro-max',
];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current directory has ui-ux-pro-max installed
 * Returns list of installed agent markers
 */
export async function detectInstalledSkill(cwd: string): Promise<string[]> {
  const installed: string[] = [];
  
  for (const marker of SKILL_MARKERS) {
    if (await exists(join(cwd, marker))) {
      installed.push(marker);
    }
  }
  
  return installed;
}

/**
 * Check if skill is installed in current directory
 */
export async function isSkillInstalled(cwd: string): Promise<boolean> {
  const installed = await detectInstalledSkill(cwd);
  return installed.length > 0;
}

/**
 * Detect which agents are installed based on markers
 */
export async function detectInstalledAgentsFromMarkers(cwd: string): Promise<string[]> {
  const markerToAgent: Record<string, string> = {
    '.claude/skills/ui-ux-pro-max': 'claude',
    '.cursor/commands/ui-ux-pro-max.md': 'cursor',
    '.windsurf/workflows/ui-ux-pro-max.md': 'windsurf',
    '.github/prompts/ui-ux-pro-max.prompt.md': 'copilot',
    '.kiro/steering/ui-ux-pro-max.md': 'kiro',
    '.trae/skills/ui-ux-pro-max': 'trae',
    '.opencode/skills/ui-ux-pro-max': 'opencode',
    '.codex/skills/ui-ux-pro-max': 'codex',
    '.gemini/skills/ui-ux-pro-max': 'gemini',
    '.roo/commands/ui-ux-pro-max.md': 'roocode',
    '.qoder/skills/ui-ux-pro-max': 'qoder',
    '.continue/skills/ui-ux-pro-max': 'continue',
    '.codebuddy/commands/ui-ux-pro-max.md': 'codebuddy',
    '.agent/workflows/ui-ux-pro-max': 'agent',
  };
  
  const agents: string[] = [];
  
  for (const marker of SKILL_MARKERS) {
    if (await exists(join(cwd, marker))) {
      const agent = markerToAgent[marker];
      if (agent && !agents.includes(agent)) {
        agents.push(agent);
      }
    }
  }
  
  return agents;
}
