'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { CollegesDirectoryView } from '@/components/views/CollegesDirectoryView';

export default function CollegesPage() {
  return (
    <ModulePageLayout initialView="colleges-directory">
      <CollegesDirectoryView />
    </ModulePageLayout>
  );
}
