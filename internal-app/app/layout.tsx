import type { Metadata } from 'next';
import './globals.css';
import { AdminProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'CrewLab — Agency Admin Operations',
  description: 'Multi-Agent Operations & FSM Control Center for CrewLab Agency Team. Giám sát 6 AI agents, quản lý client F&B, debug pipeline.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-[#D4FF00] selection:text-black">
        <AdminProvider>{children}</AdminProvider>
      </body>
    </html>
  );
}
