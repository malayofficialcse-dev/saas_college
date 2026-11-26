'use client';

import React from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  BookOpen,
  HelpCircle,
  GraduationCap,
  CreditCard,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Users,
  Briefcase,
  Layers,
  Star,
  Settings,
  MessageSquare,
  Bell,
  Paperclip,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  badge?: number;
}

export const Sidebar: React.FC<{ isCollapsed: boolean; onToggle: () => void }> = ({
  isCollapsed,
  onToggle,
}) => {
  const { role, user, tenant, activeView, setActiveView, tickets } = useAuth();

  const openTicketsCount = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
  ).length;

  const myTicketsCount =
    role === 'STUDENT'
      ? tickets.filter((t) => t.studentEmail === user.email).length
      : role === 'FACULTY'
        ? tickets.filter((t) => t.assignedStaffName?.includes(user.lastName)).length
        : undefined;

  // Main Section
  const mainNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={17} />,
    },
    {
      id: 'tickets',
      label: role === 'STUDENT' ? 'My Queries' : 'Tickets & Queries',
      icon: <TicketIcon size={17} />,
      badge: role === 'STUDENT' ? myTicketsCount : openTicketsCount,
    },
    {
      id: 'conversations',
      label: 'Live Messaging',
      icon: <MessageSquare size={17} />,
    },
    {
      id: 'notifications',
      label: 'Alerts & Notices',
      icon: <Bell size={17} />,
    },
    {
      id: 'knowledge-base',
      label: 'Knowledge Base',
      icon: <BookOpen size={17} />,
    },
    {
      id: 'faqs',
      label: 'FAQs',
      icon: <HelpCircle size={17} />,
    },
  ];

  // Academic & Campus Section
  const academicNavItems: NavItem[] = [
    {
      id: 'academic',
      label: 'Academic Setup',
      icon: <GraduationCap size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD'],
    },
    {
      id: 'students',
      label: 'Students Directory',
      icon: <Users size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 'STAFF_SUPPORT'],
    },
    {
      id: 'faculty-staff',
      label: 'Faculty & Staff',
      icon: <Briefcase size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD'],
    },
  ];

  // Service Desk Management
  const serviceDeskNavItems: NavItem[] = [
    {
      id: 'sla-categories',
      label: 'Categories & SLA',
      icon: <Layers size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD'],
    },
    {
      id: 'feedback',
      label: 'Feedback & CSAT',
      icon: <Star size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD'],
    },
    {
      id: 'analytics',
      label: 'Analytics & SLA',
      icon: <BarChart3 size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD'],
    },
    {
      id: 'reports',
      label: 'Export Reports',
      icon: <FileSpreadsheet size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF_ACCOUNTS', 'STAFF_EXAMINATION'],
    },
    {
      id: 'attachments',
      label: 'File Attachments',
      icon: <Paperclip size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD', 'STAFF_SUPPORT', 'STAFF_ACCOUNTS'],
    },
  ];

  // Administration & Finance
  const adminNavItems: NavItem[] = [
    {
      id: 'users',
      label: 'User Accounts',
      icon: <UserCheck size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'],
    },
    {
      id: 'subscriptions',
      label: 'Billing & Quotas',
      icon: <CreditCard size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'STAFF_ACCOUNTS'],
    },
    {
      id: 'payments',
      label: 'Payments & Gateway',
      icon: <DollarSign size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'STAFF_ACCOUNTS'],
    },
    {
      id: 'audit-logs',
      label: 'Audit Trail',
      icon: <ShieldCheck size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'],
    },
    {
      id: 'tenant-config',
      label: 'Settings & Branding',
      icon: <Settings size={17} />,
      roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'],
    },
  ];

  // Platform (Super Admin)
  const platformNavItems: NavItem[] = [
    {
      id: 'colleges-directory',
      label: 'Colleges & Tenants',
      icon: <Building2 size={17} />,
      roles: ['SUPER_ADMIN'],
    },
    {
      id: 'impersonation',
      label: 'Tenant Impersonation',
      icon: <UserCheck size={17} />,
      roles: ['SUPER_ADMIN'],
    },
  ];

  const filterByRole = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(role);
    });
  };

  const filteredAcademic = filterByRole(academicNavItems);
  const filteredServiceDesk = filterByRole(serviceDeskNavItems);
  const filteredAdmin = filterByRole(adminNavItems);
  const filteredPlatform = filterByRole(platformNavItems);

  const renderNavGroup = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        {!isCollapsed && (
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] block mb-1">
            {title}
          </span>
        )}
        <nav className="space-y-0.5">
          {items.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{ borderRadius: '4px' }}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors text-left cursor-pointer',
                  isActive
                    ? 'bg-[#EDF3FA] text-[#4779B8] font-semibold'
                    : 'text-[#667085] hover:text-[#202938] hover:bg-[#F5F6F8]'
                )}
              >
                <span className={cn(isActive ? 'text-[#4779B8]' : 'text-[#667085]')}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{ borderRadius: '4px' }}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold',
                      isActive ? 'bg-[#4779B8] text-white' : 'bg-[#F2F4F7] text-[#667085]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-[#E5E7EB] flex flex-col justify-between transition-all duration-200 select-none z-30 sticky top-0',
        isCollapsed ? 'w-[64px]' : 'w-[230px]'
      )}
    >
      {/* Brand & Logo Header */}
      <div>
        <div className="h-[64px] px-4 flex items-center justify-between border-b border-[#E5E7EB]">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div
                style={{ borderRadius: '4px' }}
                className="w-8 h-8 bg-[#4779B8] flex items-center justify-center text-white font-bold text-sm tracking-wide shadow-sm shrink-0"
              >
                CQ
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px] text-[#202938] leading-tight tracking-tight">
                  CollegeQuery
                </span>
                <span className="text-[10px] uppercase font-bold text-[#4779B8] tracking-wider mt-0.5">
                  {role.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div
              style={{ borderRadius: '4px' }}
              className="w-8 h-8 bg-[#4779B8] flex items-center justify-center text-white font-bold text-sm mx-auto shadow-sm"
            >
              CQ
            </div>
          )}
          <button
            onClick={onToggle}
            style={{ borderRadius: '4px' }}
            className="p-1 text-[#98A2B3] hover:text-[#202938] hover:bg-[#F5F6F8] transition-colors ml-auto hidden md:block"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {renderNavGroup('Main', mainNavItems)}
          {renderNavGroup('Academic & Campus', filteredAcademic)}
          {renderNavGroup('Service Desk', filteredServiceDesk)}
          {renderNavGroup('Administration', filteredAdmin)}
          {renderNavGroup('SaaS Platform', filteredPlatform)}
        </div>
      </div>

      {/* Bottom User Info */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div
              style={{ borderRadius: '4px' }}
              className="w-8 h-8 bg-[#EDF3FA] text-[#4779B8] font-semibold text-xs flex items-center justify-center uppercase shrink-0 border border-[#D0D5DD]"
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-medium text-[#202938] truncate leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] text-[#667085] truncate leading-tight mt-0.5">
                {user.email}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{ borderRadius: '4px' }}
            className="w-8 h-8 bg-[#EDF3FA] text-[#4779B8] font-semibold text-xs flex items-center justify-center uppercase mx-auto border border-[#D0D5DD]"
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
        )}
      </div>
    </aside>
  );
};
