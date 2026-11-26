'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { AuditLogsView } from '@/components/views/AuditLogsView';

export default function AuditLogsPage() {
  return (
    <ModulePageLayout initialView="audit-logs">
      <AuditLogsView />
    </ModulePageLayout>
  );
}
