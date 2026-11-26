'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { FacultyStaffView } from '@/components/views/FacultyStaffView';

export default function FacultyPage() {
  return (
    <ModulePageLayout initialView="faculty-staff">
      <FacultyStaffView initialTab="directory" />
    </ModulePageLayout>
  );
}
