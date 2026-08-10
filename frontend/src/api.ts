export type User = {
  id: string;
  email: string;
  username: string;
  picture?: string;
};

export type ApiMediaItem = {
  _id: string;
  title: string;
  type: "movie" | "tv" | "book" | "game";
  status: "backlog" | "in progress" | "completed";
  notes?: string;
  year?: string;
  createdAt: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export const mediaApi = {
  list: () => request<ApiMediaItem[]>("/api/media"),
  create: (item: Omit<ApiMediaItem, "_id" | "createdAt">) =>
    request<ApiMediaItem>("/api/media", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  update: (id: string, changes: Partial<ApiMediaItem>) =>
    request<ApiMediaItem>(`/api/media/${id}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    }),
  remove: (id: string) =>
    request<void>(`/api/media/${id}`, { method: "DELETE" }),
};
