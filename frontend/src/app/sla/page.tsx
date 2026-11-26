'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { SlaCategoriesView } from '@/components/views/SlaCategoriesView';

export default function SlaPage() {
  return (
    <ModulePageLayout initialView="sla-categories">
      <SlaCategoriesView initialTab="policies" />
    </ModulePageLayout>
  );
}
