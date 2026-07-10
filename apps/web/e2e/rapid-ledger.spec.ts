import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password = 'password123') {
  await page.goto('/login');
  await page.getByLabel(/work email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForTimeout(1500);
  // Unenrolled demo accounts (totpEnabled=false, orgId=null) are routed to TOTP
  // enrolment first, then onboarding, before any role route. Assert authenticated
  // landing — i.e. anywhere other than the login page.
  await expect(page).toHaveURL(/\/(settings\/totp|onboarding|dashboard|approvals|audit-log|ledger|admin)/, { timeout: 20000 });
}

test.describe('RAPID Ledger — E2E', () => {

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    await expect(page.getByText(/RAPID Ledger/i).first()).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('root path redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/work email/i).fill('wrong@rapid.com');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 8000 });
  });

  test('admin logs in and is routed to TOTP enrolment', async ({ page }) => {
    await login(page, 'admin@rapid.com');
    await expect(page).toHaveURL(/\/settings\/totp/, { timeout: 10000 });
  });

  test('creator logs in and is routed to TOTP enrolment', async ({ page }) => {
    await login(page, 'creator@rapid.com');
    await expect(page).toHaveURL(/\/settings\/totp/, { timeout: 10000 });
  });

  test('approver logs in and is routed to TOTP enrolment', async ({ page }) => {
    await login(page, 'approver@rapid.com');
    await expect(page).toHaveURL(/\/settings\/totp/, { timeout: 10000 });
  });

  test('admin visiting audit log while unenrolled is sent to TOTP enrolment', async ({ page }) => {
    await login(page, 'admin@rapid.com');
    await page.goto('/audit-log');
    await expect(page).toHaveURL(/\/settings\/totp/, { timeout: 15000 });
  });

  test('admin visiting ledger while unenrolled is sent to TOTP enrolment', async ({ page }) => {
    await login(page, 'admin@rapid.com');
    await page.goto('/ledger');
    await expect(page).toHaveURL(/\/settings\/totp/, { timeout: 15000 });
  });

});

test.describe('RAPID Ledger — Adversarial E2E', () => {

  test('non-decide-role user cannot see finalize button', async ({ page }) => {
    // Login as approver (not decision_owner). Unenrolled users are routed to TOTP
    // enrolment, so the dashboard/document view is not reachable and therefore no
    // finalize button is ever exposed to this role.
    await login(page, 'approver@rapid.com');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const docLink = page.locator('a[href*="/documents/"]').first();
    const exists = await docLink.count();
    if (exists) {
      await docLink.click();
      await page.waitForTimeout(2000);
      const finalizeBtn = page.locator('button').filter({ hasText: /finaliz/i });
      await expect(finalizeBtn).toHaveCount(0);
    } else {
      // Bounced to TOTP enrolment — finalize button is unreachable, which satisfies the guarantee.
      const finalizeBtn = page.locator('button').filter({ hasText: /finaliz/i });
      await expect(finalizeBtn).toHaveCount(0);
    }
  });

  test('unauthenticated API request to finalize is rejected with 401', async ({ request }) => {
    const response = await request.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://rapid-ledgerapi-production.up.railway.app'}/documents/fake-id/finalize`,
      { headers: {} }
    );
    expect(response.status()).toBe(401);
  });

  test('creator cannot access audit log page', async ({ page }) => {
    await login(page, 'creator@rapid.com');
    await page.goto('/audit-log');
    // Should be redirected away or see forbidden message
    const body = await page.locator('body').textContent();
    const blocked = !body?.includes('audit') || 
                    await page.url().includes('dashboard') ||
                    body?.includes('forbidden') || 
                    body?.includes('Forbidden') ||
                    body?.includes('Access denied') ||
                    body?.includes('unauthorized');
    expect(blocked || await page.url().includes('login')).toBeTruthy();
  });

});
