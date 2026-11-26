'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { NotificationsView } from '@/components/views/NotificationsView';

export default function NotificationsPage() {
  return (
    <ModulePageLayout initialView="notifications">
      <NotificationsView />
    </ModulePageLayout>
  );
}
