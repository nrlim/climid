import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';
import type { GoogleAccount } from '@/types';

export const metadata: Metadata = {
  title: 'Dashboard | C-LIMID',
  description: 'C-LIMID Secure Vault — Overview & Account Management',
};

export const revalidate = 0; // Always fresh from DB

async function getAccounts(): Promise<GoogleAccount[]> {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a: any) => ({
      id:          a.id,
      email:       a.email,
      label:       a.label,
      status:      a.status as GoogleAccount['status'],
      lastAuditAt: a.lastAuditAt?.toISOString() ?? null,
      promoLink:   a.promoLink,
      createdAt:   a.createdAt.toISOString(),
      updatedAt:   a.updatedAt.toISOString(),
    }));
  } catch {
    // Return empty array if DB not yet set up
    return [];
  }
}

export default async function DashboardPage() {
  const accounts = await getAccounts();
  return <DashboardClient initialAccounts={accounts} />;
}
