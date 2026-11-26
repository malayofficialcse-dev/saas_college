'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { SlaCategoriesView } from '@/components/views/SlaCategoriesView';

export default function QueryEscalationsPage() {
  return (
    <ModulePageLayout initialView="sla-categories">
      <SlaCategoriesView initialTab="escalations" />
    </ModulePageLayout>
  );
}
