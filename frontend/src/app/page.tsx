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
import { AcademicView } from '@/components/views/AcademicView';
import { StudentsView } from '@/components/views/StudentsView';
import { FacultyStaffView } from '@/components/views/FacultyStaffView';
import { SlaCategoriesView } from '@/components/views/SlaCategoriesView';
import { KnowledgeBaseView } from '@/components/views/KnowledgeBaseView';
import { FaqsView } from '@/components/views/FaqsView';
import { FeedbackView } from '@/components/views/FeedbackView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { ReportsView } from '@/components/views/ReportsView';
import { SubscriptionsView } from '@/components/views/SubscriptionsView';
import { AuditLogsView } from '@/components/views/AuditLogsView';
import { CollegesDirectoryView } from '@/components/views/CollegesDirectoryView';
import { TenantConfigView } from '@/components/views/TenantConfigView';
import { ImpersonationView } from '@/components/views/ImpersonationView';
import { UsersView } from '@/components/views/UsersView';
import { ConversationsView } from '@/components/views/ConversationsView';
import { NotificationsView } from '@/components/views/NotificationsView';
import { PaymentsView } from '@/components/views/PaymentsView';
import { AttachmentsView } from '@/components/views/AttachmentsView';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/EmptyState';

function Portal() {
  const { role, activeView } = useAuth();
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  const openCreateTicket = () => setIsCreateTicketOpen(true);
  let content;

  if (activeView === 'dashboard') {
    switch (role) {
      case 'SUPER_ADMIN':
        content = <SuperAdminDashboard />;
        break;
      case 'PRINCIPAL':
        content = <PrincipalDashboard />;
        break;
      case 'HOD':
        content = <HodDashboard />;
        break;
      case 'FACULTY':
        content = <FacultyDashboard />;
        break;
      case 'STUDENT':
        content = <StudentDashboard onNewTicket={openCreateTicket} />;
        break;
      case 'STAFF_ACCOUNTS':
      case 'STAFF_EXAMINATION':
      case 'STAFF_SUPPORT':
        content = <StaffDashboard />;
        break;
      default:
        content = <CollegeAdminDashboard />;
    }
  } else if (activeView === 'tickets') {
    content = <TicketsView />;
  } else if (activeView === 'knowledge-base') {
    content = <KnowledgeBaseView />;
  } else if (activeView === 'faqs') {
    content = <FaqsView />;
  } else if (activeView === 'academic') {
    content = <AcademicView />;
  } else if (activeView === 'students') {
    content = <StudentsView />;
  } else if (activeView === 'faculty-staff') {
    content = <FacultyStaffView />;
  } else if (activeView === 'sla-categories') {
    content = <SlaCategoriesView />;
  } else if (activeView === 'feedback') {
    content = <FeedbackView />;
  } else if (activeView === 'analytics') {
    content = <AnalyticsView />;
  } else if (activeView === 'reports') {
    content = <ReportsView />;
  } else if (activeView === 'subscriptions') {
    content = <SubscriptionsView />;
  } else if (activeView === 'audit-logs') {
    content = <AuditLogsView />;
  } else if (activeView === 'colleges-directory') {
    content = <CollegesDirectoryView />;
  } else if (activeView === 'tenant-config') {
    content = <TenantConfigView />;
  } else if (activeView === 'impersonation') {
    content = <ImpersonationView />;
  } else if (activeView === 'users') {
    content = <UsersView />;
  } else if (activeView === 'conversations' || activeView === 'messaging') {
    content = <ConversationsView />;
  } else if (activeView === 'notifications') {
    content = <NotificationsView />;
  } else if (activeView === 'payments') {
    content = <PaymentsView />;
  } else if (activeView === 'attachments') {
    content = <AttachmentsView />;
  } else {
    content = (
      <EmptyState
        title="Page not found"
        description="Select a section from the navigation sidebar."
      />
    );
  }

  return (
    <>
      <AppLayout onNewTicket={openCreateTicket}>{content}</AppLayout>
      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <Portal />
    </AuthProvider>
  );
}
