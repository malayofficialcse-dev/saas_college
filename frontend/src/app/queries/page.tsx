'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { TicketsView } from '@/components/views/TicketsView';

export default function QueriesPage() {
  return (
    <ModulePageLayout initialView="tickets">
      <TicketsView />
    </ModulePageLayout>
  );
}
