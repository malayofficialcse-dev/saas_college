'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { KnowledgeBaseView } from '@/components/views/KnowledgeBaseView';

export default function KnowledgeBasePage() {
  return (
    <ModulePageLayout initialView="knowledge-base">
      <KnowledgeBaseView />
    </ModulePageLayout>
  );
}
