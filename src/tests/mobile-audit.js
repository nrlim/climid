'use strict';

/**
 * C-LIMID | Mobile Compatibility Tester — Core Audit Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * A standalone Playwright script (not a Playwright Test runner test).
 * Run directly with:  node src/tests/mobile-audit.js [--url <url>] [--headless]
 *
 * What it does
 * ────────────
 *   1. Launches Chromium with a Pixel 5 device profile (touch + mobile UA).
 *   2. Navigates to the target URL with human-like throttled timing.
 *   3. Captures a full-page screenshot annotated with the device name + timestamp.
 *   4. Runs a configurable element audit — logs visibility status per selector.
 *   5. Writes a JSON report to  qa/reports/<timestamp>-report.json.
 *
 * Pixel 5 specs (from Playwright device registry)
 * ─────────────────────────────────────────────────
 *   Viewport   : 393 × 852 px
 *   Device pixel ratio : 2.75
 *   User-Agent : Chrome for Android on Pixel 5
 *   hasTouch   : true  |  isMobile : true
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { chromium, devices } = require('playwright');
const path    = require('path');
const fs      = require('fs');

// ─── CLI argument parsing ─────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const flagIndex   = (flag) => args.indexOf(flag);
const getArg      = (flag) => { const i = flagIndex(flag); return i !== -1 ? args[i + 1] : null; };

const TARGET_URL  = getArg('--url')      || 'https://one.google.com';
const HEADLESS    = !args.includes('--headed');  // default: headless; pass --headed for visible browser
const SLOW_MO     = parseInt(getArg('--slow-mo') || '0', 10);

// ─── Output paths ─────────────────────────────────────────────────────────────
const QA_DIR         = path.join(__dirname, '../..', 'qa');
const SCREENSHOTS_DIR = path.join(QA_DIR, 'screenshots');
const REPORTS_DIR     = path.join(QA_DIR, 'reports');

[QA_DIR, SCREENSHOTS_DIR, REPORTS_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const timestamp       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SCREENSHOT_PATH = path.join(SCREENSHOTS_DIR, `${timestamp}-pixel5-audit.png`);
const REPORT_PATH     = path.join(REPORTS_DIR,     `${timestamp}-report.json`);

// ─── Pixel 5 device profile ───────────────────────────────────────────────────
// We extend the built-in registry entry so every field is explicitly visible.
const PIXEL_5_PROFILE = {
  ...devices['Pixel 5'],           // base: viewport, UA, deviceScaleFactor
  hasTouch:  true,
  isMobile:  true,
  locale:    'en-US',
  timezoneId: 'Asia/Jakarta',      // matches the team's local timezone
};

// ─── Element audit manifest ───────────────────────────────────────────────────
// Each entry defines what to look for and how to interpret its presence.
// Add / remove selectors here without touching audit logic.
const AUDIT_MANIFEST = [
  { label: 'Primary CTA / Upgrade button',   selector: 'a[href*="upgrade"], button:has-text("Upgrade")',    critical: false },
  { label: 'Promotional banner',             selector: '[class*="promo"], [class*="banner"], [id*="promo"]', critical: false },
  { label: 'Navigation menu / Hamburger',    selector: 'nav, [aria-label*="menu"], button[aria-label*="menu"]', critical: true  },
  { label: 'Hero / Above-fold heading',      selector: 'h1, [role="heading"][aria-level="1"]',              critical: true  },
  { label: 'Sign-in / Login button',         selector: 'a[href*="signin"], a[href*="login"], button:has-text("Sign in")', critical: true  },
  { label: 'Cookie / Consent banner',        selector: '[id*="cookie"], [class*="consent"], [aria-label*="cookie"]', critical: false },
  { label: 'Pricing section',                selector: '[id*="pricing"], [class*="pricing"], section:has-text("Pricing")', critical: false },
  { label: 'Footer',                         selector: 'footer',                                            critical: false },
];

// ─── Utility: human-like random delay ────────────────────────────────────────
/**
 * Waits a random number of milliseconds in [minMs, maxMs].
 * Simulates real user "think time" between interactions.
 */
async function humanDelay(page, minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log(`  ⏱  Human-like delay: ${delay}ms`);
  await page.waitForTimeout(delay);
}

// ─── Utility: audit a single element ─────────────────────────────────────────
/**
 * Checks whether a selector matches at least one visible element on the page.
 * Returns a structured result object.
 *
 * @param {import('playwright').Page} page
 * @param {{ label: string, selector: string, critical: boolean }} entry
 * @returns {Promise<AuditResult>}
 */
async function auditElement(page, { label, selector, critical }) {
  let visible    = false;
  let count      = 0;
  let boundingBox = null;
  let error      = null;

  try {
    const locator = page.locator(selector).first();

    // Use a short timeout — we don't want to wait long for optional elements
    await locator.waitFor({ state: 'attached', timeout: 4000 }).catch(() => {});

    count   = await page.locator(selector).count();
    visible = count > 0 && await locator.isVisible().catch(() => false);

    if (visible) {
      boundingBox = await locator.boundingBox().catch(() => null);
    }
  } catch (err) {
    error = err.message;
  }

  const status = visible ? '✅  VISIBLE' : '❌  NOT FOUND';
  const flag   = critical && !visible ? ' ⚠️  [CRITICAL]' : '';

  console.log(`  ${status}${flag}  →  ${label}`);
  if (visible && boundingBox) {
    console.log(`              BBox: x=${boundingBox.x.toFixed(0)} y=${boundingBox.y.toFixed(0)} w=${boundingBox.width.toFixed(0)} h=${boundingBox.height.toFixed(0)}`);
  }

  return { label, selector, visible, count, boundingBox, critical, error };
}

// ─── Main audit runner ────────────────────────────────────────────────────────
async function runMobileAudit() {
  const auditStart = Date.now();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   C-LIMID  |  Mobile UI Compatibility Tester             ║');
  console.log('║   Device   : Pixel 5 (Chromium)                          ║');
  console.log(`║   Target   : ${TARGET_URL.padEnd(44)} ║`);
  console.log(`║   Mode     : ${(HEADLESS ? 'Headless' : 'Headed').padEnd(44)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ── 1. Browser launch ──────────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo:   SLOW_MO,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // prevents crashes in constrained environments
    ],
  });

  // ── 2. Context — Pixel 5 emulation ────────────────────────────────────────
  const context = await browser.newContext({
    ...PIXEL_5_PROFILE,
    // Network: simulate 4G Fast mobile connection
    // (Only works in Chromium — ignored in Firefox/WebKit)
  });

  // Intercept and log all console messages from the page
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`  [Page Console ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.warn(`  [Page JS Error] ${err.message}`);
  });

  // ── 3. Navigation ─────────────────────────────────────────────────────────
  console.log('📡  Step 1 — Navigating to target URL…');
  const navStart = Date.now();

  const response = await page.goto(TARGET_URL, {
    waitUntil: 'domcontentloaded',   // don't block on all network requests
    timeout:   30_000,
  });

  const navDuration = Date.now() - navStart;
  const httpStatus  = response?.status() ?? 'unknown';

  console.log(`  HTTP ${httpStatus} — DOM loaded in ${navDuration}ms`);
  console.log(`  Final URL: ${page.url()}`);

  // ── 4. Human-like delay after initial load ─────────────────────────────────
  console.log('\n👤  Step 2 — Simulating human "read time" after page load…');
  await humanDelay(page, 1200, 2500);

  // Scroll down slowly (simulates a user skimming the page)
  console.log('  📜  Scrolling down slowly (user skim simulation)…');
  await page.mouse.wheel(0, 300);
  await humanDelay(page, 800, 1500);
  await page.mouse.wheel(0, 400);
  await humanDelay(page, 600, 1200);
  await page.mouse.wheel(0, -700); // scroll back to top
  await humanDelay(page, 500, 1000);

  // ── 5. Full-page screenshot ────────────────────────────────────────────────
  console.log('\n📸  Step 3 — Capturing full-page screenshot…');
  await page.screenshot({
    path:     SCREENSHOT_PATH,
    fullPage: true,
  });
  console.log(`  Saved → ${SCREENSHOT_PATH}`);

  // ── 6. Element audit ──────────────────────────────────────────────────────
  console.log('\n🔍  Step 4 — Running element visibility audit…');
  console.log('─'.repeat(60));

  const auditResults = [];
  for (const entry of AUDIT_MANIFEST) {
    const result = await auditElement(page, entry);
    auditResults.push(result);

    // Brief delay between checks so we don't hammer the page
    await page.waitForTimeout(150);
  }

  console.log('─'.repeat(60));

  // ── 7. Page performance metrics ───────────────────────────────────────────
  console.log('\n⚡  Step 5 — Collecting performance metrics…');
  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    return {
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadComplete:     nav ? Math.round(nav.loadEventEnd) : null,
      firstPaint:       paint.find(p => p.name === 'first-paint')             ? Math.round(paint.find(p => p.name === 'first-paint').startTime)             : null,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint') ? Math.round(paint.find(p => p.name === 'first-contentful-paint').startTime) : null,
    };
  }).catch(() => ({}));

  if (perfMetrics.firstContentfulPaint != null)
    console.log(`  First Contentful Paint (FCP)  : ${perfMetrics.firstContentfulPaint}ms`);
  if (perfMetrics.domContentLoaded != null)
    console.log(`  DOM Content Loaded            : ${perfMetrics.domContentLoaded}ms`);
  if (perfMetrics.loadComplete != null)
    console.log(`  Load Complete                 : ${perfMetrics.loadComplete}ms`);

  // ── 8. Audit summary ──────────────────────────────────────────────────────
  const totalDuration  = Date.now() - auditStart;
  const visibleCount   = auditResults.filter(r => r.visible).length;
  const criticalFailed = auditResults.filter(r => r.critical && !r.visible);
  const overallStatus  = criticalFailed.length === 0 ? 'PASS' : 'FAIL';

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     AUDIT SUMMARY                        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Target URL : ${TARGET_URL.slice(0, 43).padEnd(43)} ║`);
  console.log(`║  Device     : Pixel 5 (393×852, DPR 2.75)                ║`);
  console.log(`║  HTTP Status: ${String(httpStatus).padEnd(43)} ║`);
  console.log(`║  Elements   : ${String(visibleCount + '/' + auditResults.length + ' visible').padEnd(43)} ║`);
  console.log(`║  Critical   : ${String(criticalFailed.length === 0 ? 'All passed ✅' : `${criticalFailed.length} failed ❌`).padEnd(43)} ║`);
  console.log(`║  Duration   : ${String(totalDuration + 'ms').padEnd(43)} ║`);
  console.log(`║  Result     : ${String(overallStatus === 'PASS' ? '✅  PASS' : '❌  FAIL').padEnd(43)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (criticalFailed.length > 0) {
    console.warn('⚠️  Critical elements not found:');
    criticalFailed.forEach(r => console.warn(`   • ${r.label} (${r.selector})`));
    console.log('');
  }

  // ── 9. Write JSON report ──────────────────────────────────────────────────
  const report = {
    meta: {
      tool:        'C-LIMID Mobile Compatibility Tester',
      version:     '1.0.0',
      auditedAt:   new Date().toISOString(),
      targetUrl:   TARGET_URL,
      finalUrl:    page.url(),
      httpStatus,
      device:      'Pixel 5',
      viewport:    PIXEL_5_PROFILE.viewport,
      userAgent:   PIXEL_5_PROFILE.userAgent,
      hasTouch:    PIXEL_5_PROFILE.hasTouch,
      isMobile:    PIXEL_5_PROFILE.isMobile,
      headless:    HEADLESS,
      screenshotPath: SCREENSHOT_PATH,
    },
    performance:  perfMetrics,
    audit: {
      overallStatus,
      totalElements:   auditResults.length,
      visibleElements: visibleCount,
      criticalFailed:  criticalFailed.map(r => r.label),
      results:         auditResults,
    },
    durationMs: totalDuration,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📄  JSON report saved → ${REPORT_PATH}`);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await context.close();
  await browser.close();

  console.log('\n[C-LIMID Tester] Audit complete.\n');

  // Exit with non-zero code if critical elements are missing
  if (overallStatus === 'FAIL') process.exit(1);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
runMobileAudit().catch((err) => {
  console.error('\n[C-LIMID Tester] Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
