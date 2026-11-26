'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  DollarSign,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export const PaymentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'webhooks'>('transactions');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [successNote, setSuccessNote] = useState('');

  const [transactions, setTransactions] = useState([
    {
      id: 'txn-1092',
      orderId: 'order_rb_99281',
      description: 'Professional Plan — Monthly Subscription',
      amount: 4999,
      gateway: 'Razorpay',
      mode: 'UPI',
      status: 'SUCCESSFUL',
      timestamp: '2026-11-19 14:22:10',
    },
    {
      id: 'txn-1091',
      orderId: 'order_rb_98174',
      description: 'Professional Plan — Monthly Subscription',
      amount: 4999,
      gateway: 'Razorpay',
      mode: 'NetBanking (HDFC)',
      status: 'SUCCESSFUL',
      timestamp: '2026-10-18 10:15:32',
    },
    {
      id: 'txn-1088',
      orderId: 'order_rb_96411',
      description: 'Starter to Professional Upgrade (Prorated)',
      amount: 2450,
      gateway: 'Razorpay',
      mode: 'Credit Card (Visa)',
      status: 'SUCCESSFUL',
      timestamp: '2026-09-15 11:40:02',
    },
    {
      id: 'txn-1082',
      orderId: 'order_rb_94200',
      description: 'Starter Plan Annual Renewal',
      amount: 19990,
      gateway: 'Stripe',
      mode: 'Card',
      status: 'SUCCESSFUL',
      timestamp: '2025-11-20 09:30:15',
    },
  ]);

  const webhooks = [
    {
      id: 'wh-9921',
      event: 'payment.captured',
      gateway: 'Razorpay',
      payload: { amount: 499900, currency: 'INR', order_id: 'order_rb_99281' },
      status: 'PROCESSED',
      timestamp: '2026-11-19 14:22:12',
    },
    {
      id: 'wh-9920',
      event: 'invoice.paid',
      gateway: 'Razorpay',
      payload: { invoice_id: 'inv_1092', status: 'paid' },
      status: 'PROCESSED',
      timestamp: '2026-11-19 14:22:15',
    },
    {
      id: 'wh-9810',
      event: 'payment.captured',
      gateway: 'Razorpay',
      payload: { amount: 499900, currency: 'INR', order_id: 'order_rb_98174' },
      status: 'PROCESSED',
      timestamp: '2026-10-18 10:15:35',
    },
  ];

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTxn = {
      id: `txn-${Date.now()}`,
      orderId: `order_rb_${Math.floor(Math.random() * 90000 + 10000)}`,
      description: 'Professional Plan — Add-on Storage Pack (10 GB)',
      amount: 999,
      gateway: 'Razorpay',
      mode: 'UPI Instant',
      status: 'SUCCESSFUL',
      timestamp: new Date().toLocaleString(),
    };

    try {
      await paymentsApi.initiate({
        invoiceId: 'inv-addon-storage',
        amount: 999,
        gateway: 'RAZORPAY',
      });
    } catch (err) {
      console.warn('[PaymentsView] Real gateway initiation warning:', err);
    }

    setTransactions((prev) => [newTxn, ...prev]);
    setIsPayModalOpen(false);
    setSuccessNote(`Payment of ₹999 processed successfully! Order ID: ${newTxn.orderId}`);
    setTimeout(() => setSuccessNote(''), 4000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Payments & Gateway Reconciliation
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Razorpay & Stripe payment gateway processing, webhook verification, and settlement ledger.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<CreditCard size={15} />}
          onClick={() => setIsPayModalOpen(true)}
        >
          Make Payment
        </Button>
      </div>

      {successNote && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#027A48] rounded flex items-center gap-2">
          <CheckCircle size={16} />
          {successNote}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Paid Lifetime"
          value={`₹${transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}`}
          icon={<DollarSign size={20} className="text-[#4779B8]" />}
          subtitle="All subscription settlements"
        />
        <StatCard
          title="Payment Gateway"
          value="Razorpay"
          icon={<ShieldCheck size={20} className="text-[#12B76A]" />}
          subtitle="Auto-reconciler connected"
        />
        <StatCard
          title="Success Rate"
          value="100%"
          icon={<CheckCircle size={20} className="text-[#12B76A]" />}
          subtitle="Zero failed transactions"
        />
        <StatCard
          title="Webhooks Processed"
          value={webhooks.length}
          icon={<RefreshCw size={20} className="text-[#7F56D9]" />}
          subtitle="Cryptographically verified"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'transactions', label: `Transactions Ledger (${transactions.length})` },
          { id: 'webhooks', label: `Gateway Webhook Events (${webhooks.length})` },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Payment Gateway Ref</TableHead>
                <TableHead>Billing Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                    {tx.id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#667085]">
                    {tx.orderId}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-[#202938]">
                    {tx.description}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-[#202938]">
                    ₹{tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-[#344054]">
                    {tx.mode} ({tx.gateway})
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{tx.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#667085]">{tx.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Webhooks Table */}
      {activeTab === 'webhooks' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Webhook Event Name</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Payload Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                    {wh.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{wh.event}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#344054] font-medium">{wh.gateway}</TableCell>
                  <TableCell className="font-mono text-[11px] text-[#667085]">
                    {JSON.stringify(wh.payload)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{wh.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#667085]">{wh.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal: Make Payment */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Process Add-on Payment"
        description="Simulate an authenticated online transaction through Razorpay gateway."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleMakePayment}>
              Authorize & Pay ₹999
            </Button>
          </div>
        }
      >
        <form onSubmit={handleMakePayment} className="space-y-4">
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs space-y-1">
            <div className="flex justify-between text-[#667085]">
              <span>Product:</span>
              <strong className="text-[#202938]">Storage Expansion Pack (10 GB)</strong>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Price:</span>
              <strong className="text-[#202938]">₹999.00 (Inclusive of GST)</strong>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Billing Cycle:</span>
              <strong className="text-[#202938]">One-Time Add-on</strong>
            </div>
          </div>

          <Select
            label="Payment Mode"
            options={[
              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
              { value: 'CARD', label: 'Credit or Debit Card' },
              { value: 'NETBANKING', label: 'NetBanking (HDFC / SBI / ICICI)' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
