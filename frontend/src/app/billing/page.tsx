'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { SubscriptionsView } from '@/components/views/SubscriptionsView';

export default function BillingPage() {
  return (
    <ModulePageLayout initialView="subscriptions">
      <SubscriptionsView />
    </ModulePageLayout>
  );
}
