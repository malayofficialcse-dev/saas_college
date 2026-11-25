'use client';

import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Users,
  Ticket,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';

export const SuperAdminDashboard: React.FC = () => {
  const [impersonateModal, setImpersonateModal] = useState(false);
  const [targetCollege, setTargetCollege] = useState('Apex Institute of Technology');
  const [reason, setReason] = useState('');
  const [impersonatedSuccess, setImpersonatedSuccess] = useState(false);

  const colleges = [
    {
      id: 'c-1',
      name: 'Apex Institute of Technology & Management',
      slug: 'apex-institute',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      studentsCount: 1190,
      queriesCount: 142,
      renewalDate: '2026-12-15',
    },
    {
      id: 'c-2',
      name: 'St. Jude College of Engineering',
      slug: 'stjude-engineering',
      plan: 'STARTER',
      status: 'ACTIVE',
      studentsCount: 680,
      queriesCount: 78,
      renewalDate: '2026-12-01',
    },
    {
      id: 'c-3',
      name: 'National University of Sciences',
      slug: 'nus-india',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      studentsCount: 6400,
      queriesCount: 890,
      renewalDate: '2027-04-10',
    },
    {
      id: 'c-4',
      name: 'Zenith Business Academy',
      slug: 'zenith-mba',
      plan: 'FREE',
      status: 'ACTIVE',
      studentsCount: 95,
      queriesCount: 18,
      renewalDate: '2026-11-30',
    },
    {
      id: 'c-5',
      name: 'Heritage Polytechnic Institute',
      slug: 'heritage-poly',
      plan: 'STARTER',
      status: 'SUSPENDED',
      studentsCount: 320,
      queriesCount: 42,
      renewalDate: '2026-11-10',
    },
  ];

  const handleImpersonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setImpersonatedSuccess(true);
    setTimeout(() => {
      setImpersonateModal(false);
      setImpersonatedSuccess(false);
      setReason('');
    }, 1500);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            SaaS Platform Overview
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Cross-tenant performance, subscription MRR/ARR, tenant isolation, and emergency impersonation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setImpersonateModal(true)}
            className="flex items-center gap-1.5"
          >
            <UserCheck size={16} />
            <span>Impersonate College</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Onboarded Colleges"
          value="48"
          change="+3 this month"
          isPositive={true}
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(248900)}
          change="+14.2%"
          isPositive={true}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          label="Total Active Students"
          value="18,420"
          change="+1,200 enrolled"
          isPositive={true}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Platform Queries Processed"
          value="4,820"
          subtext="98.1% SLA compliant"
          icon={<Ticket size={18} />}
        />
      </div>

      {/* College Directory Table */}
      <Card
        title="College Tenants & Subscription Health"
        subtitle="Live multi-tenant instances with quota and subscription compliance status."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>College Name & Slug</TableHead>
              <TableHead>Subscription Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled Students</TableHead>
              <TableHead>Active Tickets</TableHead>
              <TableHead>Next Renewal</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.map((col) => (
              <TableRow key={col.id}>
                <TableCell>
                  <div className="font-medium text-[#202938]">{col.name}</div>
                  <div className="text-[11px] text-[#667085]">{col.slug}.collegequery.app</div>
                </TableCell>
                <TableCell>
                  <span
                    style={{ borderRadius: '4px' }}
                    className="px-2 py-0.5 text-[11px] font-semibold uppercase bg-[#EDF3FA] text-[#4779B8] border border-[#C5DAF0]"
                  >
                    {col.plan}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={col.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {col.status}
                  </Badge>
                </TableCell>
                <TableCell>{col.studentsCount.toLocaleString()}</TableCell>
                <TableCell>{col.queriesCount}</TableCell>
                <TableCell className="text-[12px] text-[#667085]">
                  {formatDate(col.renewalDate)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetCollege(col.name);
                      setImpersonateModal(true);
                    }}
                  >
                    Audit & Access
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Impersonation Modal */}
      <Modal
        isOpen={impersonateModal}
        onClose={() => setImpersonateModal(false)}
        title="Generate Secure Tenant Impersonation Token"
        description={`Access ${targetCollege} with full Super Admin privileges. This action is permanently recorded in the immutable audit trail.`}
      >
        {impersonatedSuccess ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <CheckCircle size={36} className="text-[#26966A] mb-2" />
            <h4 className="text-[15px] font-semibold text-[#202938]">
              Impersonation Token Issued
            </h4>
            <p className="text-[12px] text-[#667085] mt-1 max-w-sm">
              Session established for 30 minutes. An audit log event has been committed with your IP address and reason.
            </p>
          </div>
        ) : (
          <form onSubmit={handleImpersonate} className="space-y-4">
            <div
              style={{ borderRadius: '4px' }}
              className="p-3 bg-[#FDF5E8] border border-[#F4DCB4] flex items-start gap-2 text-[12px] text-[#202938]"
            >
              <ShieldAlert size={16} className="text-[#D99A3D] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#D99A3D]">Security Requirement:</span>{' '}
                Reason must be minimum 5 characters. Original Super Admin identity is preserved across all child operations.
              </div>
            </div>

            <Input
              label="Target College Tenant"
              value={targetCollege}
              disabled
              className="bg-[#F5F6F8]"
            />

            <Input
              label="Audit Justification / Ticket Reference"
              placeholder="e.g. Resolving payment webhook mismatch reported in ticket CQ-SUPPORT-102"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button variant="outline" type="button" onClick={() => setImpersonateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={reason.trim().length < 5}>
                Issue Token & Enter
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
