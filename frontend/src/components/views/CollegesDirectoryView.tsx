'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Mail,
  Users,
  Shield,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { CollegeItem } from '@/lib/types';
import { MOCK_COLLEGES } from '@/lib/mock-data';
import { collegesApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/lib/auth-context';

export const CollegesDirectoryView: React.FC = () => {
  const { setActiveView } = useAuth();
  const [colleges, setColleges] = useState<CollegeItem[]>(MOCK_COLLEGES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

  useEffect(() => {
    collegesApi.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) setColleges(data);
    });
  }, []);

  const [form, setForm] = useState({
    name: '',
    code: '',
    domain: '',
    location: '',
    adminEmail: '',
    plan: 'PROFESSIONAL' as const,
  });

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.adminEmail) return;

    const newCol: CollegeItem = {
      id: `col-${Date.now()}`,
      tenantId: `ten-${form.code.toLowerCase()}-${Date.now().toString().slice(-2)}`,
      name: form.name,
      code: form.code.toUpperCase(),
      domain: form.domain || `${form.code.toLowerCase()}.edu`,
      location: form.location || 'India',
      adminEmail: form.adminEmail,
      studentCount: 0,
      staffCount: 1,
      plan: form.plan,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await collegesApi.create({
        name: form.name,
        code: form.code.toUpperCase(),
        domain: form.domain || `${form.code.toLowerCase()}.edu`,
        location: form.location || 'India',
        adminEmail: form.adminEmail,
        plan: form.plan,
      });
      setColleges((prev) => [created || newCol, ...prev]);
    } catch {
      setColleges((prev) => [newCol, ...prev]);
    }
    setIsOnboardModalOpen(false);
    setForm({
      name: '',
      code: '',
      domain: '',
      location: '',
      adminEmail: '',
      plan: 'PROFESSIONAL',
    });
  };

  const filteredColleges = colleges.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.adminEmail.toLowerCase().includes(q);
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
            Colleges & Tenant Management
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            SaaS multi-tenant directory, isolation status, and institutional provisioning.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={() => setIsOnboardModalOpen(true)}
        >
          Onboard College
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Colleges"
          value={colleges.length}
          icon={<Building2 size={20} className="text-[#4779B8]" />}
          subtitle="Multi-tenant instances"
        />
        <StatCard
          title="Active Students"
          value={colleges.reduce((acc, curr) => acc + curr.studentCount, 0).toLocaleString()}
          icon={<Users size={20} className="text-[#12B76A]" />}
          subtitle="Across all institutions"
        />
        <StatCard
          title="Total Staff Users"
          value={colleges.reduce((acc, curr) => acc + curr.staffCount, 0).toLocaleString()}
          icon={<Shield size={20} className="text-[#7F56D9]" />}
          subtitle="Faculty & administrators"
        />
        <StatCard
          title="Enterprise Tier"
          value={colleges.filter((c) => c.plan === 'ENTERPRISE').length}
          icon={<Globe size={20} className="text-[#F79009]" />}
          subtitle="High volume instances"
        />
      </div>

      {/* Search & Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search college name, code, domain, or admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="w-full h-[36px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ borderRadius: '4px' }}
            className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROVISIONING">Provisioning</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </Card>

      {/* Colleges Table */}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>College / University</TableHead>
              <TableHead>Tenant Code</TableHead>
              <TableHead>Campus Domain</TableHead>
              <TableHead>Active Students</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredColleges.map((col) => (
              <TableRow key={col.id}>
                <TableCell>
                  <div className="font-semibold text-[#202938] text-xs">{col.name}</div>
                  <div className="text-[11px] text-[#667085]">{col.location}</div>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                  {col.code}
                </TableCell>
                <TableCell className="text-xs text-[#344054] font-mono">
                  {col.domain}
                </TableCell>
                <TableCell className="text-xs font-semibold text-[#202938]">
                  {col.studentCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-[#667085]">{col.staffCount}</TableCell>
                <TableCell>
                  <Badge variant={col.plan === 'ENTERPRISE' ? 'primary' : 'neutral'}>
                    {col.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={col.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {col.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ExternalLink size={12} />}
                    onClick={() => setActiveView('impersonation')}
                  >
                    Impersonate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Onboard College */}
      <Modal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        title="Onboard College Tenant"
        description="Provision an isolated multi-tenant college instance on the CollegeQuery SaaS platform."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOnboardModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleOnboard}>
              Provision Tenant
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOnboard} className="space-y-4">
          <Input
            label="College / Institution Full Name"
            placeholder="e.g. Royal Institute of Science & Technology"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tenant Code"
              placeholder="e.g. RIST"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
            <Input
              label="Primary Custom Domain"
              placeholder="e.g. rist.edu.in"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location"
              placeholder="e.g. Chennai, Tamil Nadu"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Input
              label="Director / Admin Email"
              type="email"
              placeholder="admin@rist.edu.in"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              required
            />
          </div>

          <Select
            label="Initial Subscription Plan"
            options={[
              { value: 'FREE', label: 'Free Tier (Up to 100 students)' },
              { value: 'STARTER', label: 'Starter Tier (Up to 1,000 students)' },
              { value: 'PROFESSIONAL', label: 'Professional Tier (Up to 5,000 students)' },
              { value: 'ENTERPRISE', label: 'Enterprise Tier (Unlimited)' },
            ]}
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as any })}
          />
        </form>
      </Modal>
    </div>
  );
};
