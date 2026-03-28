import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'C-LIMID | Secure Vault Dashboard',
  description:
    'C-LIMID — Zero-Knowledge Secure Data Vault & Scalable Task Distribution. ' +
    'Manage Google account audits with AES-256-GCM encryption and real-time BullMQ workers.',
  keywords: ['encryption', 'vault', 'dashboard', 'bullmq', 'playwright', 'google-accounts'],
  authors: [{ name: 'C-LIMID Engineering' }],
  openGraph: {
    title: 'C-LIMID Dashboard',
    description: 'Premium Secure Vault & Task Dispatcher',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
