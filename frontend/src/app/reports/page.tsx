'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { ReportsView } from '@/components/views/ReportsView';

export default function ReportsPage() {
  return (
    <ModulePageLayout initialView="reports">
      <ReportsView />
    </ModulePageLayout>
  );
}
