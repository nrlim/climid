'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { VaultService } from '@/lib/vault';
import type { ApiResponse, GoogleAccount, Cookie } from '@/types';

// ── Add Account ───────────────────────────────────────────────────────────────

interface AddAccountInput {
  email: string;
  label?: string;
  password?: string;
  cookies?: Cookie[];
}

export async function addAccount(input: AddAccountInput): Promise<ApiResponse<{ id: string }>> {
  const { email, label, password, cookies } = input;

  if (!email || !email.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  try {
    // Check for duplicate
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: `Account ${email} already exists in the vault.` };
    }

    // Create account record
    const account = await prisma.account.create({
      data: { email, label: label ?? null },
      select: { id: true },
    });

    // Store credentials in vault if either provided
    if (password || (cookies && cookies.length > 0)) {
      const vault = VaultService.fromEnv();
      await vault.store(email, { password, cookies });
    }

    revalidatePath('/dashboard');
    return { success: true, data: { id: account.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Action:addAccount] Failed:', msg);
    return { success: false, error: 'Failed to add account. Please try again.' };
  }
}

// ── Get Accounts ──────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<ApiResponse<GoogleAccount[]>> {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: accounts.map((a: any) => ({
        id:          a.id,
        email:       a.email,
        label:       a.label,
        status:      a.status,
        lastAuditAt: a.lastAuditAt?.toISOString() ?? null,
        promoLink:   a.promoLink,
        createdAt:   a.createdAt.toISOString(),
        updatedAt:   a.updatedAt.toISOString(),
      })),
    };
  } catch (err) {
    return { success: false, error: 'Failed to load accounts.' };
  }
}

// ── Delete Account ────────────────────────────────────────────────────────────

export async function deleteAccount(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  if (!id) return { success: false, error: 'Account ID is required.' };

  try {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return { success: false, error: 'Account not found.' };

    // Cascade: delete audit logs, then the account
    await prisma.auditLog.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });

    revalidatePath('/dashboard');
    return { success: true, data: { deleted: true } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Action:deleteAccount] Failed:', msg);
    return { success: false, error: 'Failed to delete account.' };
  }
}
