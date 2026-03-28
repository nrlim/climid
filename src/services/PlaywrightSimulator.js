'use strict';

/**
 * C-LIMID | Playwright Simulator Execution Bridge
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides an exported method to launch a "Pixel 5" Chromium instance, injects 
 * decrypted credentials/cookies from the Vault, and performs a visual audit.
 * 
 * Returns the audit results directly to the calling worker process.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { chromium, devices } = require('playwright');

/**
 * @param {Object} options
 * @param {string} options.targetUrl 
 * @param {Array<Object>} [options.cookies] - Cookies array to simulate active session
 * @param {boolean} [options.headless=true]
 * @returns {Promise<{ status: string, promoLink: string|null, screenshotBuf: Buffer|null, error: string|null }>}
 */
async function runAudit({ targetUrl = 'https://one.google.com', cookies = [], headless = true }) {
  console.log(`[C-LIMID Simulator] Starting headless simulated audit against ${targetUrl}...`);
  
  const PIXEL_5_PROFILE = {
    ...devices['Pixel 5'],
    hasTouch:  true,
    isMobile:  true,
    locale:    'en-US',
  };

  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext(PIXEL_5_PROFILE);
  
  // ── Inject decrypted session cookies ───────────────────────────────────────
  if (cookies && Array.isArray(cookies) && cookies.length > 0) {
    try {
      await context.addCookies(cookies);
      console.log(`[C-LIMID Simulator] Injected ${cookies.length} session cookies from Vault.`);
    } catch (err) {
      console.warn(`[C-LIMID Simulator] Cookie injection failed: ${err.message}`);
    }
  }

  const page = await context.newPage();
  
  let status = 'Not Eligible';
  let promoLink = null;
  let screenshotBuf = null;
  let errorMsg = null;

  try {
    // ── Navigation & Timeout Settings ─────────────────────────────────────────
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout:   30_000,
    });
    
    // Human-like wait
    const delay = Math.floor(Math.random() * (2500 - 1200 + 1)) + 1200;
    await page.waitForTimeout(delay);

    // ── Challenge & Eligibility Checking ──────────────────────────────────────
    const signinSelector = 'a[href*="signin"], a[href*="login"], button:has-text("Sign in")';
    const upgradeSelector = 'a[href*="upgrade"], button:has-text("Upgrade")';
    const challengeSelector = 'input[type="password"], [id*="captcha"], [aria-label*="Verify"]';

    // 1. Check if we're challenged (2FA, captcha, login required despite cookies)
    const isChallenged = await page.locator(signinSelector).count() > 0 || await page.locator(challengeSelector).count() > 0;
    
    if (isChallenged) {
      status = 'Action Required';
      throw new Error('Login Blocked: The account is facing a challenge/captcha or 2FA.');
    } else {
      // 2. Check if promo/upgrade is available
      const isPromoAvailable = await page.locator(upgradeSelector).count();
      
      if (isPromoAvailable > 0) {
        status = 'Eligible';
        // Try extract href if it's an anchor tag
        const firstPromo = page.locator(upgradeSelector).first();
        promoLink = await firstPromo.evaluate(node => node.href).catch(() => null);
      }
    }

    // Capture full-page screenshot
    screenshotBuf = await page.screenshot({ fullPage: true });

  } catch (err) {
    // ── Self-Healing: Global Error Handler ──────────────────────────────────
    let reason = 'Unknown Error';
    const msg = err.message || '';

    if (err.name === 'TimeoutError' || msg.includes('Timeout')) {
      reason = 'Network Timeout';
    } else if (msg.includes('Target closed') || msg.includes('browser has been closed')) {
      reason = 'Browser Crash / Zombie Process';
    } else if (status === 'Action Required') {
      reason = 'Login Blocked';
    } else {
      reason = 'Simulation Failure';
    }

    console.error(`[C-LIMID Simulator] ❌ ${reason} detected! Error: ${msg}`);
    
    // The finally block ensures the zombie browser is closed gracefully.
    // By throwing here, we force the BullMQ worker to catch it, failing the job,
    // which triggers the automatic 1 retry policy.
    throw new Error(`${reason}: ${msg}`);

  } finally {
    // 1. Close the zombie browser process unconditionally
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return {
    status,
    promoLink,
    screenshotBuf,
    error: errorMsg,
  };
}

module.exports = { runAudit };
