'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Download,
  AlertCircle,
  HardDrive,
  Users,
  Ticket,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { SubscriptionPlan, Invoice } from '@/lib/types';
import { MOCK_PLANS, MOCK_INVOICES, MOCK_TENANT } from '@/lib/mock-data';
import { subscriptionsApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';

export const SubscriptionsView: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<string>('PROFESSIONAL');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [plans] = useState<SubscriptionPlan[]>(MOCK_PLANS);
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [successNote, setSuccessNote] = useState('');

  useEffect(() => {
    subscriptionsApi.getPlans().catch(() => { });
    subscriptionsApi.getCurrent().catch(() => { });
  }, []);

  const handlePlanSelect = (planName: string) => {
    setCurrentPlan(planName.toUpperCase());
    setSuccessNote(`Successfully switched campus subscription tier to ${planName}!`);
    setTimeout(() => setSuccessNote(''), 4000);
    subscriptionsApi.changePlan({ planTier: planName.toUpperCase(), billingCycle }).catch(() => { });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Subscriptions, Billing & Quotas
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Manage your institution's SaaS licensing tier, resource usage quotas, and tax invoices.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-2 bg-[#F2F4F7] p-1 rounded">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${billingCycle === 'MONTHLY' ? 'bg-white shadow text-[#202938]' : 'text-[#667085]'
              }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${billingCycle === 'YEARLY' ? 'bg-white shadow text-[#202938]' : 'text-[#667085]'
              }`}
          >
            Annual (Save 20%)
          </button>
        </div>
      </div>

      {successNote && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#027A48] rounded">
          {successNote}
        </div>
      )}

      {/* Quota Gauges Overview */}
      <Card>
        <div className="pb-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Current Plan Quota Consumption
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Live tenant resource counters under <strong>{MOCK_TENANT.name}</strong>.
            </p>
          </div>
          <Badge variant="primary">{currentPlan} TIER</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Students Quota */}
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#667085] flex items-center gap-1 font-medium">
                <Users size={14} className="text-[#4779B8]" /> Enrolled Students
              </span>
              <span className="font-bold text-[#202938]">4,200 / 5,000</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#4779B8] h-full" style={{ width: '84%' }} />
            </div>
            <span className="text-[10px] text-[#667085] mt-1.5 block">84% utilized (800 remaining)</span>
          </div>

          {/* Staff Quota */}
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#667085] flex items-center gap-1 font-medium">
                <ShieldCheck size={14} className="text-[#12B76A]" /> Staff & Faculty
              </span>
              <span className="font-bold text-[#202938]">82 / 100</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#12B76A] h-full" style={{ width: '82%' }} />
            </div>
            <span className="text-[10px] text-[#667085] mt-1.5 block">82% utilized (18 remaining)</span>
          </div>

          {/* Queries Quota */}
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#667085] flex items-center gap-1 font-medium">
                <Ticket size={14} className="text-[#F79009]" /> Monthly Queries
              </span>
              <span className="font-bold text-[#202938]">1,690 / 10,000</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#F79009] h-full" style={{ width: '16.9%' }} />
            </div>
            <span className="text-[10px] text-[#667085] mt-1.5 block">16.9% utilized (Resets Dec 1)</span>
          </div>

          {/* S3 Storage Quota */}
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#667085] flex items-center gap-1 font-medium">
                <HardDrive size={14} className="text-[#7F56D9]" /> Cloud Storage
              </span>
              <span className="font-bold text-[#202938]">14.2 / 25 GB</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#7F56D9] h-full" style={{ width: '56.8%' }} />
            </div>
            <span className="text-[10px] text-[#667085] mt-1.5 block">56.8% utilized (10.8 GB free)</span>
          </div>
        </div>
      </Card>

      {/* Pricing Tiers Comparison */}
      <div>
        <h3 className="font-semibold text-[16px] text-[#202938] mb-3">
          Available Subscription Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isSelected = currentPlan === plan.name.toUpperCase();
            const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between ${isSelected ? 'border-[#4779B8] ring-2 ring-[#4779B8]' : 'hover:border-[#D0D5DD]'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[16px] text-[#202938]">{plan.name}</h4>
                    {isSelected && <Badge variant="primary">Active Plan</Badge>}
                  </div>

                  <div className="mt-3">
                    <span className="text-[26px] font-extrabold text-[#202938]">
                      ₹{price.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#667085] ml-1">
                      / {billingCycle === 'MONTHLY' ? 'mo' : 'year'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-2 text-xs">
                    <div className="flex justify-between text-[#667085]">
                      <span>Max Students:</span>
                      <strong className="text-[#202938]">{plan.studentLimit.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Staff Accounts:</span>
                      <strong className="text-[#202938]">{plan.staffLimit}</strong>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Monthly Queries:</span>
                      <strong className="text-[#202938]">{plan.queryLimitMonthly.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Storage Quota:</span>
                      <strong className="text-[#202938]">{plan.storageLimitMb / 1024} GB</strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-1.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-1.5 text-[11px] text-[#344054]">
                        <Check size={12} className="text-[#12B76A] shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3">
                  <Button
                    variant={isSelected ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full"
                    disabled={isSelected}
                    onClick={() => handlePlanSelect(plan.name)}
                  >
                    {isSelected ? 'Current Active Tier' : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices & Billing History */}
      <Card noPadding>
        <div className="p-4 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[15px] text-[#202938]">
            Invoice History & Payment Receipts
          </h3>
          <p className="text-xs text-[#667085] mt-0.5">
            Download GST-compliant tax invoices for institutional accounting and expense filings.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Billing Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                  {inv.invoiceNumber}
                </TableCell>
                <TableCell className="font-medium text-[#202938]">{inv.description}</TableCell>
                <TableCell className="font-semibold text-[#202938]">₹{inv.amount.toLocaleString()}</TableCell>
                <TableCell className="text-[#667085] text-xs">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download size={13} />}
                    onClick={() => alert(`Downloading official PDF tax receipt for ${inv.invoiceNumber}`)}
                  >
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
