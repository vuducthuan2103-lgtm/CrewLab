import './globals.css';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'CrewLab 3D Virtual Marketing Office (Sandbox)',
  description: 'Interactive 3D Virtual Marketing Office for Vietnamese F&B SMEs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-[#09090B] text-[#FAFAFA] antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
