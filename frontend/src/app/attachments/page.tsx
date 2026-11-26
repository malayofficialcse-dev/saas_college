'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { AttachmentsView } from '@/components/views/AttachmentsView';

export default function AttachmentsPage() {
  return (
    <ModulePageLayout initialView="attachments">
      <AttachmentsView />
    </ModulePageLayout>
  );
}
