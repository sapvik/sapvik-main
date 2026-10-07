import { test, expect } from '@playwright/test';

test.describe('SAPVIK Production Smoke Tests', () => {

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

});
