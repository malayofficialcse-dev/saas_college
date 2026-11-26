'use client';

import React, { useState } from 'react';
import {
  UserCheck,
  ShieldAlert,
  Building,
  Clock,
  AlertTriangle,
  ArrowRight,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { MOCK_COLLEGES } from '@/lib/mock-data';

export const ImpersonationView: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState(MOCK_COLLEGES[0]?.id || '');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('30m');
  const [activeSession, setActiveSession] = useState<{
    id: string;
    collegeName: string;
    expiresIn: string;
  } | null>(null);

  const [sessionList, setSessionList] = useState([
    {
      id: 'imp-sess-882',
      tenantName: 'Apex Institute of Technology & Management',
      adminUser: 'Dr. Vikram Malhotra (Super Admin)',
      reason: 'Diagnosing webhook reconciliation sync delay',
      startedAt: '12 mins ago',
      expiresIn: '18 mins',
      status: 'ACTIVE',
    },
  ]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const college = MOCK_COLLEGES.find((c) => c.id === selectedTenant) || MOCK_COLLEGES[0];

    const newSess = {
      id: `imp-${Date.now()}`,
      tenantName: college.name,
      adminUser: 'Super Admin Operator',
      reason,
      startedAt: 'Just now',
      expiresIn: duration,
      status: 'ACTIVE',
    };

    setSessionList((prev) => [newSess, ...prev]);
    setActiveSession({ id: newSess.id, collegeName: college.name, expiresIn: duration });
    setReason('');
  };

  const handleTerminateSession = (sessionId: string) => {
    setSessionList((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
          Super Admin Tenant Impersonation
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Temporarily assume college administrator role to troubleshoot tickets and verify tenant-isolated issues.
        </p>
      </div>

      {/* Security Warning Notice */}
      <div className="p-4 bg-[#FFFAEB] border border-[#FEDF89] rounded flex items-start gap-3">
        <ShieldAlert size={20} className="text-[#B54708] shrink-0 mt-0.5" />
        <div className="text-xs text-[#B54708]">
          <strong className="font-semibold block text-[13px] mb-0.5">
            Security Compliance & Audit Enforcement
          </strong>
          Every action executed during an impersonation session is tagged with your Super Admin identity and origin IP address, cryptographically signed into the tenant's security audit log.
        </div>
      </div>

      {/* Active Session Alert Banner */}
      {activeSession && (
        <div className="p-4 bg-[#ECFDF3] border border-[#A6F4C5] rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-[#027A48]" />
            <div>
              <span className="font-semibold text-xs text-[#027A48] block">
                Active Impersonation Session
              </span>
              <span className="text-xs text-[#344054]">
                You are currently simulating <strong>{activeSession.collegeName}</strong> ({activeSession.expiresIn} remaining).
              </span>
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={() => handleTerminateSession(activeSession.id)}
          >
            End Impersonation Session
          </Button>
        </div>
      )}

      {/* Start Impersonation Card */}
      <Card>
        <div className="pb-3 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[15px] text-[#202938]">
            Initiate New Impersonation Session
          </h3>
          <p className="text-xs text-[#667085] mt-0.5">
            Specify the institution and mandatory compliance justification.
          </p>
        </div>

        <form onSubmit={handleStartSession} className="space-y-4 pt-4 max-w-2xl">
          <Select
            label="Select Target College Tenant"
            options={MOCK_COLLEGES.map((c) => ({
              value: c.id,
              label: `${c.code} — ${c.name} (${c.plan})`,
            }))}
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Session Expiry Duration"
              options={[
                { value: '15m', label: '15 Minutes' },
                { value: '30m', label: '30 Minutes' },
                { value: '1h', label: '1 Hour' },
                { value: '2h', label: '2 Hours (Maximum)' },
              ]}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <div className="pt-6 text-xs text-[#667085] flex items-center gap-1">
              <Clock size={14} /> Auto-terminates upon expiration
            </div>
          </div>

          <Input
            label="Mandatory Audit Justification / Support Ticket #"
            placeholder="e.g. Investigating delayed fee receipt sync for student enrollment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <Button
            variant="primary"
            size="md"
            icon={<UserCheck size={16} />}
            type="submit"
          >
            Authorize & Launch Impersonation
          </Button>
        </form>
      </Card>

      {/* Active & Historical Impersonation Sessions */}
      <Card noPadding>
        <div className="p-4 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[15px] text-[#202938]">
            Active Platform Impersonations
          </h3>
          <p className="text-xs text-[#667085] mt-0.5">
            Active elevated sessions across all tenant colleges.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target College</TableHead>
              <TableHead>Super Admin Actor</TableHead>
              <TableHead>Compliance Reason</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionList.map((sess) => (
              <TableRow key={sess.id}>
                <TableCell className="font-semibold text-xs text-[#202938]">
                  {sess.tenantName}
                </TableCell>
                <TableCell className="text-xs text-[#344054]">{sess.adminUser}</TableCell>
                <TableCell className="text-xs text-[#667085] max-w-xs truncate">
                  "{sess.reason}"
                </TableCell>
                <TableCell className="text-xs font-mono font-medium text-[#4779B8]">
                  {sess.expiresIn}
                </TableCell>
                <TableCell>
                  <Badge variant="warning">{sess.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#B42318] hover:text-[#912018]"
                    onClick={() => handleTerminateSession(sess.id)}
                  >
                    Revoke
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
