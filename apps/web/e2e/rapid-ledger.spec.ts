import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// Helper — login as a given user
async function login(page: any, email: string, password = 'password123') {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/work email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /continue/i }).click();
}

test.describe('RAPID Ledger E2E', () => {

  // ─── AUTH ───────────────────────────────────────────────────────────────

  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    await expect(page.getByText(/RAPID Ledger/i).first()).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/work email/i).fill('wrong@rapid.com');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin logs in and lands on dashboard', async ({ page }) => {
    await login(page, 'admin@rapid.com');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test('approver logs in and lands on approvals', async ({ page }) => {
    await login(page, 'approver@rapid.com');
    await expect(page).toHaveURL(/\/approvals/, { timeout: 8000 });
  });

  test('auditor logs in and lands on audit-log', async ({ page }) => {
    await login(page, 'auditor@rapid.com');
    await expect(page).toHaveURL(/\/audit-log/, { timeout: 8000 });
  });

  // ─── ROLE-BASED REDIRECT ────────────────────────────────────────────────

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('root path redirects to login when not authenticated', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  // ─── DASHBOARD ──────────────────────────────────────────────────────────

  test('creator sees dashboard with New Document button', async ({ page }) => {
    await login(page, 'creator@rapid.com');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
    await expect(page.getByRole('button', { name: /new document/i })).toBeVisible();
  });

  // ─── LOGOUT / SESSION ───────────────────────────────────────────────────

  test('page title contains RAPID Ledger', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveTitle(/rapid ledger/i, { timeout: 5000 });
  });

});
