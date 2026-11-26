'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { FaqsView } from '@/components/views/FaqsView';

export default function FaqsPage() {
  return (
    <ModulePageLayout initialView="faqs">
      <FaqsView />
    </ModulePageLayout>
  );
}
