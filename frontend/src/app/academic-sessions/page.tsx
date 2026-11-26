'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { AcademicView } from '@/components/views/AcademicView';

export default function AcademicSessionsPage() {
  return (
    <ModulePageLayout initialView="academic">
      <AcademicView initialTab="sessions" />
    </ModulePageLayout>
  );
}
