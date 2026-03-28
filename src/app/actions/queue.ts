'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getValidationQueue } from '@/lib/queue';
import { VaultService } from '@/lib/vault';
import type { ApiResponse } from '@/types';

// ── Trigger All Audits ────────────────────────────────────────────────────────

export async function triggerAllAudits(): Promise<
  ApiResponse<{ queued: number; jobIds: string[] }>
> {
  try {
    const queue = getValidationQueue();

    // Get all accounts that are not currently Checking
    const accounts = await prisma.account.findMany({
      where: { status: { not: 'CHECKING' } },
      select: { id: true, email: true },
    });

    if (accounts.length === 0) {
      return { success: false, error: 'No accounts available to audit.' };
    }

    // Fetch vault credentials for each account
    const vault = VaultService.fromEnv();
    const jobIds: string[] = [];

    for (const account of accounts) {
      // Mark as CHECKING
      await prisma.account.update({
        where: { id: account.id },
        data: { status: 'CHECKING' },
      });

      // Attempt to retrieve cookies from vault
      let cookies: unknown[] = [];
      try {
        if (await vault.hasCredentials(account.email)) {
          const stored = await vault.retrieve(account.email);
          cookies = (stored.credentials.cookies as unknown[]) ?? [];
        }
      } catch {
        // Continue without cookies — audit will detect auth challenge
      }

      // Enqueue the Playwright audit job
      const job = await queue.add(
        'playwright_audit',
        {
          accountId:    account.id,
          accountEmail: account.email,
          cookies,
          targetUrl:    'https://one.google.com/offer',
        },
        { priority: 10 }
      );

      if (job.id) jobIds.push(job.id);
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      data: { queued: jobIds.length, jobIds },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Queue unavailable';
    console.error('[Action:triggerAllAudits] Failed:', msg);
    return {
      success: false,
      error: 'Failed to dispatch jobs. Redis may be unavailable.',
    };
  }
}

// ── Trigger Single Audit ─────────────────────────────────────────────────────

export async function triggerSingleAudit(
  accountId: string,
  accountEmail: string
): Promise<ApiResponse<{ jobId: string }>> {
  try {
    const queue = getValidationQueue();
    const vault  = VaultService.fromEnv();

    // Mark as CHECKING
    await prisma.account.update({
      where: { id: accountId },
      data: { status: 'CHECKING' },
    });

    let cookies: unknown[] = [];
    try {
      if (await vault.hasCredentials(accountEmail)) {
        const stored = await vault.retrieve(accountEmail);
        cookies = (stored.credentials.cookies as unknown[]) ?? [];
      }
    } catch {
      // proceed without credentials
    }

    const job = await queue.add(
      'playwright_audit',
      {
        accountId,
        accountEmail,
        cookies,
        targetUrl: 'https://one.google.com/offer',
      },
      { priority: 5 } // single-account jobs get higher priority
    );

    revalidatePath('/dashboard');
    return { success: true, data: { jobId: job.id! } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Queue unavailable';
    return { success: false, error: `Failed to queue audit: ${msg}` };
  }
}
