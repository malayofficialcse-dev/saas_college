'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Lock,
  Search,
  CheckCheck,
  User,
  Clock,
  Building,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Ticket } from '@/lib/types';
import { conversationsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export const ConversationsView: React.FC = () => {
  const { tickets, user, role, addTicketMessage } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [messageText, setMessageText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [search, setSearch] = useState('');

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  useEffect(() => {
    if (activeTicket?.id) {
      conversationsApi.getMessages(activeTicket.id).catch(() => { });
    }
  }, [activeTicket?.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeTicket) return;
    addTicketMessage(activeTicket.id, messageText, isInternal);
    setMessageText('');
    setIsInternal(false);
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.studentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
          Real-Time Messaging & Conversations
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Direct communication channels between campus officers, faculty evaluators, and students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left: Active Threads List */}
        <Card noPadding className="flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[34px] pl-9 pr-3 text-xs bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {filteredTickets.map((t) => {
              const isSelected = t.id === selectedTicketId;
              const lastMsg = t.messages[t.messages.length - 1];
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-[#EDF3FA] border-l-4 border-l-[#4779B8]' : 'hover:bg-[#F9FAFB]'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#4779B8]">
                      {t.ticketNumber}
                    </span>
                    <Badge variant={t.priority === 'URGENT' ? 'danger' : 'neutral'} className="text-[10px]">
                      {t.priority}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-[#202938] mt-1 line-clamp-1">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-1">
                    {lastMsg ? lastMsg.content : t.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-[#98A2B3]">
                    <span>{t.studentName}</span>
                    <span>{t.departmentCode}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Active Chat Window */}
        <Card noPadding className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          {activeTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#4779B8]">
                      {activeTicket.ticketNumber}
                    </span>
                    <Badge variant="primary">{activeTicket.category}</Badge>
                    <Badge variant="success">{activeTicket.status}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202938] mt-1">
                    {activeTicket.title}
                  </h3>
                </div>

                <div className="text-right text-xs">
                  <span className="text-[#667085] block">Student:</span>
                  <span className="font-semibold text-[#202938]">{activeTicket.studentName}</span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFCFD]">
                {activeTicket.messages.map((m) => {
                  const isMe = m.senderId === user.id || m.senderName.includes(user.firstName);
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#667085]">
                        <span className="font-medium text-[#202938]">{m.senderName}</span>
                        <span>({m.senderRole.replace('_', ' ')})</span>
                        {m.isInternal && (
                          <Badge variant="warning" className="text-[9px] py-0">
                            INTERNAL NOTE
                          </Badge>
                        )}
                      </div>

                      <div
                        style={{ borderRadius: '6px' }}
                        className={`p-3 max-w-lg text-xs leading-relaxed ${m.isInternal
                            ? 'bg-[#FEF7EC] border border-[#FCD299] text-[#7A4100]'
                            : isMe
                              ? 'bg-[#4779B8] text-white'
                              : 'bg-white border border-[#E5E7EB] text-[#202938] shadow-sm'
                          }`}
                      >
                        {m.content}
                      </div>

                      <span className="text-[10px] text-[#98A2B3] mt-1">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSend} className="p-3 border-t border-[#E5E7EB] bg-white">
                {role !== 'STUDENT' && (
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <label className="flex items-center gap-1 text-[#667085] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded text-[#F79009] focus:ring-[#F79009]"
                      />
                      <Lock size={12} className={isInternal ? 'text-[#F79009]' : 'text-[#667085]'} />
                      <span className={isInternal ? 'font-semibold text-[#F79009]' : ''}>
                        Post as Internal Staff Note (Invisible to Student)
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={
                      isInternal
                        ? 'Write internal staff note...'
                        : 'Write official response to student...'
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    style={{ borderRadius: '4px' }}
                    className="flex-1 h-[38px] px-3 text-xs bg-[#F9FAFB] border border-[#D0D5DD] text-[#202938] focus:bg-white focus:border-[#4779B8] focus:outline-none"
                  />
                  <Button
                    variant={isInternal ? 'secondary' : 'primary'}
                    size="sm"
                    icon={<Send size={14} />}
                    type="submit"
                  >
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#667085]">
              Select a conversation thread to view messages.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
