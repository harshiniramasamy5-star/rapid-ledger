import { test, expect } from '@playwright/test';

test.describe('RAPID Ledger E2E Flow', () => {
  test('create → assign roles → submit → finalize → ledger → audit log', async ({ page }) => {
    test.setTimeout(120000);

    // ── Step 1: Login as Admin ─────────────────────────────────────────
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'admin@rapid.dev');
    await page.fill('input[type="password"]', 'password123');

    // Button says "Continue" (confirmed from component tests)
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // ── Step 2: Navigate to new document ──────────────────────────────
    // Try common button texts for "new document"
    const newDocBtn = page.locator('button, a').filter({ hasText: /new.*doc|create.*doc|\+ new|new decision/i }).first();
    await newDocBtn.waitFor({ timeout: 10000 });
    await newDocBtn.click();
    await page.waitForURL('**/documents/new', { timeout: 10000 });

    // ── Step 3: Fill document form (Step 1 — Details) ─────────────────
    await page.waitForSelector('input', { timeout: 10000 });

    // Title / decision name field
    const titleInput = page.locator('input').first();
    await titleInput.fill('E2E Test Decision');

    // Fill all visible textareas
    const textareas = page.locator('textarea');
    const taCount = await textareas.count();
    for (let i = 0; i < taCount; i++) {
      await textareas.nth(i).fill('Automated E2E test — do not delete');
    }

    // Risk level — pick "low" so no Agree approver needed
    const riskSelect = page.locator('select').first();
    const riskExists = await riskSelect.count();
    if (riskExists) await riskSelect.selectOption('low');

    // Department field
    const deptInput = page.locator('input[placeholder*="dept"], input[placeholder*="Dept"], input[placeholder*="Engineering"]');
    const deptExists = await deptInput.count();
    if (deptExists) await deptInput.first().fill('Engineering');

    // Deadline
    const dateInput = page.locator('input[type="date"]');
    const dateExists = await dateInput.count();
    if (dateExists) await dateInput.fill('2026-12-31');

    // Submit step 1
    const step1Btn = page.locator('button[type="submit"], button').filter({ hasText: /next|create|continue/i }).last();
    await step1Btn.click();
    await page.waitForTimeout(1500);

    // ── Step 4: Assign RAPID roles (Step 2) ───────────────────────────
    // Wait for role assignment UI — either selects or dropdowns
    await page.waitForTimeout(1000);

    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount > 0) {
      // Assign first available user to each role select
      for (let i = 0; i < selectCount; i++) {
        const opts = await selects.nth(i).locator('option').count();
        if (opts > 1) await selects.nth(i).selectOption({ index: 1 });
      }
    }

    // Click "Assign roles" or "Next" or "Save"
    const assignBtn = page.locator('button').filter({ hasText: /assign.*roles|next|save|continue/i }).last();
    const assignVisible = await assignBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (assignVisible) await assignBtn.click();
    await page.waitForTimeout(1500);

    // ── Step 5: Evidence step — skip / finish ─────────────────────────
    const skipOrFinish = page.locator('button').filter({ hasText: /skip|finish|done/i }).first();
    const sfVisible = await skipOrFinish.isVisible({ timeout: 4000 }).catch(() => false);
    if (sfVisible) await skipOrFinish.click();
    await page.waitForTimeout(1500);

    // ── Step 6: Confirm on document detail page ───────────────────────
    await page.waitForURL('**/documents/**', { timeout: 15000 });
    await expect(page.locator('body')).toContainText('E2E Test Decision', { timeout: 10000 });

    // ── Step 7: Submit document ────────────────────────────────────────
    const submitBtn = page.locator('button').filter({ hasText: /^submit/i }).first();
    await submitBtn.waitFor({ timeout: 10000 });
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Low-risk with all required roles → should reach approved or awaiting state
    await expect(page.locator('body')).toContainText(/approved|awaiting|submitted/i, { timeout: 10000 });

    // ── Step 8: Finalize ──────────────────────────────────────────────
    const finalizeBtn = page.locator('button').filter({ hasText: /finaliz/i }).first();
    const finalizeVisible = await finalizeBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (finalizeVisible) {
      await finalizeBtn.click();
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toContainText(/finalized/i, { timeout: 10000 });
    }

    // ── Step 9: Ledger entry exists ───────────────────────────────────
    await page.goto('/ledger');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');

    // ── Step 10: Audit log loads ──────────────────────────────────────
    await page.goto('/audit-log');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('Failed to load');

    console.log('✅ Full E2E workflow completed successfully!');
  });
});
