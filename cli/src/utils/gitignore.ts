import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Python gitignore patterns (single source of truth)
const PYTHON_PATTERNS = [
  '__pycache__/',
  '*.py[cod]',
  '*$py.class',
  '*.pyo',
  '*.pyd',
  '.Python',
  '*.so',
  '.venv/',
  'venv/',
  'ENV/',
];

// Generate gitignore content from patterns
const PYTHON_GITIGNORE = `# Python
${PYTHON_PATTERNS.join('\n')}
`;

/**
 * Add Python gitignore rules to .gitignore file
 * @param projectRoot Root directory of the project
 * @returns true if gitignore was updated, false if already exists or no changes needed
 */
export function addPythonGitignore(projectRoot: string): boolean {
  const gitignorePath = join(projectRoot, '.gitignore');
  
  // Check if Python section already exists
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    
    // Check if any Python pattern already exists (with or without comment)
    const hasPythonPattern = PYTHON_PATTERNS.some(pattern => content.includes(pattern));
    const hasPythonComment = content.includes('# Python');
    
    if (hasPythonPattern || hasPythonComment) {
      return false; // Already exists, no changes needed
    }
    
    // Append Python section to existing file
    const newContent = content.trimEnd() + '\n\n' + PYTHON_GITIGNORE;
    writeFileSync(gitignorePath, newContent, 'utf-8');
    return true;
  } else {
    // Create new .gitignore file with Python section
    writeFileSync(gitignorePath, PYTHON_GITIGNORE, 'utf-8');
    return true;
  }
}
