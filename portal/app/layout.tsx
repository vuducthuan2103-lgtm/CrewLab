import type { Metadata } from 'next';
import './globals.css';
import { PortalProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'CrewLab Portal — Bardinh Coffee',
  description: 'Nền tảng quản lý nội dung AI dành cho F&B SME Việt Nam. Duyệt bài, theo dõi pipeline AI và quản lý thương hiệu của bạn.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        <PortalProvider>{children}</PortalProvider>
      </body>
    </html>
  );
}
