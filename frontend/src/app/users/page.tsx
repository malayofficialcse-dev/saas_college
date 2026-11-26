'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { UsersView } from '@/components/views/UsersView';

export default function UsersPage() {
  return (
    <ModulePageLayout initialView="users">
      <UsersView />
    </ModulePageLayout>
  );
}
