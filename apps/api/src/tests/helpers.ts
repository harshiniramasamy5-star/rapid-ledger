import { app } from "../index";

export async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  );

  let json: unknown = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}
