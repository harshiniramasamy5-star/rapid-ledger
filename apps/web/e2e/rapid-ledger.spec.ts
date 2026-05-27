import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password = 'password123') {
  await page.goto('/login');
  await page.getByLabel(/work email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|approvals|audit-log|ledger|admin)/, { timeout: 15000 });
  await page.waitForFunction(() => document.cookie.includes('rapid_token'), { timeout: 10000 });
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
    await page.getByLabel(/work email/i).fill('wrong@rapid.dev');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 8000 });
  });

  test('admin logs in and lands on dashboard', async ({ page }) => {
    await login(page, 'admin@rapid.dev');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('creator logs in and sees New Document button', async ({ page }) => {
    await login(page, 'creator@rapid.dev');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /new document/i })).toBeVisible();
  });

  test('approver logs in and reaches approvals page', async ({ page }) => {
    await login(page, 'approver@rapid.dev');
    await expect(page).toHaveURL(/\/(dashboard|approvals)/, { timeout: 10000 });
  });

  test('admin can navigate to audit log', async ({ page }) => {
    await login(page, 'admin@rapid.dev');
    await page.goto('/audit-log');
    await expect(page).toHaveURL(/\/audit-log/, { timeout: 15000 });
  });

  test('admin can navigate to ledger', async ({ page }) => {
    await login(page, 'admin@rapid.dev');
    await page.goto('/ledger');
    await expect(page).toHaveURL(/\/ledger/, { timeout: 15000 });
  });

});
