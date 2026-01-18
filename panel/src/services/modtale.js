const config = require("../config");

const MODTALE_API_BASE = "https://api.modtale.net/api/v1";

// API key from environment variable only
const apiKey = config.modtale?.apiKey || null;

// Log API key status
if (apiKey) {
  console.log("[Modtale] API key configured from MODTALE_API_KEY env var");
} else {
  console.log("[Modtale] No API key configured. Set MODTALE_API_KEY environment variable.");
}

/**
 * Check if API is configured
 */
function isConfigured() {
  return !!apiKey;
}

/**
 * Make a request to Modtale API
 */
async function request(endpoint, options = {}) {
  if (!apiKey) {
    throw new Error("Modtale API key not configured");
  }

  const url = `${MODTALE_API_BASE}${endpoint}`;

  const headers = {
    "X-MODTALE-KEY": apiKey
  };

  if (options.method && ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase())) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(error.message || errorText);
  }

  return response.json();
}

/**
 * Transform Modtale version to simpler format
 */
function transformVersion(version) {
  return {
    id: String(version.id || ""),
    version: String(version.version || version.versionNumber || ""),
    downloads: Number(version.downloadCount || version.downloads || 0),
    gameVersion: String(version.gameVersion || (version.gameVersions?.[0]) || ""),
    releaseDate: String(version.createdAt || version.releaseDate || ""),
    fileSize: Number(version.fileSize || version.size || 0),
    fileName: String(version.fileName || version.file || "")
  };
}

/**
 * Transform Modtale project to simpler format
 */
function transformProject(project) {
  const versions = Array.isArray(project.versions)
    ? project.versions.map(transformVersion)
    : [];

  return {
    id: String(project.id || ""),
    slug: String(project.slug || project.id || ""),
    title: String(project.title || project.name || ""),
    description: String(project.description || ""),
    shortDescription: project.shortDescription
      ? String(project.shortDescription)
      : String(project.description || "").substring(0, 200),
    classification: project.classification || "PLUGIN",
    author: typeof project.author === "string"
      ? project.author
      : project.author?.displayName || project.author?.username || "Unknown",
    downloads: Number(project.downloadCount || project.downloads || 0),
    rating: Number(project.rating || project.averageRating || 0),
    iconUrl: project.imageUrl || project.iconUrl || null,
    versions,
    latestVersion: versions[0] || null,
    createdAt: String(project.createdAt || ""),
    updatedAt: String(project.updatedAt || "")
  };
}

/**
 * Map sort field to Modtale API sort enum
 * API supports: relevance, downloads, updated, newest, rating, favorites
 */
function mapSortField(sortBy) {
  const mapping = {
    relevance: "relevance",
    downloads: "downloads",
    updated: "updated",
    newest: "newest",
    created: "newest",
    rating: "rating",
    favorites: "favorites"
  };
  return mapping[sortBy] || "downloads";
}

/**
 * Search projects
 */
async function searchProjects(params = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append("search", params.query);
    if (params.classification) queryParams.append("classification", params.classification);
    if (params.tags?.length) queryParams.append("tags", params.tags.join(","));
    if (params.gameVersion) queryParams.append("gameVersion", params.gameVersion);

    // Pagination - Modtale uses 0-indexed pages
    const page = (params.page ?? 1) - 1;
    queryParams.append("page", String(page));
    queryParams.append("size", String(params.pageSize ?? 20));

    // Sorting - API uses enum values, not field,direction format
    if (params.sortBy) {
      queryParams.append("sort", mapSortField(params.sortBy));
    }

    const query = queryParams.toString();
    const endpoint = `/projects${query ? `?${query}` : ""}`;

    const response = await request(endpoint);

    // Handle Spring Data paginated response
    if (response && typeof response === "object" && "content" in response) {
      return {
        success: true,
        projects: response.content.map(transformProject),
        total: Number(response.totalElements || response.content.length),
        page: Number(response.number || 0) + 1,
        pageSize: Number(response.size || params.pageSize || 20),
        hasMore: !response.last
      };
    }

    // Handle array response
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
    return { success: false, error: e.message, projects: [] };
  }
}

/**
 * Get single project details
 */
async function getProject(projectId) {
  try {
    const project = await request(`/projects/${projectId}`);
    return { success: true, project: transformProject(project) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get classifications (mod types)
 */
async function getClassifications() {
  try {
    const classifications = await request("/meta/classifications");
    return {
      success: true,
      classifications: classifications.map(c => ({
        id: c,
        name: c.charAt(0) + c.slice(1).toLowerCase()
      }))
    };
  } catch (e) {
    return { success: false, error: e.message, classifications: [] };
  }
}

/**
 * Download mod version as buffer
 * Uses API endpoint: GET /api/v1/projects/{id}/versions/{versionNumber}/download
 */
async function downloadVersion(projectId, versionNumber) {
  try {
    if (!apiKey) {
      throw new Error("Modtale API key not configured");
    }

    const url = `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionNumber}/download`;
    console.log(`[Modtale] Download URL: ${url}`);

    const response = await fetch(url, {
      headers: { "X-MODTALE-KEY": apiKey }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Modtale] Download error: ${errorText}`);
      throw new Error(`Download failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Modtale] Downloaded ${buffer.length} bytes`);

    // Get filename from content-disposition header
    const disposition = response.headers.get("content-disposition");
    let fileName = null;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = match[1].replace(/['"]/g, "");
      }
    }

    return { success: true, buffer, fileName };
  } catch (e) {
    console.error(`[Modtale] Download exception:`, e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  isConfigured,
  searchProjects,
  getProject,
  getClassifications,
  downloadVersion
};
