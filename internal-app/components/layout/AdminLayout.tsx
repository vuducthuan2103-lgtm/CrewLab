'use client';

import React from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 ml-56">
        {children}
      </main>
    </div>
  );
}
