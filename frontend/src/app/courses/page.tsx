'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { AcademicView } from '@/components/views/AcademicView';

export default function CoursesPage() {
  return (
    <ModulePageLayout initialView="academic">
      <AcademicView initialTab="courses" />
    </ModulePageLayout>
  );
}
