'use client';

import React from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Send,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';

export const FacultyDashboard: React.FC = () => {
  const { user, tickets, setActiveView, setSelectedTicket } = useAuth();

  const myAssignedTickets = tickets.filter(
    (t) =>
      t.assignedStaffName?.includes(user.lastName) ||
      t.departmentCode === user.departmentCode
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Faculty Inquiry Workspace
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Welcome back, {user.firstName} {user.lastName}. Review and resolve your assigned student queries.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setActiveView('tickets')}>
          Open Ticket Queue
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Assigned Queries"
          value={myAssignedTickets.length}
          subtext="Active Inquiries"
          icon={<Ticket size={18} />}
        />
        <StatCard
          label="Pending My Response"
          value={
            myAssignedTickets.filter(
              (t) => t.status === 'ASSIGNED' || t.status === 'WAITING_FOR_STAFF'
            ).length
          }
          subtext="Under 4h target"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Resolved Inquiries"
          value={myAssignedTickets.filter((t) => t.status === 'RESOLVED').length}
          change="100% Student satisfaction"
          isPositive={true}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Avg Response Time"
          value="1.8 Hours"
          change="Ahead of deadline"
          isPositive={true}
          icon={<MessageSquare size={18} />}
        />
      </div>

      {/* Assigned Queries Table */}
      <Card
        title="Assigned Inquiries Awaiting Action"
        subtitle="Click any row to open conversation thread and respond to student."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Subject & Category</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA Deadline</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myAssignedTickets.map((t) => (
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
                    Reply
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
