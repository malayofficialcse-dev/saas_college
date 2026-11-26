'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { TenantConfigView } from '@/components/views/TenantConfigView';

export default function TenantConfigPage() {
  return (
    <ModulePageLayout initialView="tenant-config">
      <TenantConfigView />
    </ModulePageLayout>
  );
}
