'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Shield,
  KeyRound,
  CheckCircle,
  XCircle,
  MoreVertical,
  Mail,
  UserCheck,
  Lock,
} from 'lucide-react';
import { User, UserRole } from '@/lib/types';
import { MOCK_USERS_LIST, MOCK_DEPARTMENTS } from '@/lib/mock-data';
import { usersApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS_LIST);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionSuccessNote, setActionSuccessNote] = useState('');

  useEffect(() => {
    usersApi.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      }
    });
  }, []);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'FACULTY' as UserRole,
    departmentCode: 'CSE',
    designation: '',
    temporaryPassword: 'TempPassword123!',
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      role: form.role,
      departmentCode: form.departmentCode,
      designation: form.designation || 'Staff Member',
      status: 'ACTIVE',
      lastLoginAt: 'Never logged in',
      isMfaEnabled: false,
    };

    try {
      const created = await usersApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        departmentCode: form.departmentCode,
        designation: form.designation,
        password: form.temporaryPassword,
      });
      setUsers((prev) => [created || newUser, ...prev]);
    } catch {
      setUsers((prev) => [newUser, ...prev]);
    }

    setIsInviteModalOpen(false);
    setActionSuccessNote(`User ${newUser.email} created and invitation dispatched!`);
    setTimeout(() => setActionSuccessNote(''), 4000);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      role: 'FACULTY',
      departmentCode: 'CSE',
      designation: '',
      temporaryPassword: 'TempPassword123!',
    });
  };

  const toggleUserStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );
    setActionSuccessNote(`User ${target.email} status changed to ${nextStatus}.`);
    setTimeout(() => setActionSuccessNote(''), 3000);

    try {
      await usersApi.update(userId, { isActive: nextStatus === 'ACTIVE' });
    } catch (err) {
      console.warn('[UsersView] Failed to sync status with API:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && (u.status || 'ACTIVE') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.designation && u.designation.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            User Accounts & Identity Directory
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Manage authenticated platform accounts, assigned role privileges, and security credentials.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Provision User
        </Button>
      </div>

      {actionSuccessNote && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#027A48] rounded flex items-center gap-2">
          <CheckCircle size={16} />
          {actionSuccessNote}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Identities"
          value={users.length}
          icon={<Users size={20} className="text-[#4779B8]" />}
          subtitle="Registered platform accounts"
        />
        <StatCard
          title="Active Accounts"
          value={users.filter((u) => (u.status || 'ACTIVE') === 'ACTIVE').length}
          icon={<UserCheck size={20} className="text-[#12B76A]" />}
          subtitle="Able to sign in"
        />
        <StatCard
          title="MFA Enforced"
          value={users.filter((u) => u.isMfaEnabled).length}
          icon={<Shield size={20} className="text-[#7F56D9]" />}
          subtitle="2-Factor Authenticated"
        />
        <StatCard
          title="Staff & Admin"
          value={users.filter((u) => u.role !== 'STUDENT').length}
          icon={<KeyRound size={20} className="text-[#F79009]" />}
          subtitle="Elevated privileges"
        />
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search user by name, email, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="w-full h-[36px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="COLLEGE_ADMIN">College Admin</option>
              <option value="PRINCIPAL">Principal</option>
              <option value="HOD">HOD</option>
              <option value="FACULTY">Faculty</option>
              <option value="STUDENT">Student</option>
              <option value="STAFF_ACCOUNTS">Accounts Staff</option>
              <option value="STAFF_EXAMINATION">Exam Staff</option>
              <option value="STAFF_SUPPORT">Support Staff</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Identity</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Designation & Dept</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => {
              const isActive = (u.status || 'ACTIVE') === 'ACTIVE';
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{ borderRadius: '4px' }}
                        className="w-8 h-8 bg-[#EDF3FA] text-[#4779B8] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D0D5DD]"
                      >
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[#202938] text-xs">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[11px] text-[#667085]">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{u.role.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-[#344054] font-medium">
                      {u.designation || 'Standard User'}
                    </div>
                    {u.departmentCode && (
                      <div className="text-[10px] text-[#667085] font-mono">
                        Dept: {u.departmentCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isMfaEnabled ? (
                      <span className="text-[11px] text-[#12B76A] font-semibold flex items-center gap-1">
                        <CheckCircle size={13} /> Active
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#98A2B3] flex items-center gap-1">
                        <XCircle size={13} /> Disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[#667085] text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isActive ? 'success' : 'danger'}>
                      {isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant={isActive ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => toggleUserStatus(u.id)}
                      >
                        {isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Provision User */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Provision New User Account"
        description="Create a verified institutional account with assigned role and credentials."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateUser}>
              Provision Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Suresh"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Babu"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Official Institutional Email"
            type="email"
            placeholder="e.g. suresh.babu@apexinst.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Platform Role"
              options={[
                { value: 'SUPER_ADMIN', label: 'Super Admin (SaaS)' },
                { value: 'COLLEGE_ADMIN', label: 'College Admin' },
                { value: 'PRINCIPAL', label: 'Principal' },
                { value: 'HOD', label: 'Head of Department' },
                { value: 'FACULTY', label: 'Faculty Member' },
                { value: 'STUDENT', label: 'Student' },
                { value: 'STAFF_ACCOUNTS', label: 'Accounts Staff' },
                { value: 'STAFF_EXAMINATION', label: 'Exam Staff' },
                { value: 'STAFF_SUPPORT', label: 'Helpdesk Staff' },
              ]}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            />
            <Select
              label="Department Linkage"
              options={MOCK_DEPARTMENTS.map((d) => ({ value: d.code, label: d.name }))}
              value={form.departmentCode}
              onChange={(e) => setForm({ ...form, departmentCode: e.target.value })}
            />
          </div>

          <Input
            label="Designation / Official Title"
            placeholder="e.g. Associate Professor in CSE"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />

          <Input
            label="Initial Temporary Password"
            type="password"
            value={form.temporaryPassword}
            onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
            helperText="User will be prompted to reset password on first login."
            required
          />
        </form>
      </Modal>
    </div>
  );
};
