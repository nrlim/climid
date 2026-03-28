// @ts-check
/**
 * C-LIMID | Playwright Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Used by the @playwright/test runner.
 * Run:   npx playwright test
 * Report: npx playwright show-report
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // ── Test discovery ──────────────────────────────────────────────────────────
  testDir:  './src/tests',
  testMatch: '**/*.spec.js',

  // ── Parallelism ─────────────────────────────────────────────────────────────
  fullyParallel: false,   // Mobile audits are network-bound; keep sequential
  workers:       1,       // Single worker avoids hammering the target server

  // ── Retry on CI  ────────────────────────────────────────────────────────────
  retries: process.env.CI ? 2 : 0,

  // ── Timeouts ────────────────────────────────────────────────────────────────
  timeout:      45_000,   // per test
  expect: { timeout: 10_000 },

  // ── Reporters ───────────────────────────────────────────────────────────────
  reporter: [
    ['list'],                              // live console output
    ['html', { outputFolder: 'qa/playwright-report', open: 'never' }],
    ['json', { outputFile: 'qa/reports/playwright-results.json' }],
  ],

  // ── Shared browser settings ─────────────────────────────────────────────────
  use: {
    headless:            true,
    screenshot:          'only-on-failure',
    video:               'retain-on-failure',
    trace:               'retain-on-failure',
    actionTimeout:       15_000,
    navigationTimeout:   30_000,
    ignoreHTTPSErrors:   false,
  },

  // ── Projects — chromium only (Pixel 5 emulation uses the Chromium engine) ──
  projects: [
    {
      name:  'chromium-mobile',
      use:   { browserName: 'chromium' },
    },
  ],
});
