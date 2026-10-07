import { test, expect } from '@playwright/test';

// Computed SHA-256 token for default password "sapvik2026"
const DEFAULT_AUTH_TOKEN = '14b3462340e0b0e3f6b99b0600d4f018ca8409acac51fddc1c17bc8120ad13b9';

test.describe('Edge Password Gate & Access Control', () => {

  test('Blocks unauthenticated access, rejects wrong passwords, and unlocks with valid passcode', async ({ page }) => {
    // 1. Visit root page unauthenticated
    const initialRes = await page.goto('/');
    expect(initialRes.status()).toBe(401);

    // 2. Lock screen should be visible
    const lockCard = page.locator('.lock-card');
    await expect(lockCard).toBeVisible();
    await expect(page.locator('h1.lock-title')).toHaveText('Preview Authorization');

    // 3. Submit wrong passcode
    await page.fill('#password', 'wrong-passcode-99');
    await page.click('button[type="submit"]');

    // Error banner displayed and still locked
    const errBanner = page.locator('.error-banner');
    await expect(errBanner).toBeVisible();
    await expect(errBanner).toContainText('Incorrect access passcode');

    // 4. Submit correct passcode
    await page.fill('#password', 'sapvik2026');
    await page.click('button[type="submit"]');

    // 5. Successful authentication unlocks the website
    await page.waitForSelector('#home');
    await expect(page.locator('#home')).toBeVisible();
  });

});

test.describe('SAPVIK Production Smoke Tests', () => {

  test.beforeEach(async ({ context }) => {
    // Authenticate session via edge cookie for feature tests
    await context.addCookies([
      {
        name: 'sapvik_auth',
        value: DEFAULT_AUTH_TOKEN,
        url: 'http://127.0.0.1:8082'
      }
    ]);
  });

  test('360px Mobile Viewport has NO horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');

    // Wait for content load
    await page.waitForSelector('#home');

    // Measure scroll width vs viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Zero horizontal overflow on 360px mobile
  });

  test('Growth Simulator: Chips toggle correctly without double-toggle bug', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Scroll simulator into view and ensure React island is hydrated
    const simulator = page.locator('#simulator');
    await simulator.scrollIntoViewIfNeeded();
    await expect(page.locator('#simulator[data-hydrated="true"]')).toBeVisible();

    const promotionsChip = page.locator('label.calc-chip:has(input[value="promotions"])');
    const promotionsCheckbox = promotionsChip.locator('input[type="checkbox"]');

    // Initially checked
    await expect(promotionsCheckbox).toBeChecked();
    await expect(promotionsChip).toHaveClass(/active/);

    // Click label once: should uncheck
    await promotionsChip.click();
    await expect(promotionsCheckbox).not.toBeChecked();
    await expect(promotionsChip).not.toHaveClass(/active/);

    // Click label second time: should re-check
    await promotionsChip.click();
    await expect(promotionsCheckbox).toBeChecked();
    await expect(promotionsChip).toHaveClass(/active/);

    // Verify projected output updates
    const inquiriesVal = page.locator('#calcOutInquiries');
    await expect(inquiriesVal).not.toHaveText('—');
  });

  test('Contact Form: Validation requires consent and mandatory fields', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Mock /api/contact endpoint
    await page.route('**/api/contact', async (route) => {
      const postData = route.request().postDataJSON();
      if (!postData.name || !postData.email || !postData.phone || !postData.consent) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'validation_error', message: 'Missing fields' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, lead_id: 'LEAD-TEST-999', message: 'Logged successfully' })
        });
      }
    });

    // Fill form fields
    await page.fill('#formName', 'Test Lead User');
    await page.fill('#formPhone', '+91 98765 00000');
    await page.fill('#formEmail', 'lead@testcompany.in');
    await page.fill('#formBusiness', 'Test Company Pvt Ltd');

    // Check privacy consent (starts unchecked)
    const consentCheckbox = page.locator('#formConsent');
    await expect(consentCheckbox).not.toBeChecked();
    await consentCheckbox.check();

    // Submit form
    await page.click('#auditForm button[type="submit"]');

    // Verify success status panel appears with lead reference
    const statusPanel = page.locator('#formStatusPanel');
    await expect(statusPanel).toBeVisible();
    await expect(statusPanel).toContainText('LEAD-TEST-999');

    // Verify generate_lead pushed to dataLayer without PII
    const leadEvent = await page.evaluate(() => {
      return (window.dataLayer || []).find((e) => e.event === 'generate_lead');
    });
    expect(leadEvent).toBeDefined();
    expect(leadEvent.lead_id).toBe('LEAD-TEST-999');
    expect(leadEvent.email).toBeUndefined();
    expect(leadEvent.phone).toBeUndefined();
    expect(leadEvent.name).toBeUndefined();
  });

  test('Cookie & Analytics Consent Banner: Grants consent upon accept', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const banner = page.locator('#consentBanner');
    await expect(banner).toBeVisible();

    const acceptBtn = page.locator('#btnConsentAccept');
    await acceptBtn.click();

    await expect(banner).toBeHidden();

    // Verify localStorage persistence
    const savedConsent = await page.evaluate(() => localStorage.getItem('sapvik_consent'));
    expect(savedConsent).toBe('granted');
  });

  test('Cookie Preferences: Can re-open consent settings from cookie policy page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Visit /cookies directly
    await page.goto('/cookies');

    const updateBtn = page.locator('#btnManagePreferences');
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    // Verify banner opens for user modification
    const banner = page.locator('#consentBanner');
    await expect(banner).toBeVisible();
  });

});
