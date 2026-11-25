'use client';

import React from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';

export const StaffDashboard: React.FC = () => {
  const { user, tickets, setActiveView, setSelectedTicket } = useAuth();

  const deptTickets = tickets.filter(
    (t) => t.departmentCode === user.departmentCode || user.role === 'STAFF_SUPPORT'
  );

  const pendingTickets = deptTickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'WAITING_FOR_STAFF'
  );
  const urgentTickets = deptTickets.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT');

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Staff Operations Desk — {user.departmentCode || 'All Departments'}
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Operational triage queue, fee reconciliations, examination petitions, and SLA monitoring.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setActiveView('tickets')}>
          Open Work Queue
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Department Queue"
          value={deptTickets.length}
          subtext="Total inquiries received"
          icon={<Inbox size={18} />}
        />
        <StatCard
          label="Pending Staff Action"
          value={pendingTickets.length}
          subtext="Awaiting response"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Urgent / High Priority"
          value={urgentTickets.length}
          subtext="Requires same-day turnaround"
          icon={<AlertTriangle size={18} />}
        />
        <StatCard
          label="SLA Compliance Rate"
          value="98.5%"
          change="Zero overdue breaches"
          isPositive={true}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Active Work Queue Table */}
      <Card
        title="Immediate Action Queue"
        subtitle="Sorted by priority and upcoming SLA deadlines"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Subject & Category</TableHead>
              <TableHead>Student Details</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA Deadline</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deptTickets.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedTicket(t);
                  setActiveView('tickets');
                }}
              >
                <TableCell className="font-mono text-[12px] font-semibold text-[#4779B8]">
                  {t.ticketNumber}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[#202938] line-clamp-1">{t.title}</div>
                  <div className="text-[11px] text-[#667085]">{t.category}</div>
                </TableCell>
                <TableCell>
                  <div className="text-[13px] text-[#202938]">{t.studentName}</div>
                  <div className="text-[11px] text-[#667085]">{t.studentEnrollment}</div>
                </TableCell>
                <TableCell>
                  <Badge priority={t.priority} />
                </TableCell>
                <TableCell>
                  <Badge status={t.status} />
                </TableCell>
                <TableCell className="text-[12px] text-[#667085]">
                  {formatDate(t.slaDeadline)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Triage & Respond
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
