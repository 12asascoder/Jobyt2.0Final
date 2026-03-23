/**
 * Roadmap Source Loader
 *
 * Two-level strategy:
 *   1. Primary: Fetch from GitHub raw content (kamranahmedse/developer-roadmap)
 *   2. Fallback: Scrape roadmap.sh pages for basic structure
 *
 * Includes retry with exponential backoff, timeout handling, structured logging.
 */

// Curated list of well-known roadmaps from roadmap.sh
export const ROADMAP_SLUGS = [
  'frontend',
  'backend',
  'devops',
  'full-stack',
  'ai-data-scientist',
  'android',
  'ios',
  'postgresql-dba',
  'blockchain',
  'qa',
  'software-architect',
  'cyber-security',
  'ux-design',
  'react',
  'angular',
  'vue',
  'nodejs',
  'typescript',
  'javascript',
  'python',
  'java',
  'golang',
  'rust',
  'cpp',
  'docker',
  'kubernetes',
  'aws',
  'linux',
  'mongodb',
  'graphql',
  'sql',
  'git-github',
  'system-design',
  'api-design',
  'software-design-architecture',
  'mlops',
  'data-analyst',
  'devrel',
  'technical-writer',
  'game-developer',
  'server-side-game-developer',
  'prompt-engineering',
  'computer-science',
  'redis',
  'flutter',
  'react-native',
];

export interface RawRoadmapData {
  slug: string;
  title: string;
  description: string;
  source_url: string;
  nodes: RawNode[];
  edges: RawEdge[];
  loadedFrom: 'github' | 'scrape';
}

export interface RawNode {
  id: string;
  title: string;
  description: string;
  type: string;
  parentId: string | null;
  positionX: number;
  positionY: number;
  children: RawNode[];
}

export interface RawEdge {
  sourceId: string;
  targetId: string;
}

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const logs: LogEntry[] = [];

function log(level: LogEntry['level'], message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), data };
  logs.push(entry);
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [RoadmapLoader] ${message}`, data ? JSON.stringify(data) : '');
}

export function getLoaderLogs(): LogEntry[] {
  return [...logs];
}

export function clearLoaderLogs(): void {
  logs.length = 0;
}

/**
 * Fetch JSON from URL with retry and timeout.
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  timeoutMs: number = 15000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isAbort = lastError.name === 'AbortError';

      log('warn', `Attempt ${attempt}/${maxRetries} failed for ${url}`, {
        error: lastError.message,
        isTimeout: isAbort,
      });

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

/**
 * Generate a slug from title.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

/**
 * Load from GitHub: tries fetching the roadmap content from the developer-roadmap repo.
 * Returns structured data or null if fetch fails.
 */
async function loadFromGitHub(slug: string): Promise<RawRoadmapData | null> {
  const baseUrl = `https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master`;

  try {
    // Try to load the roadmap JSON metadata
    const metaUrl = `${baseUrl}/src/data/roadmaps/${slug}/${slug}.md`;
    log('info', `Loading roadmap metadata from GitHub: ${slug}`, { url: metaUrl });

    const metaResponse = await fetchWithRetry(metaUrl, 2, 10000);
    const metaContent = await metaResponse.text();

    // Parse frontmatter from the markdown file
    const title = extractFrontmatterField(metaContent, 'title') || formatTitle(slug);
    const description =
      extractFrontmatterField(metaContent, 'description') || `${formatTitle(slug)} roadmap`;

    // Try to load content-paths.json for node hierarchy
    let nodes: RawNode[] = [];
    let edges: RawEdge[] = [];

    try {
      const contentUrl = `${baseUrl}/src/data/roadmaps/${slug}/content-paths.json`;
      const contentResponse = await fetchWithRetry(contentUrl, 2, 10000);
      const contentPaths = await contentResponse.json();

      // Parse content paths into nodes
      const parsed = parseContentPaths(contentPaths as Record<string, string>, slug);
      nodes = parsed.nodes;
      edges = parsed.edges;
    } catch {
      log('warn', `No content-paths.json for ${slug}, generating basic structure`);
      nodes = generateBasicNodes(slug, title);
    }

    const sourceUrl = `https://roadmap.sh/${slug}`;

    log('info', `Successfully loaded ${slug} from GitHub`, {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    return {
      slug,
      title,
      description,
      source_url: sourceUrl,
      nodes,
      edges,
      loadedFrom: 'github',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('warn', `GitHub load failed for ${slug}: ${message}`);
    return null;
  }
}

/**
 * Extract a frontmatter field from markdown content.
 */
function extractFrontmatterField(content: string, field: string): string | null {
  const match = content.match(new RegExp(`^${field}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'));
  return match ? match[1].trim() : null;
}

/**
 * Format a slug into a human-readable title.
 */
function formatTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parse content-paths.json into hierarchical nodes.
 * Content paths look like: { "100-topic/101-subtopic": "/path/to/content.md" }
 */
function parseContentPaths(
  paths: Record<string, string>,
  _roadmapSlug: string,
): { nodes: RawNode[]; edges: RawEdge[] } {
  const nodes: RawNode[] = [];
  const edges: RawEdge[] = [];
  const nodeMap = new Map<string, RawNode>();

  const sortedKeys = Object.keys(paths).sort();

  for (const key of sortedKeys) {
    const parts = key.split('/');
    let parentId: string | null = null;

    for (let i = 0; i < parts.length; i++) {
      const partPath = parts.slice(0, i + 1).join('/');
      if (nodeMap.has(partPath)) {
        parentId = partPath;
        continue;
      }

      const part = parts[i];
      const title = cleanNodeTitle(part);
      const nodeId = partPath;
      const posY = i * 100;
      const matches = part.match(/^(\d+)/);
      const sortOrder = matches ? parseInt(matches[1], 10) : 0;

      const node: RawNode = {
        id: nodeId,
        title,
        description: '',
        type: i === 0 ? 'category' : 'topic',
        parentId,
        positionX: 0,
        positionY: posY,
        children: [],
      };

      nodeMap.set(nodeId, node);
      nodes.push(node);

      // Create edge from parent to child
      if (parentId) {
        edges.push({ sourceId: parentId, targetId: nodeId });
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }

      // Assign sort order from numeric prefix
      node.positionX = sortOrder;
      parentId = nodeId;
    }
  }

  // Create sequential edges between top-level categories
  const topLevel = nodes.filter((n) => n.parentId === null);
  for (let i = 0; i < topLevel.length - 1; i++) {
    edges.push({ sourceId: topLevel[i].id, targetId: topLevel[i + 1].id });
  }

  return { nodes, edges };
}

/**
 * Clean up node title from path segment like "100-html-css" => "HTML CSS"
 */
function cleanNodeTitle(segment: string): string {
  // Remove numeric prefix
  const withoutPrefix = segment.replace(/^\d+-/, '');
  // Convert to title case
  return withoutPrefix
    .split('-')
    .map((w) => {
      // Known abbreviations
      const upper = w.toUpperCase();
      if (['html', 'css', 'js', 'api', 'sql', 'nosql', 'orm', 'cdn', 'dns', 'http', 'https',
           'ssh', 'ssl', 'tls', 'tcp', 'udp', 'ip', 'dom', 'ci', 'cd', 'ui', 'ux', 'seo',
           'jwt', 'oauth', 'rest', 'graphql', 'grpc', 'aws', 'gcp', 'cli', 'ide', 'git',
           'npm', 'dba', 'ai', 'ml', 'llm'].includes(w.toLowerCase())) {
        return upper;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/**
 * Generate basic node structure for a roadmap when content-paths is unavailable.
 */
function generateBasicNodes(slug: string, title: string): RawNode[] {
  const rootNode: RawNode = {
    id: `${slug}-root`,
    title,
    description: `Root node for ${title} roadmap`,
    type: 'root',
    parentId: null,
    positionX: 0,
    positionY: 0,
    children: [],
  };

  return [rootNode];
}

/**
 * Fallback loader: Scrape basic info from roadmap.sh page.
 */
async function loadFromScrape(slug: string): Promise<RawRoadmapData | null> {
  const url = `https://roadmap.sh/${slug}`;

  try {
    log('info', `Attempting scrape fallback for ${slug}`, { url });

    const response = await fetchWithRetry(url, 2, 15000);
    const html = await response.text();

    // Extract title from <title> tag or <h1>
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s*[-–|].*$/, '').trim()
      : formatTitle(slug);

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const description = descMatch ? descMatch[1] : `${title} developer roadmap`;

    // Create a basic structure since scraping full node data is limited
    const nodes = generateBasicNodes(slug, title);

    log('info', `Successfully scraped ${slug}`, { title, nodeCount: nodes.length });

    return {
      slug,
      title,
      description,
      source_url: url,
      nodes,
      edges: [],
      loadedFrom: 'scrape',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', `Scrape fallback failed for ${slug}: ${message}`);
    return null;
  }
}

/**
 * Load a single roadmap using the two-level strategy.
 */
export async function loadRoadmap(slug: string): Promise<RawRoadmapData | null> {
  // Try GitHub first
  let data = await loadFromGitHub(slug);

  // Fallback to scraping
  if (!data) {
    log('info', `Falling back to scrape for ${slug}`);
    data = await loadFromScrape(slug);
  }

  if (!data) {
    log('error', `All loading strategies failed for ${slug}`);
  }

  return data;
}

/**
 * Load all curated roadmaps.
 */
export async function loadAllRoadmaps(): Promise<RawRoadmapData[]> {
  log('info', `Starting to load ${ROADMAP_SLUGS.length} roadmaps`);
  clearLoaderLogs();

  const results: RawRoadmapData[] = [];
  let successCount = 0;
  let failCount = 0;

  // Process sequentially to avoid rate limiting
  for (const slug of ROADMAP_SLUGS) {
    try {
      const data = await loadRoadmap(slug);
      if (data) {
        results.push(data);
        successCount++;
      } else {
        failCount++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('error', `Unexpected error loading ${slug}: ${message}`);
      failCount++;
    }
  }

  log('info', `Roadmap loading complete`, {
    total: ROADMAP_SLUGS.length,
    success: successCount,
    failed: failCount,
  });

  return results;
}

/**
 * Get all curated roadmap slugs.
 */
export function getRoadmapSlugs(): string[] {
  return [...ROADMAP_SLUGS];
}

export { slugify };
