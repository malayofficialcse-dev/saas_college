'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CollegeAdminDashboard } from '@/components/dashboards/CollegeAdminDashboard';
import { FacultyDashboard } from '@/components/dashboards/FacultyDashboard';
import { HodDashboard } from '@/components/dashboards/HodDashboard';
import { PrincipalDashboard } from '@/components/dashboards/PrincipalDashboard';
import { StaffDashboard } from '@/components/dashboards/StaffDashboard';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { SuperAdminDashboard } from '@/components/dashboards/SuperAdminDashboard';
import { CreateTicketModal } from '@/components/views/CreateTicketModal';
import { TicketsView } from '@/components/views/TicketsView';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { MOCK_FAQS, MOCK_KB_ARTICLES } from '@/lib/mock-data';

function Portal() {
  const { role, activeView } = useAuth();
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  const openCreateTicket = () => setIsCreateTicketOpen(true);
  let content;

  if (activeView === 'dashboard') {
    switch (role) {
      case 'SUPER_ADMIN': content = <SuperAdminDashboard />; break;
      case 'PRINCIPAL': content = <PrincipalDashboard />; break;
      case 'HOD': content = <HodDashboard />; break;
      case 'FACULTY': content = <FacultyDashboard />; break;
      case 'STUDENT': content = <StudentDashboard onNewTicket={openCreateTicket} />; break;
      case 'STAFF_ACCOUNTS':
      case 'STAFF_EXAMINATION':
      case 'STAFF_SUPPORT': content = <StaffDashboard />; break;
      default: content = <CollegeAdminDashboard />;
    }
  } else if (activeView === 'tickets') {
    content = <TicketsView />;
  } else if (activeView === 'knowledge-base') {
    content = (
      <section className="space-y-4">
        <div><h1 className="text-2xl font-semibold">Knowledge Base</h1><p className="mt-1 text-sm text-[#667085]">Guides and answers to common college support questions.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_KB_ARTICLES.map((article) => (
            <article key={article.id} className="border border-[#E5E7EB] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4779B8]">{article.category}</p>
              <h2 className="mt-2 font-semibold">{article.title}</h2>
              <p className="mt-2 text-sm text-[#667085]">{article.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    );
  } else if (activeView === 'faqs') {
    content = (
      <section className="space-y-4">
        <div><h1 className="text-2xl font-semibold">Frequently Asked Questions</h1><p className="mt-1 text-sm text-[#667085]">Quick answers from the CollegeQuery support team.</p></div>
        <div className="space-y-3">
          {MOCK_FAQS.map((faq) => (
            <article key={faq.id} className="border border-[#E5E7EB] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4779B8]">{faq.category}</p>
              <h2 className="mt-2 font-semibold">{faq.question}</h2>
              <p className="mt-2 text-sm text-[#667085]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    );
  } else {
    content = <EmptyState title="This section is coming soon" description="Choose Dashboard, Tickets, Knowledge Base, or FAQs to continue." />;
  }

  return (
    <>
      <AppLayout onNewTicket={openCreateTicket}>{content}</AppLayout>
      <CreateTicketModal isOpen={isCreateTicketOpen} onClose={() => setIsCreateTicketOpen(false)} />
    </>
  );
}

export default function HomePage() {
  return <AuthProvider><Portal /></AuthProvider>;
}
