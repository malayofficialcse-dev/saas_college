'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Layers,
  AlertTriangle,
  Plus,
  ShieldAlert,
  ArrowUpRight,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { QueryCategoryItem, SlaPolicyItem, EscalationRule, QueryPriority } from '@/lib/types';
import {
  MOCK_QUERY_CATEGORIES,
  MOCK_SLA_POLICIES,
  MOCK_ESCALATION_RULES,
  MOCK_DEPARTMENTS,
} from '@/lib/mock-data';
import { slaApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';

export const SlaCategoriesView: React.FC<{ initialTab?: 'categories' | 'policies' | 'escalations' }> = ({
  initialTab = 'categories',
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'policies' | 'escalations'>(initialTab);
  const [categories, setCategories] = useState<QueryCategoryItem[]>(MOCK_QUERY_CATEGORIES);
  const [policies, setPolicies] = useState<SlaPolicyItem[]>(MOCK_SLA_POLICIES);
  const [escalations] = useState<EscalationRule[]>(MOCK_ESCALATION_RULES);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    slaApi.getCategories().then((data) => {
      if (Array.isArray(data) && data.length > 0) setCategories(data);
    });
    slaApi.getPolicies().then((data) => {
      if (Array.isArray(data) && data.length > 0) setPolicies(data);
    });
  }, []);

  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    description: '',
    departmentCode: 'CSE',
    defaultPriority: 'MEDIUM' as QueryPriority,
    responseTimeHours: 6,
    resolutionTimeHours: 24,
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name || !catForm.code) return;

    const newCat: QueryCategoryItem = {
      id: `cat-${Date.now()}`,
      name: catForm.name,
      code: catForm.code.toUpperCase().replace(/\s+/g, '_'),
      description: catForm.description,
      departmentCode: catForm.departmentCode,
      defaultPriority: catForm.defaultPriority,
      responseTimeHours: Number(catForm.responseTimeHours),
      resolutionTimeHours: Number(catForm.resolutionTimeHours),
      isActive: true,
    };

    try {
      const created = await slaApi.createCategory({
        name: catForm.name,
        code: catForm.code.toUpperCase().replace(/\s+/g, '_'),
        description: catForm.description,
        departmentCode: catForm.departmentCode,
        defaultPriority: catForm.defaultPriority,
        responseTimeHours: Number(catForm.responseTimeHours),
        resolutionTimeHours: Number(catForm.resolutionTimeHours),
      });
      setCategories((prev) => [...prev, created || newCat]);
    } catch {
      setCategories((prev) => [...prev, newCat]);
    }
    setIsCategoryModalOpen(false);
    setCatForm({
      name: '',
      code: '',
      description: '',
      departmentCode: 'CSE',
      defaultPriority: 'MEDIUM',
      responseTimeHours: 6,
      resolutionTimeHours: 24,
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Categories & SLA Policies
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Configure inquiry taxonomy, target response deadlines, and automated escalation hierarchies.
          </p>
        </div>

        {activeTab === 'categories' && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            New Category
          </Button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Categories"
          value={categories.filter((c) => c.isActive).length}
          icon={<Layers size={20} className="text-[#4779B8]" />}
          subtitle="Department routed"
        />
        <StatCard
          title="SLA Tier Policies"
          value={policies.length}
          icon={<Clock size={20} className="text-[#12B76A]" />}
          subtitle="Urgent to Low priorities"
        />
        <StatCard
          title="Fastest SLA Target"
          value="1 Hour"
          icon={<AlertTriangle size={20} className="text-[#F79009]" />}
          subtitle="Urgent first-response"
        />
        <StatCard
          title="Escalation Tiers"
          value={escalations.length}
          icon={<ShieldAlert size={20} className="text-[#7F56D9]" />}
          subtitle="Staff -> HOD -> Principal"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'categories', label: `Inquiry Categories (${categories.length})` },
          { id: 'policies', label: `SLA Priority Policies (${policies.length})` },
          { id: 'escalations', label: `Escalation Hierarchies (${escalations.length})` },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* Tab 1: Categories */}
      {activeTab === 'categories' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Assigned Department</TableHead>
                <TableHead>Default Priority</TableHead>
                <TableHead>1st Response Target</TableHead>
                <TableHead>Resolution Target</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="font-medium text-[#202938]">{cat.name}</div>
                    <div className="text-[11px] text-[#667085] max-w-sm truncate">{cat.description}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#667085]">{cat.code}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{cat.departmentCode}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        cat.defaultPriority === 'URGENT'
                          ? 'danger'
                          : cat.defaultPriority === 'HIGH'
                            ? 'warning'
                            : cat.defaultPriority === 'MEDIUM'
                              ? 'primary'
                              : 'neutral'
                      }
                    >
                      {cat.defaultPriority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#344054] text-xs font-semibold">
                    {cat.responseTimeHours}h
                  </TableCell>
                  <TableCell className="text-[#344054] text-xs font-semibold">
                    {cat.resolutionTimeHours}h
                  </TableCell>
                  <TableCell>
                    <Badge variant={cat.isActive ? 'success' : 'neutral'}>
                      {cat.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab 2: SLA Policies */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#202938]">{p.name}</h3>
                    <Badge
                      variant={
                        p.priority === 'URGENT'
                          ? 'danger'
                          : p.priority === 'HIGH'
                            ? 'warning'
                            : p.priority === 'MEDIUM'
                              ? 'primary'
                              : 'neutral'
                      }
                    >
                      {p.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#667085] mt-1">
                    Enforced automatically when ticket priority is marked {p.priority}.
                  </p>
                </div>
                <Badge variant={p.isEnabled ? 'success' : 'neutral'}>
                  {p.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 text-center">
                <div className="p-2 bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[11px] text-[#667085] block">First Reply</span>
                  <span className="text-[16px] font-bold text-[#202938]">{p.responseTimeHours}h</span>
                </div>
                <div className="p-2 bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[11px] text-[#667085] block">Resolution</span>
                  <span className="text-[16px] font-bold text-[#202938]">{p.resolutionTimeHours}h</span>
                </div>
                <div className="p-2 bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[11px] text-[#667085] block">Escalate In</span>
                  <span className="text-[16px] font-bold text-[#B42318]">{p.escalationHours}h</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Escalation Hierarchy */}
      {activeTab === 'escalations' && (
        <Card noPadding>
          <div className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <h3 className="font-semibold text-[14px] text-[#202938]">
              Automated Incident Escalation Workflow
            </h3>
            <p className="text-[12px] text-[#667085] mt-0.5">
              When tickets breach designated response thresholds, ownership is automatically elevated.
            </p>
          </div>
          <div className="p-6 space-y-6">
            {escalations.map((rule, idx) => (
              <div key={rule.id} className="flex items-start gap-4">
                <div
                  style={{ borderRadius: '4px' }}
                  className="w-10 h-10 bg-[#EDF3FA] text-[#4779B8] font-bold text-sm flex items-center justify-center shrink-0 border border-[#D0D5DD]"
                >
                  L{rule.level}
                </div>
                <div className="flex-1 p-4 border border-[#E5E7EB] bg-white">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[#202938] text-[14px]">
                      {rule.name}
                    </h4>
                    <Badge variant="danger">Escalate to {rule.escalateToRole}</Badge>
                  </div>
                  <p className="text-xs text-[#667085] mt-1.5">
                    <strong>Trigger:</strong> {rule.triggerCondition}
                  </p>
                  <div className="mt-2 text-xs text-[#12B76A] flex items-center gap-1 font-medium">
                    <CheckCircle size={13} />
                    <span>Instant high-priority email alert dispatched to {rule.escalateToRole}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: New Category */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create Inquiry Category"
        description="Add a new ticket topic and route it directly to the designated department."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddCategory}>
              Create Category
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <Input
            label="Category Title"
            placeholder="e.g. Hostel & Mess Grievances"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            required
          />
          <Input
            label="System Code"
            placeholder="e.g. HOSTEL_MESS"
            value={catForm.code}
            onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Brief explanation for student guidance..."
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Routing Department"
              options={MOCK_DEPARTMENTS.map((d) => ({ value: d.code, label: d.name }))}
              value={catForm.departmentCode}
              onChange={(e) => setCatForm({ ...catForm, departmentCode: e.target.value })}
            />
            <Select
              label="Default Priority"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              value={catForm.defaultPriority}
              onChange={(e) => setCatForm({ ...catForm, defaultPriority: e.target.value as QueryPriority })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="1st Response Target (Hours)"
              type="number"
              value={String(catForm.responseTimeHours)}
              onChange={(e) => setCatForm({ ...catForm, responseTimeHours: Number(e.target.value) })}
            />
            <Input
              label="Resolution Target (Hours)"
              type="number"
              value={String(catForm.resolutionTimeHours)}
              onChange={(e) => setCatForm({ ...catForm, resolutionTimeHours: Number(e.target.value) })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
