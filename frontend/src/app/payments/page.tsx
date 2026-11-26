'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { PaymentsView } from '@/components/views/PaymentsView';

export default function PaymentsPage() {
  return (
    <ModulePageLayout initialView="payments">
      <PaymentsView />
    </ModulePageLayout>
  );
}
