'use client';

import React from 'react';
import {
  ShieldAlert,
  Award,
  CheckCircle,
  Building,
  TrendingUp,
  FileText,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { MOCK_DEPARTMENTS } from '@/lib/mock-data';

export const PrincipalDashboard: React.FC = () => {
  const { tickets, setActiveView } = useAuth();

  const escalatedList = tickets.filter((t) => t.isBreached || t.status === 'ESCALATED');

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Institutional Governance & Compliance
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Principal oversight: Escalation triggers, student satisfaction, and department accountability.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setActiveView('analytics')}>
          View Detailed CSAT Metrics
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="College Overall CSAT Rating"
          value="4.7 / 5.0"
          change="94% Positive Feedback"
          isPositive={true}
          icon={<Award size={18} />}
        />
        <StatCard
          label="Total Escalated Inquiries"
          value={escalatedList.length}
          subtext="Requiring executive review"
          icon={<ShieldAlert size={18} />}
        />
        <StatCard
          label="Mean First Response Time"
          value="2.4 Hours"
          change="-45 mins vs target"
          isPositive={true}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Campus Resolution Rate"
          value="96.8%"
          change="982 closed successfully"
          isPositive={true}
          icon={<CheckCircle size={18} />}
        />
      </div>

      {/* Department Accountability Table */}
      <Card
        title="Department Inquiry Compliance Summary"
        subtitle="Quarterly performance audit by department head."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Head of Department</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Pending Cases</TableHead>
              <TableHead>Compliance Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_DEPARTMENTS.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium text-[#202938]">
                  {dept.name} ({dept.code})
                </TableCell>
                <TableCell>{dept.hodName}</TableCell>
                <TableCell>{dept.studentCount}</TableCell>
                <TableCell>{dept.facultyCount}</TableCell>
                <TableCell>
                  <span
                    style={{ borderRadius: '4px' }}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-[#EDF3FA] text-[#4779B8]"
                  >
                    {dept.openQueriesCount}
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
  );
};
