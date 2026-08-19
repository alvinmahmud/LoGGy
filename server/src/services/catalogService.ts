export type CatalogType = "game" | "movie" | "tv";

export type CatalogSearchResult = {
  providerId: string;
  title: string;
  type: CatalogType;
  year: string;
  imageUrl: string;
};

type CacheEntry = {
  expiresAt: number;
  results: CatalogSearchResult[];
};

type RawgGame = {
  id: number;
  name?: string;
  released?: string | null;
  added?: number;
  background_image?: string | null;
};

type GameCandidate = RawgGame & {
  name: string;
  providerId: string;
};

type TmdbTitle = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  backdrop_path?: string | null;
  poster_path?: string | null;
};

type TmdbResponse = {
  results?: TmdbTitle[];
};

const MAX_RESULTS = 15;
const GAME_CANDIDATE_LIMIT = 40;
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const cache = new Map<string, CacheEntry>();

const pokemonVersionGroups = new Map<string, string[]>([
  [
    "Pokémon Red, Blue, Yellow",
    ["Pokémon Red", "Pokémon Blue", "Pokémon Yellow"],
  ],
  ["Pokémon Gold, Silver", ["Pokémon Gold", "Pokémon Silver"]],
  ["Pokémon Crystal Version", ["Pokémon Crystal"]],
  [
    "Pokémon Ruby, Sapphire, Emerald",
    ["Pokémon Ruby", "Pokémon Sapphire", "Pokémon Emerald"],
  ],
  ["Pokémon FireRed, LeafGreen", ["Pokémon FireRed", "Pokémon LeafGreen"]],
  ["Pokémon Diamond, Pearl", ["Pokémon Diamond", "Pokémon Pearl"]],
  ["Pokémon Platinum", ["Pokémon Platinum"]],
  [
    "Pokémon HeartGold, SoulSilver",
    ["Pokémon HeartGold", "Pokémon SoulSilver"],
  ],
  ["Pokémon Black, White", ["Pokémon Black", "Pokémon White"]],
  ["Pokémon Black 2, White 2", ["Pokémon Black 2", "Pokémon White 2"]],
  ["Pokémon X, Y", ["Pokémon X", "Pokémon Y"]],
  [
    "Pokémon Alpha Sapphire, Omega Ruby",
    ["Pokémon Alpha Sapphire", "Pokémon Omega Ruby"],
  ],
  ["Pokémon Sun, Moon", ["Pokémon Sun", "Pokémon Moon"]],
  [
    "Pokémon Ultra Sun, Ultra Moon",
    ["Pokémon Ultra Sun", "Pokémon Ultra Moon"],
  ],
  ["Pokémon Sword and Shield", ["Pokémon Sword", "Pokémon Shield"]],
  [
    "Pokémon Brilliant Diamond, Shining Pearl",
    ["Pokémon Brilliant Diamond", "Pokémon Shining Pearl"],
  ],
  ["Pokémon Scarlet and Violet", ["Pokémon Scarlet", "Pokémon Violet"]],
]);

export class CatalogConfigurationError extends Error {}
export class CatalogProviderError extends Error {}

function releaseYear(date?: string | null) {
  return date?.match(/^\d{4}/)?.[0] || "";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesPartialQuery(title: string, query: string) {
  const titleWords = normalizeSearchText(title).split(" ").filter(Boolean);
  const queryWords = normalizeSearchText(query).split(" ").filter(Boolean);
  let titleWordIndex = 0;

  for (const queryWord of queryWords) {
    while (
      titleWordIndex < titleWords.length &&
      !titleWords[titleWordIndex].startsWith(queryWord)
    ) {
      titleWordIndex += 1;
    }

    if (titleWordIndex >= titleWords.length) return false;
    titleWordIndex += 1;
  }

  return true;
}

function gameRelevance(title: string, query: string) {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedQuery = normalizeSearchText(query);
  const titleWords = normalizedTitle.split(" ").filter(Boolean);
  const queryWords = normalizedQuery.split(" ").filter(Boolean);

  if (normalizedTitle === normalizedQuery) return 4;
  if (normalizedTitle.startsWith(`${normalizedQuery} `)) return 3;
  if (matchesPartialQuery(title, query)) return 2;
  if (
    queryWords.every((queryWord) =>
      titleWords.some((titleWord) => titleWord.startsWith(queryWord)),
    )
  ) {
    return 1;
  }

  return 0;
}

function expandGame(game: RawgGame & { name: string }): GameCandidate[] {
  const versions = pokemonVersionGroups.get(game.name) || [game.name];

  return versions.map((name, index) => ({
    ...game,
    name,
    providerId:
      versions.length > 1 ? `${game.id}:version-${index + 1}` : String(game.id),
  }));
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
    page_size: String(GAME_CANDIDATE_LIMIT),
  });
  const data = await fetchJson<{ results?: RawgGame[] }>(
    `https://api.rawg.io/api/games?${params.toString()}`,
  );

  return (data.results || [])
    .filter((game): game is RawgGame & { name: string } => Boolean(game.name))
    .flatMap(expandGame)
    .map((game) => ({ game, relevance: gameRelevance(game.name, query) }))
    .filter(({ relevance }) => relevance > 0)
    .sort(
      (a, b) =>
        b.relevance - a.relevance || (b.game.added || 0) - (a.game.added || 0),
    )
    .slice(0, MAX_RESULTS)
    .map(({ game }) => ({
      providerId: game.providerId,
      title: game.name,
      type: "game",
      year: releaseYear(game.released),
      imageUrl: game.background_image || "",
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

  const fetchTitles = async (searchQuery: string) => {
    const params = new URLSearchParams({
      query: searchQuery,
      include_adult: "false",
      language: "en-US",
      page: "1",
    });

    const data = await fetchJson<TmdbResponse>(
      `https://api.themoviedb.org/3/search/${type}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    return data.results || [];
  };

  let items = await fetchTitles(query);
  const queryWords = query.trim().split(/\s+/);

  if (!items.length && queryWords.length > 1) {
    const fallbackQuery = queryWords.slice(0, -1).join(" ");
    const fallbackItems = await fetchTitles(fallbackQuery);

    items = fallbackItems.filter((item) => {
      const title = type === "movie" ? item.title : item.name;

      return Boolean(title && matchesPartialQuery(title, query));
    });
  }

  const results: CatalogSearchResult[] = [];
  const sortedItems = [...items].sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0),
  );

  for (const item of sortedItems) {
    const title = type === "movie" ? item.title : item.name;
    const date = type === "movie" ? item.release_date : item.first_air_date;
    if (!title) continue;
    results.push({
      providerId: String(item.id),
      title,
      type,
      year: releaseYear(date),
      imageUrl:
        item.backdrop_path || item.poster_path
          ? `https://image.tmdb.org/t/p/w780${item.backdrop_path || item.poster_path}`
          : "",
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
