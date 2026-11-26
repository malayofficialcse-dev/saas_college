'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Briefcase,
  Building,
} from 'lucide-react';
import { StaffMember, UserRole } from '@/lib/types';
import { MOCK_STAFF, MOCK_DEPARTMENTS } from '@/lib/mock-data';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';

export const FacultyStaffView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions'>('directory');
  const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'FACULTY' as UserRole,
    staffCategory: 'FACULTY',
    departmentCode: 'CSE',
    designation: '',
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeCode || !form.firstName || !form.lastName || !form.email) return;

    const newStaff: StaffMember = {
      id: `stf-${Date.now()}`,
      employeeCode: form.employeeCode.toUpperCase(),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || '+91 94440 00000',
      role: form.role,
      staffCategory: form.staffCategory,
      departmentCode: form.departmentCode,
      designation: form.designation || 'Staff Officer',
      status: 'ACTIVE',
      assignedQueriesCount: 0,
      resolvedQueriesCount: 0,
    };

    setStaff((prev) => [...prev, newStaff]);
    setIsAddModalOpen(false);
    setForm({
      employeeCode: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'FACULTY',
      staffCategory: 'FACULTY',
      departmentCode: 'CSE',
      designation: '',
    });
  };

  const filteredStaff = staff.filter((s) => {
    if (deptFilter !== 'ALL' && s.departmentCode !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.employeeCode.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const PERMISSIONS_MATRIX = [
    {
      permission: 'Raise Inquiries / Tickets',
      roles: {
        STUDENT: true,
        FACULTY: true,
        STAFF_SUPPORT: true,
        HOD: true,
        PRINCIPAL: true,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'View All Dept Tickets',
      roles: {
        STUDENT: false,
        FACULTY: true,
        STAFF_SUPPORT: true,
        HOD: true,
        PRINCIPAL: true,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'Resolve & Close Inquiries',
      roles: {
        STUDENT: false,
        FACULTY: true,
        STAFF_SUPPORT: true,
        HOD: true,
        PRINCIPAL: true,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'Reassign Across Depts',
      roles: {
        STUDENT: false,
        FACULTY: false,
        STAFF_SUPPORT: true,
        HOD: true,
        PRINCIPAL: true,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'Configure SLA & Deadlines',
      roles: {
        STUDENT: false,
        FACULTY: false,
        STAFF_SUPPORT: false,
        HOD: false,
        PRINCIPAL: true,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'Access Billing & Invoices',
      roles: {
        STUDENT: false,
        FACULTY: false,
        STAFF_SUPPORT: false,
        HOD: false,
        PRINCIPAL: false,
        COLLEGE_ADMIN: true,
        SUPER_ADMIN: true,
      },
    },
    {
      permission: 'Multi-Tenant Impersonation',
      roles: {
        STUDENT: false,
        FACULTY: false,
        STAFF_SUPPORT: false,
        HOD: false,
        PRINCIPAL: false,
        COLLEGE_ADMIN: false,
        SUPER_ADMIN: true,
      },
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Faculty & Staff Governance
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Manage academic instructors, administrative officers, and security role permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Staff"
          value={staff.length}
          icon={<Users size={20} className="text-[#4779B8]" />}
          subtitle="Instructors & operators"
        />
        <StatCard
          title="Faculty Members"
          value={staff.filter((s) => s.staffCategory === 'FACULTY').length}
          icon={<Briefcase size={20} className="text-[#12B76A]" />}
          subtitle="Course evaluators"
        />
        <StatCard
          title="Active Inquiries Assigned"
          value={staff.reduce((acc, curr) => acc + curr.assignedQueriesCount, 0)}
          icon={<Building size={20} className="text-[#F79009]" />}
          subtitle="Workload distribution"
        />
        <StatCard
          title="Total Inquiries Solved"
          value={staff.reduce((acc, curr) => acc + curr.resolvedQueriesCount, 0)}
          icon={<Shield size={20} className="text-[#7F56D9]" />}
          subtitle="Lifetime resolved"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <Tabs
          tabs={[
            { id: 'directory', label: `Staff Directory (${staff.length})` },
            { id: 'permissions', label: 'Role & Permissions Matrix' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />

        {activeTab === 'directory' && (
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                placeholder="Search staff or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[34px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[34px] px-2 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none"
            >
              <option value="ALL">All Depts</option>
              {MOCK_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Directory */}
      {activeTab === 'directory' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Role & Access Level</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Workload (Active / Done)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{ borderRadius: '4px' }}
                        className="w-8 h-8 bg-[#EDF3FA] text-[#4779B8] font-bold text-xs flex items-center justify-center shrink-0"
                      >
                        {member.firstName[0]}
                        {member.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[#202938]">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-[11px] text-[#667085]">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                    {member.employeeCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{member.role.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{member.departmentCode}</Badge>
                  </TableCell>
                  <TableCell className="text-[#344054] text-xs font-medium">
                    {member.designation}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="font-semibold text-[#F79009]">
                        {member.assignedQueriesCount} pending
                      </span>
                      <span className="text-[#98A2B3]"> / </span>
                      <span className="text-[#12B76A]">{member.resolvedQueriesCount} solved</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab 2: Permissions Matrix */}
      {activeTab === 'permissions' && (
        <Card noPadding>
          <div className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <h3 className="font-semibold text-[14px] text-[#202938]">
              Role-Based Access Control (RBAC) Matrix
            </h3>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Defines operational boundaries and sensitive actions across college administrative tiers.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Permission Capability</TableHead>
                  <TableHead className="text-center">Student</TableHead>
                  <TableHead className="text-center">Faculty</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  <TableHead className="text-center">HOD</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="text-center">College Admin</TableHead>
                  <TableHead className="text-center">Super Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS_MATRIX.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-[#202938] text-xs">
                      {row.permission}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.STUDENT ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.FACULTY ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.STAFF_SUPPORT ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.HOD ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.PRINCIPAL ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.COLLEGE_ADMIN ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.roles.SUPER_ADMIN ? (
                        <CheckCircle2 size={16} className="text-[#12B76A] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#D0D5DD] mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal: Add Staff */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Faculty or Staff Member"
        description="Invite a campus staff member and assign their institutional responsibility."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddStaff}>
              Add Staff Member
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Anand"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Varma"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Employee ID Code"
              placeholder="e.g. EMP-CSE-020"
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              required
            />
            <Input
              label="Official Email"
              type="email"
              placeholder="e.g. a.varma@apexinst.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Staff Role"
              options={[
                { value: 'FACULTY', label: 'Faculty Member' },
                { value: 'HOD', label: 'Head of Department' },
                { value: 'STAFF_ACCOUNTS', label: 'Accounts Staff' },
                { value: 'STAFF_EXAMINATION', label: 'Exam Controller Staff' },
                { value: 'STAFF_SUPPORT', label: 'Helpdesk & Support' },
                { value: 'PRINCIPAL', label: 'Principal' },
                { value: 'COLLEGE_ADMIN', label: 'College Admin' },
              ]}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            />
            <Select
              label="Department"
              options={MOCK_DEPARTMENTS.map((d) => ({ value: d.code, label: d.name }))}
              value={form.departmentCode}
              onChange={(e) => setForm({ ...form, departmentCode: e.target.value })}
            />
          </div>

          <Input
            label="Designation / Title"
            placeholder="e.g. Senior Professor & Academic Advisor"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
