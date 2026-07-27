'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout from '@/components/layout/PortalLayout';
import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authFlag = localStorage.getItem('crewlab_auth');
    if (!authFlag) {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <PortalLayout>
      <KanbanBoard />
    </PortalLayout>
  );
}
