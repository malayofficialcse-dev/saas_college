'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { SlaCategoriesView } from '@/components/views/SlaCategoriesView';

export default function QueryCategoriesPage() {
  return (
    <ModulePageLayout initialView="sla-categories">
      <SlaCategoriesView initialTab="categories" />
    </ModulePageLayout>
  );
}
