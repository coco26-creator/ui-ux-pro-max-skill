import { readdir, readFile, mkdir, cp, writeFile, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';

interface FileConfig {
  from: string;
  to: string;
  type: 'copy' | 'template';
  frontmatter?: Record<string, string>;
  vars?: Record<string, string>;
}

interface AgentConfigYaml {
  output: string;
  depends_on?: string[];
  files: FileConfig[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadAgentConfig(agentsDir: string, agentName: string): Promise<AgentConfigYaml | null> {
  const configPath = join(agentsDir, agentName, 'config.yaml');
  
  if (!await exists(configPath)) {
    return null;
  }
  
  const content = await readFile(configPath, 'utf-8');
  return parseYaml(content) as AgentConfigYaml;
}

function processTemplate(content: string, vars: Record<string, string>): string {
  let result = content;
  
  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  
  return result;
}

function generateFrontmatter(frontmatter: Record<string, string>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (typeof value === 'string' && (value.includes(':') || value.includes('"'))) {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

export async function installAgent(
  repoDir: string,
  targetDir: string,
  agentName: string
): Promise<string[]> {
  const agentsDir = join(repoDir, 'agents');
  const changes: string[] = [];
  
  // Check for dependencies (.shared)
  const config = await loadAgentConfig(agentsDir, agentName);
  if (!config) {
    throw new Error(`No config.yaml found for agent: ${agentName}`);
  }
  
  // Install dependencies first
  if (config.depends_on) {
    for (const dep of config.depends_on) {
      const depName = dep.startsWith('.') ? dep : `.${dep}`;
      const depChanges = await installAgentFiles(repoDir, targetDir, depName);
      changes.push(...depChanges);
    }
  }
  
  // Install agent files
  const agentChanges = await installAgentFiles(repoDir, targetDir, agentName);
  changes.push(...agentChanges);
  
  return changes;
}

async function installAgentFiles(
  repoDir: string,
  targetDir: string,
  agentName: string
): Promise<string[]> {
  const agentsDir = join(repoDir, 'agents');
  const changes: string[] = [];
  
  const config = await loadAgentConfig(agentsDir, agentName);
  if (!config) return changes;
  
  for (const file of config.files) {
    const sourcePath = join(repoDir, file.from);
    const targetPath = join(targetDir, config.output, file.to);
    
    // Ensure target directory exists
    await mkdir(dirname(targetPath), { recursive: true });
    
    if (file.type === 'copy') {
      if (await exists(targetPath)) {
        await rm(targetPath, { recursive: true, force: true });
      }
      await cp(sourcePath, targetPath, { recursive: true });
      changes.push(`${config.output}/${file.to}`);
    } else if (file.type === 'template') {
      let content = await readFile(sourcePath, 'utf-8');
      
      if (file.vars) {
        content = processTemplate(content, file.vars);
      }
      
      if (file.frontmatter) {
        content = generateFrontmatter(file.frontmatter) + content;
      }
      
      await writeFile(targetPath, content, 'utf-8');
      changes.push(`${config.output}/${file.to}`);
    }
  }
  
  return changes;
}
