'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { FacultyStaffView } from '@/components/views/FacultyStaffView';

export default function RolesPage() {
  return (
    <ModulePageLayout initialView="faculty-staff">
      <FacultyStaffView initialTab="permissions" />
    </ModulePageLayout>
  );
}
