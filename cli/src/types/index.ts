export type AIType = 'claude' | 'cursor' | 'windsurf' | 'antigravity' | 'copilot' | 'kiro' | 'roocode' | 'codex' | 'qoder' | 'gemini' | 'trae' | 'opencode' | 'continue' | 'all';

export interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: Asset[];
}

export interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface InstallConfig {
  aiType: AIType;
  version?: string;
  force?: boolean;
}

export const AI_TYPES: AIType[] = ['claude', 'cursor', 'windsurf', 'antigravity', 'copilot', 'roocode', 'kiro', 'codex', 'qoder', 'gemini', 'trae', 'opencode', 'continue', 'all'];

export const AI_FOLDERS: Record<Exclude<AIType, 'all'>, string[]> = {
  claude: ['.claude'],
  cursor: ['.cursor', '.shared'],
  windsurf: ['.windsurf', '.shared'],
  antigravity: ['.agent', '.shared'],
  copilot: ['.github', '.shared'],
  kiro: ['.kiro', '.shared'],
  codex: ['.codex'],
  roocode: ['.roo', '.shared'],
  qoder: ['.qoder', '.shared'],
  gemini: ['.gemini', '.shared'],
  trae: ['.trae', '.shared'],
  opencode: ['.opencode', '.shared'],
  continue: ['.continue'],
};

/**
 * Configuration for global (user-level) skill installation paths.
 * - path: Template path with ~ for home directory
 * - format: How the skill should be structured
 * - yamlFrontmatter: Whether SKILL.md needs YAML frontmatter
 * - skillEntryFile: The expected entry file name for the skill
 */
export interface GlobalPathConfig {
  path: string;
  format: 'skill_folder' | 'prompt_file' | 'markdown';
  yamlFrontmatter: boolean;
  skillEntryFile: string;
}

/**
 * Global installation paths for each AI provider.
 * null = provider uses UI-managed global settings (not supported)
 */
export const GLOBAL_PATHS: Record<Exclude<AIType, 'all'>, GlobalPathConfig | null> = {
  // File-based global paths (supported)
  claude: {
    path: '~/.claude/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  antigravity: {
    path: '~/.gemini/antigravity/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  codex: {
    path: '~/.codex/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  gemini: {
    path: '~/.gemini/extensions/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  trae: {
    path: '~/.trae/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  opencode: {
    path: '~/.config/opencode/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: true,
    skillEntryFile: 'SKILL.md',
  },
  continue: {
    path: '~/.continue/prompts/ui-ux-pro-max',
    format: 'prompt_file',
    yamlFrontmatter: true,
    skillEntryFile: 'ui-ux-pro-max.prompt',
  },
  qoder: {
    path: '~/.qoder/rules/ui-ux-pro-max',
    format: 'markdown',
    yamlFrontmatter: false,
    skillEntryFile: 'ui-ux-pro-max.md',
  },
  kiro: {
    path: '~/.kiro/skills/ui-ux-pro-max',
    format: 'skill_folder',
    yamlFrontmatter: false,
    skillEntryFile: 'ui-ux-pro-max.md',
  },

  // UI-managed global settings (not supported for --global flag)
  cursor: null,   // Uses Cursor Settings UI
  windsurf: null, // Uses Windsurf Settings UI  
  copilot: null,  // Uses VS Code settings.json
  roocode: null,  // Uses VS Code internal storage
};

/**
 * Error messages for providers that don't support global installation
 */
export const GLOBAL_UNSUPPORTED_MESSAGES: Record<string, string> = {
  cursor: 'Cursor manages global rules through its Settings UI. Use local install: uipro init --ai cursor',
  windsurf: 'Windsurf manages global rules through its Settings UI. Use local install: uipro init --ai windsurf',
  copilot: 'GitHub Copilot uses VS Code settings for global config. Use local install: uipro init --ai copilot',
  roocode: 'Roo Code uses VS Code internal storage. Use local install: uipro init --ai roocode',
};
