'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { ConversationsView } from '@/components/views/ConversationsView';

export default function MessagingPage() {
  return (
    <ModulePageLayout initialView="messaging">
      <ConversationsView />
    </ModulePageLayout>
  );
}
