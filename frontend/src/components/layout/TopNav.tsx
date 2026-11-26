'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Building,
  UserCheck,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export const TopNav: React.FC<{ onNewTicket: () => void }> = ({ onNewTicket }) => {
  const { role, switchRole, user, tenant, activeView, setActiveView } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const availableRoles: { role: UserRole; label: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin (SaaS)' },
    { role: 'COLLEGE_ADMIN', label: 'College Admin' },
    { role: 'PRINCIPAL', label: 'Principal' },
    { role: 'HOD', label: 'Head of Dept (CSE)' },
    { role: 'FACULTY', label: 'Faculty Member' },
    { role: 'STUDENT', label: 'Student (Rohan)' },
    { role: 'STAFF_ACCOUNTS', label: 'Accounts Staff' },
    { role: 'STAFF_EXAMINATION', label: 'Exam Controller Staff' },
    { role: 'STAFF_SUPPORT', label: 'Helpdesk & Support' },
  ];

  const breadcrumbLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    tickets: role === 'STUDENT' ? 'My Queries' : 'Tickets & Queries',
    'knowledge-base': 'Knowledge Base',
    faqs: 'Frequently Asked Questions',
    academic: 'Academic Setup',
    students: 'Students Directory',
    'faculty-staff': 'Faculty & Staff Governance',
    'sla-categories': 'Categories & SLA Policies',
    feedback: 'Student Feedback & CSAT',
    analytics: 'Analytics & SLA Compliance',
    reports: 'Export Reports',
    subscriptions: 'Subscriptions & Billing',
    'audit-logs': 'Security Audit Trail',
    'tenant-config': 'Tenant Configuration & Branding',
    'colleges-directory': 'Colleges Directory',
    impersonation: 'Tenant Impersonation',
  };

  return (
    <header className="h-[64px] bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-20 w-full select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-[#667085]">CollegeQuery</span>
        <span className="text-[#D0D5DD]">/</span>
        <span className="text-[13px] font-semibold text-[#202938]">
          {breadcrumbLabels[activeView] || 'Overview'}
        </span>

        {/* Tenant indicator badge */}
        {role !== 'SUPER_ADMIN' && (
          <div
            style={{ borderRadius: '4px' }}
            className="ml-3 hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#667085]"
          >
            <Building size={13} className="text-[#4779B8]" />
            <span className="font-medium text-[#202938] truncate max-w-[200px]">
              {tenant.name}
            </span>
            <span
              style={{ borderRadius: '4px' }}
              className="px-1 text-[10px] font-bold bg-[#EDF3FA] text-[#4779B8] ml-1"
            >
              {tenant.plan}
            </span>
          </div>
        )}
      </div>

      {/* Right: Search, Notifications, Role Switcher, Quick Action */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative hidden md:block w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search tickets, FAQs, articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: '4px' }}
            className="w-full h-[36px] pl-9 pr-3 text-[13px] bg-[#F5F6F8] text-[#202938] border border-transparent placeholder-[#98A2B3] focus:bg-white focus:border-[#4779B8] focus:ring-1 focus:ring-[#4779B8] focus:outline-none transition-colors"
          />
        </div>

        {/* Role Switcher (Simulate Any Persona Instantly) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{ borderRadius: '4px' }}
            className="h-[36px] px-2.5 flex items-center gap-1.5 border border-[#D0D5DD] bg-white text-[12px] font-medium text-[#202938] hover:bg-[#F9FAFB] transition-colors shadow-none"
          >
            <UserCheck size={14} className="text-[#4779B8]" />
            <span className="hidden sm:inline font-semibold text-[#4779B8]">
              Role:
            </span>
            <span className="truncate max-w-[120px]">
              {role.replace('STAFF_', '')}
            </span>
            <ChevronDown size={14} className="text-[#98A2B3]" />
          </button>

          {showRoleMenu && (
            <div
              style={{ borderRadius: '4px' }}
              className="absolute right-0 mt-1 w-56 bg-white border border-[#E5E7EB] shadow-lg py-1.5 z-50 text-[13px]"
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider border-b border-[#E5E7EB] mb-1">
                Switch Role Persona
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchRole(r.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#F5F6F8] flex items-center justify-between cursor-pointer ${role === r.role ? 'text-[#4779B8] font-semibold bg-[#EDF3FA]' : 'text-[#202938]'
                    }`}
                >
                  <span>{r.label}</span>
                  {role === r.role && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Ticket Button */}
        {(role === 'STUDENT' || role === 'COLLEGE_ADMIN' || role === 'STAFF_SUPPORT') && (
          <Button
            variant="primary"
            size="md"
            onClick={onNewTicket}
            className="flex items-center gap-1.5 shadow-none"
          >
            <Plus size={16} />
            <span>New Ticket</span>
          </Button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ borderRadius: '4px' }}
            className="p-2 text-[#667085] hover:text-[#202938] hover:bg-[#F5F6F8] transition-colors relative"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D9534F] rounded-full" />
          </button>

          {showNotifications && (
            <div
              style={{ borderRadius: '4px' }}
              className="absolute right-0 mt-1 w-80 bg-white border border-[#E5E7EB] shadow-lg p-3 z-50 text-[13px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-2 font-semibold text-[#202938]">
                <span>Notifications</span>
                <span className="text-[11px] text-[#4779B8] cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="p-2 bg-[#EDF3FA] rounded border border-[#C5DAF0]">
                  <p className="font-medium text-[#202938]">
                    New assignment: CQ-2026-00101
                  </p>
                  <p className="text-[#667085] mt-0.5">
                    Assigned to Finance Desk • 2 hours ago
                  </p>
                </div>
                <div className="p-2 hover:bg-[#F5F6F8] rounded border border-transparent">
                  <p className="font-medium text-[#202938]">
                    SLA Alert: CQ-2026-00098 escalated
                  </p>
                  <p className="text-[#667085] mt-0.5">
                    Deadline elapsed for Bonafide Certificate • 4 hours ago
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
