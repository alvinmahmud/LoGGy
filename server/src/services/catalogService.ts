export type CatalogType = "game" | "movie" | "tv";

export type CatalogSearchResult = {
  providerId: string;
  title: string;
  type: CatalogType;
  year: string;
};

type CacheEntry = {
  expiresAt: number;
  results: CatalogSearchResult[];
};

type RawgGame = {
  id: number;
  name?: string;
  released?: string | null;
};

type TmdbTitle = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
};

const MAX_RESULTS = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const cache = new Map<string, CacheEntry>();

export class CatalogConfigurationError extends Error {}
export class CatalogProviderError extends Error {}

function releaseYear(date?: string | null) {
  return date?.match(/^\d{4}/)?.[0] || "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new CatalogProviderError(
        `Catalog provider returned HTTP ${response.status}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CatalogProviderError) throw error;
    throw new CatalogProviderError("Catalog provider could not be reached");
  } finally {
    clearTimeout(timeout);
  }
}

async function searchGames(query: string): Promise<CatalogSearchResult[]> {
  const apiKey = process.env.RAWG_API_KEY?.trim();

  if (!apiKey) {
    throw new CatalogConfigurationError("Game search is not configured");
  }

  const params = new URLSearchParams({
    key: apiKey,
    search: query,
    search_precise: "true",
    page_size: String(MAX_RESULTS),
  });
  const data = await fetchJson<{ results?: RawgGame[] }>(
    `https://api.rawg.io/api/games?${params.toString()}`,
  );

  return (data.results || [])
    .filter((game): game is RawgGame & { name: string } => Boolean(game.name))
    .slice(0, MAX_RESULTS)
    .map((game) => ({
      providerId: String(game.id),
      title: game.name,
      type: "game",
      year: releaseYear(game.released),
    }));
}

async function searchTmdb(
  query: string,
  type: "movie" | "tv",
): Promise<CatalogSearchResult[]> {
  const accessToken = process.env.TMDB_API_READ_TOKEN?.trim();

  if (!accessToken) {
    throw new CatalogConfigurationError(
      `${type === "movie" ? "Movie" : "TV show"} search is not configured`,
    );
  }

  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });

  const data = await fetchJson<{ results?: TmdbTitle[] }>(
    `https://api.themoviedb.org/3/search/${type}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const results: CatalogSearchResult[] = [];

  for (const item of data.results || []) {
    const title = type === "movie" ? item.title : item.name;
    const date = type === "movie" ? item.release_date : item.first_air_date;
    if (!title) continue;
    results.push({
      providerId: String(item.id),
      title,
      type,
      year: releaseYear(date),
    });
  }

  return results.slice(0, MAX_RESULTS);
}

export async function searchCatalog(query: string, type: CatalogType) {
  const cacheKey = `${type}:${query.toLocaleLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const results =
    type === "game" ? await searchGames(query) : await searchTmdb(query, type);

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });

  return results;
}
