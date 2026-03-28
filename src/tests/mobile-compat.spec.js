// @ts-check
/**
 * C-LIMID | Playwright Test Suite — Mobile Compatibility
 * ─────────────────────────────────────────────────────────────────────────────
 * Run with:  npx playwright test
 *
 * This file uses the Playwright Test runner (@playwright/test) for structured
 * assertions, parallel runs, HTML reports, and CI integration — complementing
 * the standalone audit script (mobile-audit.js).
 *
 * Tests are parameterised across both the Pixel 5 and Pixel 5 Landscape
 * presets to catch orientation-specific layout regressions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { test, expect, devices } = require('@playwright/test');

// ─── Target configuration ─────────────────────────────────────────────────────
const TARGET_URL = process.env.AUDIT_URL || 'https://one.google.com';

// ─── Utility: human-like delay ────────────────────────────────────────────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {number} [minMs]
 * @param {number} [maxMs]
 */
async function humanDelay(page, minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await page.waitForTimeout(delay);
}

// ─── Test group: Portrait (Pixel 5) ──────────────────────────────────────────
test.describe('Pixel 5 — Portrait', () => {

  const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
  test.use({
    ...pixel5,
    hasTouch:   true,
    isMobile:   true,
    locale:     'en-US',
  });

  test('Page loads with HTTP 2xx on Pixel 5', async ({ page }) => {
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    expect(response?.status(), 'Expected HTTP 2xx response').toBeGreaterThanOrEqual(200);
    expect(response?.status(), 'Expected HTTP 2xx response').toBeLessThan(300);
  });

  test('Page title is non-empty', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const title = await page.title();
    expect(title.trim().length, 'Page title should not be empty').toBeGreaterThan(0);
    console.log(`  Page title: "${title}"`);
  });

  test('Primary heading (H1) is visible in mobile viewport', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 800, 1500);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8_000 });
  });

  test('Navigation or menu element is present', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 800, 1500);
    const nav = page.locator('nav, [role="navigation"], [aria-label*="menu"]').first();
    await expect(nav).toBeAttached({ timeout: 8_000 });
  });

  test('No horizontal scroll overflow on mobile viewport', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 1000, 2000);

    // Scroll interaction — simulates user skim
    await page.mouse.wheel(0, 500);
    await humanDelay(page, 600, 1000);
    await page.mouse.wheel(0, -500);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Page should not overflow horizontally on mobile').toBe(false);
  });

  test('Upgrade / Promo CTA presence is logged', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 1000, 2000);

    const selectors = {
      'Upgrade button':    'a[href*="upgrade"], button:has-text("Upgrade")',
      'Promotional banner':'[class*="promo"], [class*="banner"]',
      'Sign-in button':    'a[href*="signin"], a[href*="login"], button:has-text("Sign in")',
    };

    for (const [label, selector] of Object.entries(selectors)) {
      const count   = await page.locator(selector).count();
      const visible = count > 0 && await page.locator(selector).first().isVisible().catch(() => false);
      console.log(`  ${visible ? '✅' : '❌'}  ${label}: ${visible ? 'VISIBLE' : 'not found'}`);
      // This test always passes — it is purely informational / audit logging.
    }
  });

  test('Full-page screenshot captured successfully', async ({ page }, testInfo) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 1000, 2000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.byteLength, 'Screenshot should not be empty').toBeGreaterThan(1000);

    // Attach to test report (visible in HTML report: npx playwright show-report)
    await testInfo.attach('pixel5-full-page', {
      body:      screenshot,
      contentType: 'image/png',
    });
  });

  test('First Contentful Paint is under 5 seconds', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName('first-contentful-paint')[0];
      return entry ? Math.round(entry.startTime) : null;
    });

    if (fcp !== null) {
      console.log(`  FCP on Pixel 5: ${fcp}ms`);
      expect(fcp, 'FCP should be under 5000ms on mobile').toBeLessThan(5000);
    } else {
      console.warn('  FCP metric not available (page may have redirected)');
    }
  });

});

// ─── Test group: Landscape ────────────────────────────────────────────────────
test.describe('Pixel 5 — Landscape', () => {

  const { defaultBrowserType, ...pixel5Landscape } = devices['Pixel 5 landscape'];
  test.use({
    ...pixel5Landscape,
    hasTouch:  true,
    isMobile:  true,
    locale:    'en-US',
  });

  test('Page renders in landscape orientation without broken layout', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 800, 1500);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 0;

    // Content width should not massively exceed viewport in landscape
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth * 1.05);
  });

  test('Landscape screenshot captured', async ({ page }, testInfo) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanDelay(page, 800, 1500);

    const screenshot = await page.screenshot({ fullPage: false }); // above-fold
    await testInfo.attach('pixel5-landscape', {
      body:      screenshot,
      contentType: 'image/png',
    });

    expect(screenshot.byteLength).toBeGreaterThan(1000);
  });

});
