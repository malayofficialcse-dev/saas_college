'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '@/lib/auth-context';

export const AppLayout: React.FC<{
  children: React.ReactNode;
  onNewTicket: () => void;
}> = ({ children, onNewTicket }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex w-full">
      {/* 240px Fixed / Collapsible Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Screen Content Area taking full remaining width */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopNav onNewTicket={onNewTicket} />
        <main className="flex-1 w-full p-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
