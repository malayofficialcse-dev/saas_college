'use client';

import { ModulePageLayout } from '@/components/layout/ModulePageLayout';
import { FeedbackView } from '@/components/views/FeedbackView';

export default function FeedbackPage() {
  return (
    <ModulePageLayout initialView="feedback">
      <FeedbackView />
    </ModulePageLayout>
  );
}
