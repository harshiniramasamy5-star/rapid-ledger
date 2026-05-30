const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearAuth(): void {
  document.cookie = "rapid_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "rapid_role=; path=/; max-age=0; SameSite=Lax";
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

  // Safe response parsing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;

  const text = await res.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new Error(
      data?.error?.message ??
      data?.message ??
      "Request failed"
    );
  }

  return data;
}

export const api = {
  get: <T>(path: string) =>
    apiFetch(path) as Promise<T>,

  post: <T>(path: string, body?: unknown) =>
    apiFetch(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }) as Promise<T>,

  patch: <T>(path: string, body?: unknown) =>
    apiFetch(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }) as Promise<T>,

  delete: <T>(path: string) =>
    apiFetch(path, {
      method: "DELETE",
    }) as Promise<T>,
};
