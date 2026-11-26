'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { CollegesDirectoryView } from '@/components/views/CollegesDirectoryView';

export default function TenantsPage() {
  return (
    <ModulePageLayout initialView="colleges-directory">
      <CollegesDirectoryView />
    </ModulePageLayout>
  );
}
