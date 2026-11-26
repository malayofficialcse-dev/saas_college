'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { ImpersonationView } from '@/components/views/ImpersonationView';

export default function SystemAdminPage() {
  return (
    <ModulePageLayout initialView="impersonation">
      <ImpersonationView />
    </ModulePageLayout>
  );
}
