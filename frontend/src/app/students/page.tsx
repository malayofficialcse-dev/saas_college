'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { StudentsView } from '@/components/views/StudentsView';

export default function StudentsPage() {
  return (
    <ModulePageLayout initialView="students">
      <StudentsView />
    </ModulePageLayout>
  );
}
