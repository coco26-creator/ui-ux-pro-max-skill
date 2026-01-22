import { join } from 'node:path';
import { mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import simpleGit from 'simple-git';

const REPO_URL = 'https://github.com/dacsang97/ui-ux-pro-max-skill.git';
const CACHE_DIR = join(homedir(), '.ui-ux-pro-max');
const META_FILE = join(CACHE_DIR, 'meta.json');

// Cache expires after 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheMeta {
  version: string;
  lastUpdated: string;
  repoUrl: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isGitRepo(path: string): Promise<boolean> {
  return exists(join(path, '.git'));
}

async function readMeta(): Promise<CacheMeta | null> {
  try {
    const content = await readFile(META_FILE, 'utf-8');
    return JSON.parse(content) as CacheMeta;
  } catch {
    return null;
  }
}

async function writeMeta(meta: CacheMeta): Promise<void> {
  await writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
}

async function getLatestCommit(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash?.slice(0, 7) || 'unknown';
}

export interface RepoSource {
  path: string;
  isLocal: boolean;
  version: string;
  fromCache: boolean;
  isGitRepo: boolean;
}

/**
 * Get repo source - either from cache, fresh clone, or local path
 */
export async function getRepoSource(options: { 
  local?: string;
  forceRefresh?: boolean;
}): Promise<RepoSource> {
  // Option 1: Use local path (for development/testing)
  if (options.local) {
    const localPath = options.local;
    
    if (!await exists(join(localPath, 'agents'))) {
      throw new Error(`Invalid local repo: ${localPath} (missing agents/ folder)`);
    }
    
    const version = await getLatestCommit(localPath).catch(() => 'local');
    const isGit = await isGitRepo(localPath);
    
    return {
      path: localPath,
      isLocal: true,
      version,
      fromCache: false,
      isGitRepo: isGit,
    };
  }

  // Option 2: Check cache
  const cacheExists = await exists(join(CACHE_DIR, 'agents'));
  const cacheIsGitRepo = await isGitRepo(CACHE_DIR);
  const meta = await readMeta();
  
  // If cache exists but is not a git repo, treat as local-only (can't update)
  if (cacheExists && !cacheIsGitRepo) {
    return {
      path: CACHE_DIR,
      isLocal: false,
      version: meta?.version || 'local',
      fromCache: true,
      isGitRepo: false,
    };
  }
  
  // If cache is valid and not forcing refresh
  if (cacheExists && cacheIsGitRepo && meta && !options.forceRefresh) {
    const lastUpdated = new Date(meta.lastUpdated).getTime();
    const now = Date.now();
    const isExpired = (now - lastUpdated) > CACHE_TTL_MS;
    
    if (!isExpired) {
      return {
        path: CACHE_DIR,
        isLocal: false,
        version: meta.version,
        fromCache: true,
        isGitRepo: true,
      };
    }
  }

  // Option 3: Clone or pull fresh
  await mkdir(CACHE_DIR, { recursive: true });
  const git = simpleGit();
  
  if (cacheExists && cacheIsGitRepo) {
    // Pull latest
    const repoGit = simpleGit(CACHE_DIR);
    await repoGit.pull('origin', 'main');
  } else {
    // Fresh clone - clean up first
    if (await exists(CACHE_DIR)) {
      await rm(CACHE_DIR, { recursive: true, force: true });
      await mkdir(CACHE_DIR, { recursive: true });
    }
    await git.clone(REPO_URL, CACHE_DIR, ['--depth', '1']);
  }

  // Update meta
  const version = await getLatestCommit(CACHE_DIR);
  await writeMeta({
    version,
    lastUpdated: new Date().toISOString(),
    repoUrl: REPO_URL,
  });

  return {
    path: CACHE_DIR,
    isLocal: false,
    version,
    fromCache: false,
    isGitRepo: true,
  };
}

/**
 * Force refresh the cache
 */
export async function refreshCache(): Promise<RepoSource> {
  return getRepoSource({ forceRefresh: true });
}

/**
 * Get cache info
 */
export async function getCacheInfo(): Promise<{ 
  exists: boolean; 
  meta: CacheMeta | null;
  path: string;
}> {
  const cacheExists = await exists(join(CACHE_DIR, 'agents'));
  const meta = await readMeta();
  
  return {
    exists: cacheExists,
    meta,
    path: CACHE_DIR,
  };
}

/**
 * Clear the cache
 */
export async function clearCache(): Promise<void> {
  if (await exists(CACHE_DIR)) {
    await rm(CACHE_DIR, { recursive: true, force: true });
  }
}

/**
 * Check if cache is a git repo
 */
export async function isGitRepoCache(): Promise<boolean> {
  return isGitRepo(CACHE_DIR);
}
