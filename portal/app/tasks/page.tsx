'use client';

import PortalLayout from '@/components/layout/PortalLayout';
import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function TasksPage() {
  return (
    <PortalLayout>
      <KanbanBoard />
    </PortalLayout>
  );
}
