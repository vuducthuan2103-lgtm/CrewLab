import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrewLab - Agency Internal Admin',
  description: 'Multi-Agent Operations & FSM Control Center for Agency Team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-[#D4FF00] selection:text-black">
        {children}
      </body>
    </html>
  );
}
