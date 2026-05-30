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

describe('RBAC — document ownership boundary', () => {
  it('non-owner cannot PATCH another users draft document', async () => {
    const creatorToken = await login('creator@rapid.com');
    const auditorToken = await login('auditor@rapid.com');

    const createRes = await fetch(`${API}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({ title: 'Ownership Boundary Test', description: 'rbac ownership test', riskLevel: 'LOW' }),
    });
    expect(createRes.status).toBe(201);
    const doc = await createRes.json();
    const docId = (doc.id ?? doc.document?.id) as string;
    expect(docId).toBeTruthy();

    const patchRes = await fetch(`${API}/documents/${docId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify({ title: 'Hijacked Title' }),
    });
    expect(patchRes.status).toBe(403);
  });

  it('unauthenticated request to documents is rejected with 401', async () => {
    const res = await fetch(`${API}/documents`);
    expect(res.status).toBe(401);
  });

  it('approver cannot create a document', async () => {
    const token = await login('approver@rapid.com');
    const res = await fetch(`${API}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Approver Doc Attempt', description: 'should fail', riskLevel: 'LOW' }),
    });
    expect(res.status).toBe(403);
  });
});
