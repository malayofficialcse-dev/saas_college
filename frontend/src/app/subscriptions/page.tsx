'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { SubscriptionsView } from '@/components/views/SubscriptionsView';

export default function SubscriptionsPage() {
  return (
    <ModulePageLayout initialView="subscriptions">
      <SubscriptionsView />
    </ModulePageLayout>
  );
}
