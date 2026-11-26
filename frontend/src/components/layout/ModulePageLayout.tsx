'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateTicketModal } from '@/components/views/CreateTicketModal';

interface ModulePageLayoutProps {
  children: React.ReactNode;
  initialView?: string;
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  return (
    <>
      <AppLayout onNewTicket={() => setIsCreateTicketOpen(true)}>
        {children}
      </AppLayout>
      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
      />
    </>
  );
}

export const ModulePageLayout: React.FC<ModulePageLayoutProps> = ({
  children,
  initialView = 'dashboard',
}) => {
  return (
    <AuthProvider initialView={initialView}>
      <InnerLayout>{children}</InnerLayout>
    </AuthProvider>
  );
};
