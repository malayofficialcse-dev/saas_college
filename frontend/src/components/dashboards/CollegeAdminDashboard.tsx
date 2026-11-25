'use client';

import React from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { MOCK_DEPARTMENTS } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

export const CollegeAdminDashboard: React.FC = () => {
  const { tickets, setActiveView, setSelectedTicket } = useAuth();

  const totalQueries = tickets.length;
  const openQueries = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
  ).length;
  const resolvedQueries = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  ).length;
  const escalatedQueries = tickets.filter((t) => t.isBreached || t.status === 'ESCALATED').length;

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            College Operations Dashboard
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Institutional overview, inquiry lifecycle, department workload, and SLA compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setActiveView('reports')}
          >
            Export Compliance CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setActiveView('tickets')}
          >
            View All Tickets
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Enrolled Students"
          value="1,190"
          change="+45 this term"
          isPositive={true}
          icon={<GraduationCap size={18} />}
        />
        <StatCard
          label="Total Faculty & Staff"
          value="82"
          subtext="5 Departments"
          icon={<Briefcase size={18} />}
        />
        <StatCard
          label="Active / Open Inquiries"
          value={openQueries}
          change={`${resolvedQueries} resolved`}
          isPositive={true}
          icon={<Ticket size={18} />}
        />
        <StatCard
          label="SLA Compliance Rate"
          value="98.2%"
          change="0.4% vs last week"
          isPositive={true}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Two Column Section: Department Workload & Escalated / Priority Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Health Overview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Department Query Load & SLA Performance"
            subtitle="Real-time inquiry queues and resolution compliance across departments."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('academic')}
                className="text-[12px] h-7"
              >
                Manage Departments →
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Head of Dept</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Open Inquiries</TableHead>
                  <TableHead>SLA Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DEPARTMENTS.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div className="font-medium text-[#202938]">{dept.name}</div>
                      <div className="text-[11px] text-[#667085]">{dept.code}</div>
                    </TableCell>
                    <TableCell className="text-[13px]">{dept.hodName}</TableCell>
                    <TableCell>{dept.facultyCount}</TableCell>
                    <TableCell>
                      <span
                        style={{ borderRadius: '4px' }}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[#EDF3FA] text-[#4779B8]"
                      >
                        {dept.openQueriesCount} active
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#26966A]">{dept.slaCompliance}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Priority & Escalated Tickets Attention Queue (1 col) */}
        <div className="space-y-4">
          <Card
            title="Attention Required"
            subtitle="High-priority and breached tickets"
            action={
              escalatedQueries > 0 ? (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-[#FCEEEE] text-[#D9534F] rounded">
                  {escalatedQueries} Breached
                </span>
              ) : null
            }
          >
            <div className="divide-y divide-[#E5E7EB]">
              {tickets.slice(0, 4).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setActiveView('tickets');
                  }}
                  className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-[#F9FAFB] p-2 transition-colors rounded"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-[#667085]">
                      {ticket.ticketNumber}
                    </span>
                    <Badge status={ticket.status} />
                  </div>
                  <h4 className="text-[13px] font-medium text-[#202938] line-clamp-1">
                    {ticket.title}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#667085]">
                    <span>{ticket.departmentCode}</span>
                    <Badge priority={ticket.priority} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick SLA Policy Summary */}
          <div
            style={{ borderRadius: '4px' }}
            className="p-4 bg-white border border-[#E5E7EB] text-[13px]"
          >
            <h4 className="font-semibold text-[#202938] mb-2">SLA Working Hours Policy</h4>
            <div className="space-y-1.5 text-[12px] text-[#667085]">
              <div className="flex justify-between">
                <span>Working Days:</span>
                <span className="font-medium text-[#202938]">Mon – Sat (09:00 - 17:00)</span>
              </div>
              <div className="flex justify-between">
                <span>First Response Target:</span>
                <span className="font-medium text-[#202938]">Under 4 Working Hours</span>
              </div>
              <div className="flex justify-between">
                <span>Resolution Target:</span>
                <span className="font-medium text-[#202938]">Under 48 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
