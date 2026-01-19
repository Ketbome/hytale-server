import config from '../config/index.js';

const MODTALE_API_BASE = 'https://api.modtale.net/api/v1';

const apiKey = config.modtale?.apiKey || null;

if (apiKey) {
  console.log('[Modtale] API key configured from MODTALE_API_KEY env var');
} else {
  console.log('[Modtale] No API key configured. Set MODTALE_API_KEY environment variable.');
}

export interface ModVersion {
  id: string;
  version: string;
  downloads: number;
  gameVersion: string;
  releaseDate: string;
  fileSize: number;
  fileName: string;
}

export interface ModProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  classification: string;
  author: string;
  downloads: number;
  rating: number;
  iconUrl: string | null;
  versions: ModVersion[];
  latestVersion: ModVersion | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  query?: string;
  classification?: string;
  tags?: string[];
  gameVersion?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}

export interface SearchResult {
  success: boolean;
  projects: ModProject[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  error?: string;
}

export interface ProjectResult {
  success: boolean;
  project?: ModProject;
  error?: string;
}

export interface Classification {
  id: string;
  name: string;
}

export interface ClassificationsResult {
  success: boolean;
  classifications: Classification[];
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  buffer?: Buffer;
  fileName?: string | null;
  error?: string;
}

export function isConfigured(): boolean {
  return !!apiKey;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!apiKey) {
    throw new Error('Modtale API key not configured');
  }

  const url = `${MODTALE_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'X-MODTALE-KEY': apiKey
  };

  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...((options.headers as Record<string, string>) || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error: { message?: string };
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(error.message || errorText);
  }

  return response.json() as Promise<T>;
}

interface ApiVersion {
  id?: number | string;
  version?: string;
  versionNumber?: string;
  downloadCount?: number;
  downloads?: number;
  gameVersion?: string;
  gameVersions?: string[];
  createdAt?: string;
  releaseDate?: string;
  fileSize?: number;
  size?: number;
  fileName?: string;
  file?: string;
}

interface ApiProject {
  id?: number | string;
  slug?: string;
  title?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  classification?: string;
  author?: string | { displayName?: string; username?: string };
  downloadCount?: number;
  downloads?: number;
  rating?: number;
  averageRating?: number;
  imageUrl?: string;
  iconUrl?: string;
  versions?: ApiVersion[];
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedResponse {
  content: ApiProject[];
  totalElements?: number;
  number?: number;
  size?: number;
  last?: boolean;
}

function transformVersion(version: ApiVersion): ModVersion {
  return {
    id: String(version.id || ''),
    version: String(version.version || version.versionNumber || ''),
    downloads: Number(version.downloadCount || version.downloads || 0),
    gameVersion: String(version.gameVersion || version.gameVersions?.[0] || ''),
    releaseDate: String(version.createdAt || version.releaseDate || ''),
    fileSize: Number(version.fileSize || version.size || 0),
    fileName: String(version.fileName || version.file || '')
  };
}

function transformProject(project: ApiProject): ModProject {
  const versions = Array.isArray(project.versions) ? project.versions.map(transformVersion) : [];

  return {
    id: String(project.id || ''),
    slug: String(project.slug || project.id || ''),
    title: String(project.title || project.name || ''),
    description: String(project.description || ''),
    shortDescription: project.shortDescription
      ? String(project.shortDescription)
      : String(project.description || '').substring(0, 200),
    classification: project.classification || 'PLUGIN',
    author:
      typeof project.author === 'string'
        ? project.author
        : project.author?.displayName || project.author?.username || 'Unknown',
    downloads: Number(project.downloadCount || project.downloads || 0),
    rating: Number(project.rating || project.averageRating || 0),
    iconUrl: project.imageUrl || project.iconUrl || null,
    versions,
    latestVersion: versions[0] || null,
    createdAt: String(project.createdAt || ''),
    updatedAt: String(project.updatedAt || '')
  };
}

function mapSortField(sortBy: string): string {
  const mapping: Record<string, string> = {
    relevance: 'relevance',
    downloads: 'downloads',
    updated: 'updated',
    newest: 'newest',
    created: 'newest',
    rating: 'rating',
    favorites: 'favorites'
  };
  return mapping[sortBy] || 'downloads';
}

export async function searchProjects(params: SearchParams = {}): Promise<SearchResult> {
  try {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append('search', params.query);
    if (params.classification) queryParams.append('classification', params.classification);
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
    if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);

    const page = (params.page ?? 1) - 1;
    queryParams.append('page', String(page));
    queryParams.append('size', String(params.pageSize ?? 20));

    if (params.sortBy) {
      queryParams.append('sort', mapSortField(params.sortBy));
    }

    const query = queryParams.toString();
    const endpoint = `/projects${query ? `?${query}` : ''}`;

    const response = await request<PaginatedResponse | ApiProject[]>(endpoint);

    if (response && typeof response === 'object' && 'content' in response) {
      return {
        success: true,
        projects: response.content.map(transformProject),
        total: Number(response.totalElements || response.content.length),
        page: Number(response.number || 0) + 1,
        pageSize: Number(response.size || params.pageSize || 20),
        hasMore: !response.last
      };
    }

    if (Array.isArray(response)) {
      return {
        success: true,
        projects: response.map(transformProject),
        total: response.length,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        hasMore: response.length >= (params.pageSize || 20)
      };
    }

    return {
      success: true,
      projects: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      hasMore: false
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      projects: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false
    };
  }
}

export async function getProject(projectId: string): Promise<ProjectResult> {
  try {
    const project = await request<ApiProject>(`/projects/${projectId}`);
    return { success: true, project: transformProject(project) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getClassifications(): Promise<ClassificationsResult> {
  try {
    const classifications = await request<string[]>('/meta/classifications');
    return {
      success: true,
      classifications: classifications.map((c) => ({
        id: c,
        name: c.charAt(0) + c.slice(1).toLowerCase()
      }))
    };
  } catch (e) {
    return { success: false, error: (e as Error).message, classifications: [] };
  }
}

export async function downloadVersion(projectId: string, versionNumber: string): Promise<DownloadResult> {
  try {
    if (!apiKey) {
      throw new Error('Modtale API key not configured');
    }

    const url = `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionNumber}/download`;
    console.log(`[Modtale] Download URL: ${url}`);

    const response = await fetch(url, {
      headers: { 'X-MODTALE-KEY': apiKey }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Modtale] Download error: ${errorText}`);
      throw new Error(`Download failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Modtale] Downloaded ${buffer.length} bytes`);

    const disposition = response.headers.get('content-disposition');
    let fileName: string | null = null;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    return { success: true, buffer, fileName };
  } catch (e) {
    console.error('[Modtale] Download exception:', (e as Error).message);
    return { success: false, error: (e as Error).message };
  }
}
