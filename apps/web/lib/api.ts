const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getToken() {
  return localStorage.getItem("rapid_token");
}

export function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err?.error?.message ?? err?.message ?? "Request failed");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch(path) as Promise<T>,
  post: <T>(path: string, body?: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }) as Promise<T>,
  patch: <T>(path: string, body?: unknown) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }) as Promise<T>,
  delete: <T>(path: string) => apiFetch(path, { method: "DELETE" }) as Promise<T>,
};
