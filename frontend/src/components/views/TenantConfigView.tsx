'use client';

import React, { useState } from 'react';
import {
  Settings,
  Building,
  Clock,
  Bell,
  Palette,
  CheckCircle,
  Save,
  Shield,
  Layers,
} from 'lucide-react';
import { TenantConfiguration } from '@/lib/types';
import { MOCK_TENANT_CONFIG } from '@/lib/mock-data';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

export const TenantConfigView: React.FC = () => {
  const [config, setConfig] = useState<TenantConfiguration>(MOCK_TENANT_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    setConfig((prev) => {
      const exists = prev.workingDays.includes(day);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== day)
          : [...prev.workingDays, day],
      };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Tenant Configuration & Branding
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Configure institutional profile, helpdesk operating schedule, and automated ticket routing logic.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Save size={15} />}
          onClick={handleSave}
        >
          Save Configuration
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#027A48] rounded flex items-center gap-2">
          <CheckCircle size={16} />
          Tenant configuration and branding settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institutional Profile & Branding */}
        <Card>
          <div className="pb-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <Building size={18} className="text-[#4779B8]" />
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Institutional Profile & Visual Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Input
              label="College Full Name"
              value={config.collegeName}
              onChange={(e) => setConfig({ ...config, collegeName: e.target.value })}
              required
            />
            <Input
              label="Institutional Acronym / Code"
              value={config.collegeCode}
              onChange={(e) => setConfig({ ...config, collegeCode: e.target.value })}
              required
            />
            <Input
              label="Registered Domain"
              value={config.domain}
              onChange={(e) => setConfig({ ...config, domain: e.target.value })}
              required
            />
            <Input
              label="Official Helpdesk Email"
              type="email"
              value={config.contactEmail}
              onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
              required
            />
            <Input
              label="Helpdesk Phone Line"
              value={config.contactPhone}
              onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-1.5">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-10 h-9 p-0.5 border border-[#D0D5DD] rounded cursor-pointer"
                />
                <span className="font-mono text-xs text-[#202938] uppercase">
                  {config.primaryColor}
                </span>
                <span className="text-[11px] text-[#667085]">
                  (Applies to buttons, badges, and headers)
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Operating Hours & Calendar */}
        <Card>
          <div className="pb-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <Clock size={18} className="text-[#12B76A]" />
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Helpdesk Working Hours & SLA Calendar
            </h3>
          </div>

          <div className="pt-4 space-y-4">
            <p className="text-xs text-[#667085]">
              SLA deadline countdown clocks pause outside active operating business hours.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <Input
                label="Opening Time"
                type="time"
                value={config.workingHoursStart}
                onChange={(e) => setConfig({ ...config, workingHoursStart: e.target.value })}
              />
              <Input
                label="Closing Time"
                type="time"
                value={config.workingHoursEnd}
                onChange={(e) => setConfig({ ...config, workingHoursEnd: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-2">
                Active Operating Days
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => {
                  const isChecked = config.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{ borderRadius: '4px' }}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-[#4779B8] text-white'
                          : 'bg-[#F2F4F7] text-[#667085] hover:bg-[#E5E7EB]'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Routing & Dispatch Engine */}
        <Card>
          <div className="pb-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <Layers size={18} className="text-[#F79009]" />
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Ticket Auto-Assignment Strategy
            </h3>
          </div>

          <div className="pt-4 space-y-3 max-w-xl">
            <Select
              label="Staff Dispatch Algorithm"
              options={[
                {
                  value: 'WORKLOAD_BALANCED',
                  label: 'Workload Balanced (Assigns to staff with least pending tickets)',
                },
                {
                  value: 'ROUND_ROBIN',
                  label: 'Round Robin (Equally cycles across active department members)',
                },
                {
                  value: 'MANUAL',
                  label: 'Manual Queue (Held in department triage pool for manual claim)',
                },
              ]}
              value={config.autoAssignmentStrategy}
              onChange={(e) =>
                setConfig({ ...config, autoAssignmentStrategy: e.target.value as any })
              }
            />

            <div className="pt-2 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.emailNotifications}
                  onChange={(e) => setConfig({ ...config, emailNotifications: e.target.checked })}
                  className="rounded text-[#4779B8] focus:ring-[#4779B8]"
                />
                <span className="text-[#344054] font-medium">
                  Dispatch email notifications to students and staff upon status changes
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.slaAlerts}
                  onChange={(e) => setConfig({ ...config, slaAlerts: e.target.checked })}
                  className="rounded text-[#4779B8] focus:ring-[#4779B8]"
                />
                <span className="text-[#344054] font-medium">
                  Send immediate warning alerts 1 hour before SLA target breach
                </span>
              </label>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};
