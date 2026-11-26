'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { AnalyticsView } from '@/components/views/AnalyticsView';

export default function AnalyticsPage() {
  return (
    <ModulePageLayout initialView="analytics">
      <AnalyticsView />
    </ModulePageLayout>
  );
}
