'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { ConversationsView } from '@/components/views/ConversationsView';

export default function ConversationsPage() {
  return (
    <ModulePageLayout initialView="conversations">
      <ConversationsView />
    </ModulePageLayout>
  );
}
