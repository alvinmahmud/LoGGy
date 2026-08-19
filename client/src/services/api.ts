export type User = {
  id: string;
  email: string;
  username: string;
  picture?: string;
};

export type QueueItem = {
  _id: string;
  title: string;
  type: "game" | "movie" | "tv";
  status: "backlog" | "in progress" | "completed";
  notes?: string;
  year?: string;
  imageUrl?: string;
  createdAt: string;
};

export type CatalogSearchResult = {
  providerId: string;
  title: string;
  type: QueueItem["type"];
  year: string;
  imageUrl: string;
};

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, "");

const API_URL =
  configuredApiUrl ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new ApiError(
      body?.message || "The request could not be completed",
      response.status,
    );
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const authApi = {
  session: () => request<{ user: User }>("/api/auth/me"),
  google: (credential: string) =>
    request<{ user: User }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  register: (username: string, email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  availability: (values: { username?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (values.username) query.set("username", values.username);
    if (values.email) query.set("email", values.email);

    return request<{
      usernameAvailable: boolean | null;
      emailAvailable: boolean | null;
    }>(`/api/auth/availability?${query.toString()}`);
  },
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
};

export const queueApi = {
  list: () => request<QueueItem[]>("/api/queue"),
  create: (item: Omit<QueueItem, "_id" | "createdAt">) =>
    request<QueueItem>("/api/queue", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  update: (id: string, changes: Partial<QueueItem>) =>
    request<QueueItem>(`/api/queue/${id}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    }),
  remove: (id: string) =>
    request<void>(`/api/queue/${id}`, { method: "DELETE" }),
};

export const catalogApi = {
  search: (query: string, type: QueueItem["type"], signal?: AbortSignal) => {
    const params = new URLSearchParams({ q: query, type });

    return request<{ results: CatalogSearchResult[] }>(
      `/api/catalog/search?${params.toString()}`,
      { signal },
    );
  },
};
