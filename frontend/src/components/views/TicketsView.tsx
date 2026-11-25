'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Paperclip,
  Send,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Ticket, QueryStatus, QueryPriority } from '@/lib/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { formatDate, formatDateTime } from '@/lib/utils';

export const TicketsView: React.FC = () => {
  const {
    tickets,
    user,
    role,
    selectedTicket,
    setSelectedTicket,
    updateTicketStatus,
    addTicketMessage,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    // Student sees only their tickets
    if (role === 'STUDENT' && t.studentEmail !== user.email && !t.studentName.includes(user.firstName)) {
      return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const match =
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.departmentCode.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

    return true;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    addTicketMessage(selectedTicket.id, replyText, isInternalNote);
    setReplyText('');
    setIsInternalNote(false);
  };

  const allowedTransitions: Record<QueryStatus, QueryStatus[]> = {
    OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_STUDENT', 'WAITING_FOR_STAFF', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
    IN_PROGRESS: ['WAITING_FOR_STUDENT', 'WAITING_FOR_STAFF', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
    WAITING_FOR_STUDENT: ['IN_PROGRESS', 'WAITING_FOR_STAFF', 'RESOLVED', 'CLOSED', 'CANCELLED'],
    WAITING_FOR_STAFF: ['IN_PROGRESS', 'WAITING_FOR_STUDENT', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
    ESCALATED: ['IN_PROGRESS', 'ASSIGNED', 'RESOLVED', 'CLOSED', 'CANCELLED'],
    RESOLVED: ['CLOSED', 'REOPENED'],
    CLOSED: ['REOPENED'],
    REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    CANCELLED: [],
  };

  return (
    <div className="space-y-6 w-full">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            {role === 'STUDENT' ? 'My Queries & Inquiries' : 'Tickets & Query Lifecycle'}
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Full status workflow, department routing, SLA countdowns, and real-time student-staff communication.
          </p>
        </div>
      </div>

      {/* Main Layout: List Table or Selected Ticket Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List View (Takes full width if no selection, or 5 cols if selected) */}
        <div className={selectedTicket ? 'lg:col-span-5 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {/* Filters Bar */}
          <div
            style={{ borderRadius: '4px' }}
            className="p-3 bg-white border border-[#E5E7EB] flex flex-wrap items-center gap-3"
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                placeholder="Search ticket #, student, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[36px] pl-9 pr-3 text-[13px] bg-white border border-[#E5E7EB] placeholder-[#98A2B3] focus:outline-none focus:border-[#4779B8] focus:ring-1 focus:ring-[#4779B8]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-2.5 text-[12px] bg-white border border-[#E5E7EB] text-[#202938] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_STUDENT">Waiting for Student</option>
              <option value="WAITING_FOR_STAFF">Waiting for Staff</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-2.5 text-[12px] bg-white border border-[#E5E7EB] text-[#202938] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Tickets Table */}
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  {!selectedTicket && <TableHead>Student</TableHead>}
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {!selectedTicket && <TableHead>Deadline</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedTicket ? 4 : 6} className="text-center py-8 text-[#667085]">
                      No tickets match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <TableRow
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`cursor-pointer ${isSelected ? 'bg-[#EDF3FA]' : ''}`}
                      >
                        <TableCell className="font-mono text-[12px] font-semibold text-[#4779B8]">
                          {t.ticketNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[#202938] line-clamp-1">{t.title}</div>
                          <div className="text-[11px] text-[#667085]">{t.category}</div>
                        </TableCell>
                        {!selectedTicket && (
                          <TableCell>
                            <div className="text-[13px] text-[#202938]">{t.studentName}</div>
                            <div className="text-[11px] text-[#667085]">{t.studentEnrollment}</div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge priority={t.priority} />
                        </TableCell>
                        <TableCell>
                          <Badge status={t.status} />
                        </TableCell>
                        {!selectedTicket && (
                          <TableCell className="text-[12px] text-[#667085]">
                            {formatDate(t.slaDeadline)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Selected Ticket Detail & Conversation View (7 cols) */}
        {selectedTicket && (
          <div className="lg:col-span-7 space-y-4">
            <Card padding="none">
              {/* Ticket Detail Header */}
              <div className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-1 text-[#667085] hover:text-[#202938] rounded"
                      title="Back to full table"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span className="font-mono font-bold text-[14px] text-[#4779B8]">
                      {selectedTicket.ticketNumber}
                    </span>
                    <Badge status={selectedTicket.status} />
                    <Badge priority={selectedTicket.priority} />
                  </div>

                  {/* Status Transition Control (Staff/Admin) */}
                  {role !== 'STUDENT' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#667085] font-medium">Status:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) =>
                          updateTicketStatus(selectedTicket.id, e.target.value as QueryStatus)
                        }
                        style={{ borderRadius: '4px' }}
                        className="h-[30px] px-2 text-[12px] bg-white border border-[#D0D5DD] font-medium text-[#202938] cursor-pointer focus:outline-none focus:border-[#4779B8]"
                      >
                        <option value={selectedTicket.status}>
                          {selectedTicket.status} (Current)
                        </option>
                        {allowedTransitions[selectedTicket.status]?.map((next) => (
                          <option key={next} value={next}>
                            → {next}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <h2 className="text-[16px] font-semibold text-[#202938] leading-snug">
                  {selectedTicket.title}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#E5E7EB] text-[12px]">
                  <div>
                    <span className="text-[#667085] block">Student:</span>
                    <span className="font-medium text-[#202938]">{selectedTicket.studentName}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Department:</span>
                    <span className="font-medium text-[#202938]">{selectedTicket.department}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Assigned Staff:</span>
                    <span className="font-medium text-[#202938]">
                      {selectedTicket.assignedStaffName || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">SLA Target:</span>
                    <span
                      className={`font-medium ${
                        selectedTicket.isBreached ? 'text-[#D9534F]' : 'text-[#26966A]'
                      }`}
                    >
                      {formatDate(selectedTicket.slaDeadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto bg-white">
                {selectedTicket.messages.map((msg) => {
                  const isStaff = msg.senderRole !== 'STUDENT';
                  const isInternal = msg.isInternal;

                  // Student cannot view internal notes
                  if (role === 'STUDENT' && isInternal) return null;

                  return (
                    <div
                      key={msg.id}
                      style={{ borderRadius: '4px' }}
                      className={`p-3 border text-[13px] ${
                        isInternal
                          ? 'bg-[#FDF5E8] border-[#F4DCB4]'
                          : isStaff
                          ? 'bg-[#EDF3FA] border-[#C5DAF0]'
                          : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#202938]">{msg.senderName}</span>
                          <span className="text-[11px] text-[#667085]">({msg.senderRole})</span>
                          {isInternal && (
                            <span
                              style={{ borderRadius: '4px' }}
                              className="px-1.5 py-0.2 text-[10px] font-bold bg-[#D99A3D] text-white flex items-center gap-0.5"
                            >
                              <Lock size={10} /> Internal Note
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#98A2B3]">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#202938] whitespace-pre-wrap">{msg.content}</p>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center gap-2">
                          <Paperclip size={13} className="text-[#667085]" />
                          {msg.attachments.map((att) => (
                            <span
                              key={att.name}
                              style={{ borderRadius: '4px' }}
                              className="px-2 py-0.5 bg-white border border-[#E5E7EB] text-[11px] text-[#4779B8] font-medium"
                            >
                              {att.name} ({att.size})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="p-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <form onSubmit={handleSendReply} className="space-y-2">
                  {role !== 'STUDENT' && (
                    <div className="flex items-center gap-2 mb-1">
                      <label className="flex items-center gap-1.5 text-[12px] text-[#667085] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded text-[#4779B8]"
                        />
                        <span>Staff Internal Note (Hidden from Student)</span>
                      </label>
                    </div>
                  )}

                  <Textarea
                    placeholder={
                      isInternalNote
                        ? 'Add internal coordination notes for department colleagues...'
                        : 'Write official response to student...'
                    }
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px]"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#667085]">
                      Replies trigger instant notification to participants.
                    </span>
                    <Button variant={isInternalNote ? 'secondary' : 'primary'} size="sm" type="submit">
                      <Send size={13} className="mr-1.5" />
                      {isInternalNote ? 'Post Internal Note' : 'Send Reply'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
