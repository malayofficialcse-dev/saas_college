'use client';

import React from 'react';
import {
  Users,
  Briefcase,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export const HodDashboard: React.FC = () => {
  const { user, tickets, setActiveView, setSelectedTicket } = useAuth();

  const cseTickets = tickets.filter((t) => t.departmentCode === 'CSE');
  const openCseTickets = cseTickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
  );

  const facultyWorkloads = [
    { name: 'Dr. Meera Nambiar', code: 'FAC-001', designation: 'Associate Professor', active: 3, resolved: 28 },
    { name: 'Prof. K. R. Raman', code: 'FAC-002', designation: 'Assistant Professor', active: 2, resolved: 19 },
    { name: 'Dr. Sunita Deshmukh', code: 'FAC-003', designation: 'Professor', active: 1, resolved: 34 },
    { name: 'Prof. Amitava Ghosh', code: 'FAC-004', designation: 'Assistant Professor', active: 2, resolved: 15 },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Department HOD Dashboard — Computer Science
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Faculty inquiry allocation, student petition routing, and workload distribution.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setActiveView('tickets')}>
          View All Department Tickets
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total CSE Inquiries"
          value={cseTickets.length}
          subtext="Current Academic Term"
          icon={<Ticket size={18} />}
        />
        <StatCard
          label="Active Pending Resolution"
          value={openCseTickets.length}
          change="All under SLA target"
          isPositive={true}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Assigned Faculty"
          value="28"
          subtext="Avg 1.8 active load"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Department SLA Compliance"
          value="98.2%"
          change="+1.1% vs last month"
          isPositive={true}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Faculty Workload Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Faculty Inquiry Load Distribution"
            subtitle="Workload-aware assignment engine balances active tickets per professor."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Name & Code</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Active Load</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyWorkloads.map((fac) => (
                  <TableRow key={fac.code}>
                    <TableCell>
                      <div className="font-medium text-[#202938]">{fac.name}</div>
                      <div className="text-[11px] text-[#667085]">{fac.code}</div>
                    </TableCell>
                    <TableCell className="text-[13px]">{fac.designation}</TableCell>
                    <TableCell>
                      <span
                        style={{ borderRadius: '4px' }}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[#EDF3FA] text-[#4779B8]"
                      >
                        {fac.active} Assigned
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px]">{fac.resolved}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Rebalance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Pending Department Tickets */}
        <div>
          <Card
            title="Department Inquiries"
            subtitle="Recent student tickets submitted to CSE"
          >
            <div className="divide-y divide-[#E5E7EB]">
              {cseTickets.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTicket(t);
                    setActiveView('tickets');
                  }}
                  className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-[#F9FAFB] p-2 rounded transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-mono text-[#667085]">{t.ticketNumber}</span>
                    <Badge status={t.status} />
                  </div>
                  <h4 className="text-[13px] font-medium text-[#202938] line-clamp-1">{t.title}</h4>
                  <p className="text-[11px] text-[#667085] mt-1">{t.studentName}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
