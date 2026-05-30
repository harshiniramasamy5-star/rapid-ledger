import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@rapid.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });

  test('dashboard renders document list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard|documents/i })).toBeVisible();
  });

  test('audit log page is accessible', async ({ page }) => {
    await page.goto('/audit-log');
    await expect(page).not.toHaveURL(/login/);
  });

  test('ledger page is accessible', async ({ page }) => {
    await page.goto('/ledger');
    await expect(page).not.toHaveURL(/login/);
  });
});
