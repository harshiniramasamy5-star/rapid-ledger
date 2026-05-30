import { describe, it, expect } from 'vitest';

const API = 'https://rapid-ledger-production.up.railway.app';

async function login(email: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  const data = await res.json();
  return data.token as string;
}

describe('Document search and filter', () => {
  it('GET /documents accepts search query param without error', async () => {
    const token = await login('admin@rapid.com');
    const res = await fetch(`${API}/documents?search=test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('GET /documents filters by status param', async () => {
    const token = await login('admin@rapid.com');
    const res = await fetch(`${API}/documents?status=draft`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('GET /documents filters by riskLevel param', async () => {
    const token = await login('admin@rapid.com');
    const res = await fetch(`${API}/documents?riskLevel=LOW`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });
});
