import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { EncryptionService } from '../services/encryption';
import { getRedisConnection, QUEUE_NAME } from '../lib/queue';
import { chromium, devices } from 'playwright';

export async function processAuditJob(job: Job) {
  const { accountId, accountEmail, cookies, targetUrl } = job.data;

  // 1. Retrieve Account Data & Credentials
  const account = await prisma.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    console.warn(`[Worker] Account not found or deleted before audit: ${accountId}. Skipping job.`);
    return { status: 'SKIPPED', error: 'Database record removed prior to execution.' };
  }

  // Attempt to load and decrypt real cookies if missing from job payload
  let activeCookies = cookies || [];
  if (activeCookies.length === 0 && account.sessionJson) {
     try {
       const payload = JSON.parse(account.sessionJson);
       const decrypted = EncryptionService.decrypt(payload.hash, payload.iv, payload.tag);
       activeCookies = JSON.parse(decrypted);
     } catch (e) {
       console.warn(`[Worker] Failed to decrypt sessionJson for ${accountEmail}`);
     }
  }

  // Attempt to decrypt the password 
  let activePassword: string | null = null;
  if (account.password) {
     try {
       const payload = JSON.parse(account.password);
       activePassword = EncryptionService.decrypt(payload.hash, payload.iv, payload.tag);
     } catch (e) {
       console.warn(`[Worker] Failed to decrypt password for ${accountEmail}`);
     }
  }

  // 2. Execute Web Simulation (Desktop Sandbox)
  console.log(`[Worker] Launching Headless Playwright Desktop for ${accountEmail}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US'
  });

  if (activeCookies.length > 0) {
    // Sanitize cookies
    const sanitizedCookies = activeCookies.map((c: any) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.google.com',
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: ['Strict', 'Lax', 'None'].includes(c.sameSite) ? c.sameSite : undefined,
      expires: c.expirationDate || c.expires || undefined
    }));
    await context.addCookies(sanitizedCookies);
  }

  const page = await context.newPage();
  let status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'ACTION_REQUIRED' = 'NOT_ELIGIBLE';
  let promoLink: string | null = null;
  let errorMessage: string | null = null;

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if we are challenged for authentication
    let isChallenge = await page.title().then(t => t.toLowerCase().includes('sign in'));
    
    if (isChallenge && activePassword) {
       console.log(`[Worker] Unauthenticated. Falling back to active Headless UI login for ${accountEmail}...`);
       try {
           if (await page.isVisible('input[type="email"]')) {
               await page.fill('input[type="email"]', accountEmail);
               await page.keyboard.press('Enter');
               await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
           }
           await page.waitForTimeout(1500); 
           if (await page.isVisible('input[type="password"]')) {
               await page.fill('input[type="password"]', activePassword);
               await page.keyboard.press('Enter');
               await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
               await page.waitForTimeout(3000);
               await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
               isChallenge = await page.title().then(t => t.toLowerCase().includes('sign in'));
           }
       } catch (err) {
           console.log(`[Worker] Automated typing failed.`);
       }
    }

    if (isChallenge) {
       console.log(`[Worker] Hit an unbreakable Google Login Challenge for ${accountEmail}.`);
       status = 'ACTION_REQUIRED';
    } else {
       console.log(`[Worker] Successfully validated session. Account ${accountEmail} is Eligible.`);
       status = 'ELIGIBLE';
    }

  } catch (error: any) {
    status = 'ERROR';
    errorMessage = error.message;
  } finally {
    await browser.close();
  }

  // 3. Update Database 
  await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: {
        status,
        promoLink: promoLink || account.promoLink,
        lastAuditAt: new Date()
      }
    }),
    prisma.auditLog.create({
      data: {
        accountId,
        accountEmail,
        status,
        promoLink,
        error: errorMessage,
        durationMs: new Date().getTime() - new Date(job.timestamp).getTime(),
        jobId: job.id
      }
    })
  ]);

  return { status, promoLink, error: errorMessage };
}

// ─── Worker Initialization ──────────────────────────────────────────────────
export const worker = new Worker(
  QUEUE_NAME,
  processAuditJob,
  {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: {
      max: 5,
      duration: 60000 // 60s window
    }
  }
);

worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed`, err));
