import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="dashboard-grid scan-line"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)
        `,
      }}
    >
      <Sidebar />
      <main
        style={{
          gridColumn: 2,
          overflowY: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
}
