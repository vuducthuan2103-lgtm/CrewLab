'use client';

import PortalLayout from '@/components/layout/PortalLayout';
import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function DashboardPage() {
  return (
    <PortalLayout>
      <KanbanBoard />
    </PortalLayout>
  );
}
