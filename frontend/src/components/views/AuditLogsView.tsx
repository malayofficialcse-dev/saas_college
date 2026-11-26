'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Globe,
  FileCode,
} from 'lucide-react';
import { AuditLog } from '@/lib/types';
import { MOCK_AUDIT_LOGS } from '@/lib/mock-data';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';

export const AuditLogsView: React.FC = () => {
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.ipAddress.includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('IMPERSONATION') || action.includes('DELETE')) return 'danger';
    if (action.includes('CHANGED') || action.includes('RENEWED')) return 'warning';
    if (action.includes('LOGIN')) return 'info';
    return 'neutral';
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
          Security & Compliance Audit Trail
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Immutable forensic logs of authentication, privilege elevation, ticket mutations, and system changes.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Events Recorded"
          value={logs.length}
          icon={<ShieldCheck size={20} className="text-[#4779B8]" />}
          subtitle="Real-time audit stream"
        />
        <StatCard
          title="Retention Policy"
          value="7 Years"
          icon={<Calendar size={20} className="text-[#12B76A]" />}
          subtitle="Meets ISO/IEC 27001"
        />
        <StatCard
          title="Impersonation Events"
          value={logs.filter((l) => l.action.includes('IMPERSONATION')).length}
          icon={<User size={20} className="text-[#F79009]" />}
          subtitle="Elevated platform sessions"
        />
        <StatCard
          title="Integrity Status"
          value="Verified"
          icon={<Globe size={20} className="text-[#7F56D9]" />}
          subtitle="Cryptographically sealed"
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search by user, email, IP address, or entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="w-full h-[36px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ borderRadius: '4px' }}
            className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="TICKET_STATUS_CHANGED">Ticket Status Mutations</option>
            <option value="SUPER_ADMIN_IMPERSONATION_ISSUED">Tenant Impersonations</option>
            <option value="PLAN_RENEWED">Subscription Renewals</option>
            <option value="DEPARTMENT_HOD_ASSIGNED">HOD Assignments</option>
          </select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Actor / User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp (UTC)</TableHead>
              <TableHead className="text-right">Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-[#202938]">
                  <span className="font-semibold">{log.entityName}</span>: {log.entityId}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[#202938] text-xs">{log.userName}</div>
                  <div className="text-[11px] text-[#667085]">{log.userEmail}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-[#667085]">
                  {log.ipAddress}
                </TableCell>
                <TableCell className="text-[#667085] text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<FileCode size={13} />}
                    onClick={() => setSelectedLog(log)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
          description={`Logged at ${new Date(selectedLog.createdAt).toISOString()}`}
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
              Close Inspector
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB]">
              <div>
                <span className="text-[#667085] block">Performed By:</span>
                <span className="font-semibold text-[#202938]">{selectedLog.userName}</span>
                <span className="text-[#667085] block">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="text-[#667085] block">Origin Network:</span>
                <span className="font-mono font-semibold text-[#202938]">{selectedLog.ipAddress}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#344054] block mb-1">
                JSON Event Diff & Metadata
              </span>
              <pre
                style={{ borderRadius: '4px' }}
                className="p-3 bg-[#1E293B] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto max-h-60"
              >
                {JSON.stringify(
                  {
                    id: selectedLog.id,
                    action: selectedLog.action,
                    entity: {
                      name: selectedLog.entityName,
                      id: selectedLog.entityId,
                    },
                    details: selectedLog.details || { status: 'OK' },
                    timestamp: selectedLog.createdAt,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
