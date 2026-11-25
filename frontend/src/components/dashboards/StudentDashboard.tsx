'use client';

import React, { useState } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  BookOpen,
  Plus,
  Search,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { MOCK_KB_ARTICLES, MOCK_FAQS } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

export const StudentDashboard: React.FC<{ onNewTicket: () => void }> = ({ onNewTicket }) => {
  const { user, tickets, setActiveView, setSelectedTicket } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const myTickets = tickets.filter(
    (t) => t.studentEmail === user.email || t.studentName.includes(user.firstName)
  );

  const openTickets = myTickets.filter(
    (t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'CANCELLED'
  );
  const resolvedTickets = myTickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-6 border border-[#E5E7EB] rounded">
        <div>
          <span className="text-[12px] font-bold text-[#4779B8] tracking-wider uppercase">
            Student Support Portal
          </span>
          <h1 className="text-[22px] font-semibold text-[#202938] mt-0.5">
            Hello, {user.firstName}! Need help with your college matters?
          </h1>
          <p className="text-[13px] text-[#667085] mt-1">
            Enrollment ID: <span className="font-mono font-medium text-[#202938]">{user.enrollmentNumber}</span> • Track fee receipts, exam marks, course allotment & certificates.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onNewTicket}
          className="flex items-center gap-2 shrink-0 shadow-none"
        >
          <Plus size={18} />
          <span>Submit New Query</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="My Open Queries"
          value={openTickets.length}
          subtext="Staff assigned & investigating"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Resolved Queries"
          value={resolvedTickets.length}
          change="100% SLA honored"
          isPositive={true}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Self-Help Articles"
          value={MOCK_KB_ARTICLES.length + MOCK_FAQS.length}
          subtext="Instant answers without waiting"
          icon={<BookOpen size={18} />}
        />
      </div>

      {/* Main Two Column Section: My Tickets & Knowledge Base Quick Answers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: My Tickets Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="My Support Tickets & Inquiries"
            subtitle="Click on any ticket to view live staff replies and attachment history."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('tickets')}
                className="text-[12px] h-7"
              >
                View Complete History →
              </Button>
            }
          >
            {myTickets.length === 0 ? (
              <div className="p-8 text-center text-[#667085]">
                No support queries filed yet. Click "Submit New Query" if you need any assistance!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTickets.map((t) => (
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
                      <TableCell className="text-[12px]">{t.departmentCode}</TableCell>
                      <TableCell>
                        <Badge status={t.status} />
                      </TableCell>
                      <TableCell className="text-[12px] text-[#667085]">
                        {formatDate(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Right: Instant Help & Top FAQs (1 col) */}
        <div className="space-y-4">
          <Card
            title="Popular Instant Solutions"
            subtitle="Resolve frequent questions immediately"
          >
            <div className="space-y-3">
              {MOCK_FAQS.slice(0, 3).map((faq) => (
                <div
                  key={faq.id}
                  onClick={() => setActiveView('faqs')}
                  className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded hover:border-[#4779B8] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <HelpCircle size={15} className="text-[#4779B8] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-medium text-[#202938] leading-snug">
                        {faq.question}
                      </h4>
                      <p className="text-[12px] text-[#667085] mt-1 line-clamp-2">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('knowledge-base')}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <span>Browse All Knowledge Base</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
