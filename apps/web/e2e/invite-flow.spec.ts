import { test, expect } from '@playwright/test';

// API-level E2E for the invite flow. Deliberately bypasses the UI and the
// real inbox (Resend) — invite creation returns the token directly in the
// API response, which is enough to exercise the full server-side chain:
// invite → token → join org → role assignment. Email delivery itself is a
// Resend concern, not app logic, so it's out of scope here.
//
// Depends on seed.ts fixtures:
//   admin@rapid.com    — existing member of the Complyance org, accessType=admin
//   invitee@rapid.com  — org-less user, reset to orgId=null on every seed run

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rapid-ledgerapi-production.up.railway.app';

async function apiLogin(request: import('@playwright/test').APIRequestContext, email: string) {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: 'password123' },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.token).toBeTruthy();
  return { token: body.token as string, user: body.user as { id: string; orgId: string | null } };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.describe('Invite flow — E2E (API)', () => {
  let adminToken: string;
  let orgId: string;
  let inviteToken: string;
  let inviteeUserId: string;

  test.beforeAll(async ({ request }) => {
    const admin = await apiLogin(request, 'admin@rapid.com');
    adminToken = admin.token;
    expect(admin.user.orgId).toBeTruthy();
    orgId = admin.user.orgId!;

    const invitee = await apiLogin(request, 'invitee@rapid.com');
    inviteeUserId = invitee.user.id;
    // Fixture contract: invitee must start org-less for this suite to be meaningful.
    expect(invitee.user.orgId).toBeNull();
  });

  test.afterAll(async ({ request }) => {
    // Reset invitee back to org-less so the suite is re-runnable without
    // waiting for the next seed run.
    await request.delete(`${API_URL}/orgs/${orgId}/members/${inviteeUserId}`, {
      headers: authHeaders(adminToken),
    });
  });

  test('admin creates an invite for the org-less user', async ({ request }) => {
    const res = await request.post(`${API_URL}/orgs/${orgId}/invite`, {
      headers: authHeaders(adminToken),
      data: { email: 'invitee@rapid.com', role: 'approver' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.invite.email).toBe('invitee@rapid.com');
    expect(body.invite.token).toBeTruthy();
    inviteToken = body.invite.token;
  });

  test('invitee sees the pending invite via /orgs/invites/me', async ({ request }) => {
    const invitee = await apiLogin(request, 'invitee@rapid.com');
    const res = await request.get(`${API_URL}/orgs/invites/me`, {
      headers: authHeaders(invitee.token),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const match = body.invites.find((i: { token: string }) => i.token === inviteToken);
    expect(match).toBeTruthy();
    expect(match.orgId).toBe(orgId);
    expect(match.role).toBe('approver');
  });

  test('a token issued for a different email is rejected with 403', async ({ request }) => {
    // Sanity check the email-binding guard before testing the happy path,
    // so a false positive on the real join can't slip through.
    const otherInviteRes = await request.post(`${API_URL}/orgs/${orgId}/invite`, {
      headers: authHeaders(adminToken),
      data: { email: 'someone-else@rapid.com', role: 'viewer' },
    });
    const otherInvite = await otherInviteRes.json();

    const invitee = await apiLogin(request, 'invitee@rapid.com');
    const res = await request.post(`${API_URL}/orgs/join/${otherInvite.invite.token}`, {
      headers: authHeaders(invitee.token),
    });
    expect(res.status()).toBe(403);

    // Clean up the throwaway invite so it doesn't linger.
    await request.delete(`${API_URL}/orgs/${orgId}/invites/${otherInvite.invite.id}`, {
      headers: authHeaders(adminToken),
    });
  });

  test('invitee joins the org via the correct token and receives the assigned role', async ({ request }) => {
    const invitee = await apiLogin(request, 'invitee@rapid.com');
    const res = await request.post(`${API_URL}/orgs/join/${inviteToken}`, {
      headers: authHeaders(invitee.token),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.orgId).toBe(orgId);

    // Re-login to pick up the updated orgId/role on the JWT-backed profile.
    const refreshed = await apiLogin(request, 'invitee@rapid.com');
    expect(refreshed.user.orgId).toBe(orgId);

    const membersRes = await request.get(`${API_URL}/orgs/${orgId}/members`, {
      headers: authHeaders(adminToken),
    });
    const membersBody = await membersRes.json();
    const member = membersBody.members.find((m: { email: string }) => m.email === 'invitee@rapid.com');
    expect(member).toBeTruthy();
    expect(member.role).toBe('approver');
    expect(member.accessType).toBe('member');
  });

  test('reusing the same invite token a second time is rejected with 410', async ({ request }) => {
    const invitee = await apiLogin(request, 'invitee@rapid.com');
    const res = await request.post(`${API_URL}/orgs/join/${inviteToken}`, {
      headers: authHeaders(invitee.token),
    });
    expect(res.status()).toBe(410);
  });

  test('admin can promote the newly joined member to admin', async ({ request }) => {
    const res = await request.patch(`${API_URL}/orgs/${orgId}/members/${inviteeUserId}`, {
      headers: authHeaders(adminToken),
      data: { role: 'admin' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('admin');
  });
});
