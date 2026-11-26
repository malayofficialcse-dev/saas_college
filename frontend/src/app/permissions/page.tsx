'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { FacultyStaffView } from '@/components/views/FacultyStaffView';

export default function PermissionsPage() {
  return (
    <ModulePageLayout initialView="faculty-staff">
      <FacultyStaffView initialTab="permissions" />
    </ModulePageLayout>
  );
}
