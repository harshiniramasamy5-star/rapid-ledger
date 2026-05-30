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

describe('Finalized document immutability', () => {
  it('cannot PATCH a finalized document', async () => {
    const token = await login('admin@rapid.com');

    // Get list of documents and find a finalized one
    const listRes = await fetch(`${API}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const docs = await listRes.json();
    const finalized = (Array.isArray(docs) ? docs : docs.data ?? [])
      .find((d: any) => d.status === 'finalized');

    if (!finalized) {
      console.error('IMMUTABILITY TEST CANNOT RUN — no finalized document in seed. Add one.');
      expect(finalized).toBeDefined(); // Fails loudly — do not silently skip
    }

    const patchRes = await fetch(`${API}/documents/${finalized.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Tampered by test' }),
    });

    expect(patchRes.status).toBeGreaterThanOrEqual(400);
  });
});
