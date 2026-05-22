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
  return res;
}
