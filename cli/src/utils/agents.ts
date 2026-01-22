import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface AgentConfig {
  name: string;
  displayName: string;
  configFolder: string;
  detectInstalled: () => boolean;
}

const home = homedir();

export const agents: Record<string, AgentConfig> = {
  claude: {
    name: 'claude',
    displayName: 'Claude Code',
    configFolder: 'claude',
    detectInstalled: () => existsSync(join(home, '.claude')),
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    configFolder: 'cursor',
    detectInstalled: () => existsSync(join(home, '.cursor')),
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf',
    configFolder: 'windsurf',
    detectInstalled: () => existsSync(join(home, '.codeium/windsurf')),
  },
  copilot: {
    name: 'copilot',
    displayName: 'GitHub Copilot',
    configFolder: 'copilot',
    detectInstalled: () => existsSync(join(process.cwd(), '.github')),
  },
  kiro: {
    name: 'kiro',
    displayName: 'Kiro',
    configFolder: 'kiro',
    detectInstalled: () => existsSync(join(home, '.kiro')),
  },
  trae: {
    name: 'trae',
    displayName: 'Trae',
    configFolder: 'trae',
    detectInstalled: () => existsSync(join(home, '.trae')),
  },
  opencode: {
    name: 'opencode',
    displayName: 'OpenCode',
    configFolder: 'opencode',
    detectInstalled: () => existsSync(join(home, '.config/opencode')),
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    configFolder: 'codex',
    detectInstalled: () => existsSync(join(home, '.codex')),
  },
  gemini: {
    name: 'gemini',
    displayName: 'Gemini CLI',
    configFolder: 'gemini',
    detectInstalled: () => existsSync(join(home, '.gemini')),
  },
  roocode: {
    name: 'roocode',
    displayName: 'Roo Code',
    configFolder: 'roocode',
    detectInstalled: () => existsSync(join(home, '.roo')),
  },
  qoder: {
    name: 'qoder',
    displayName: 'Qoder',
    configFolder: 'qoder',
    detectInstalled: () => existsSync(join(home, '.qoder')),
  },
  continue: {
    name: 'continue',
    displayName: 'Continue',
    configFolder: 'continue',
    detectInstalled: () => existsSync(join(home, '.continue')),
  },
  codebuddy: {
    name: 'codebuddy',
    displayName: 'CodeBuddy',
    configFolder: 'codebuddy',
    detectInstalled: () => existsSync(join(home, '.codebuddy')),
  },
  agent: {
    name: 'agent',
    displayName: 'Generic Agent',
    configFolder: 'agent',
    detectInstalled: () => existsSync(join(process.cwd(), '.agent')),
  },
};

export function detectInstalledAgents(): string[] {
  const installed: string[] = [];
  
  for (const [name, config] of Object.entries(agents)) {
    if (config.detectInstalled()) {
      installed.push(name);
    }
  }
  
  return installed;
}

export function getAllAgentNames(): string[] {
  return Object.keys(agents);
}
