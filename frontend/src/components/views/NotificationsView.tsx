'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  ShieldAlert,
  Clock,
  CheckCheck,
  Settings,
} from 'lucide-react';
import { NotificationItem } from '@/lib/types';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { notificationsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'SLA' | 'PREFERENCES'>('ALL');

  useEffect(() => {
    notificationsApi.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) setNotifications(data);
    });
  }, []);

  const [channels, setChannels] = useState({
    emailOnAssignment: true,
    emailOnStatusChange: true,
    emailOnSlaWarning: true,
    inAppPopups: true,
    smsUrgentOnly: false,
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
    notificationsApi.markAsRead(id).catch(() => { });
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'SLA') return n.type === 'SLA_WARNING';
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Notifications & Dispatch Center
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Operational alerts, SLA breach warnings, and multi-channel delivery preferences.
          </p>
        </div>

        {filter !== 'PREFERENCES' && (
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCheck size={14} />}
            onClick={markAllAsRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Alerts"
          value={notifications.length}
          icon={<Bell size={20} className="text-[#4779B8]" />}
          subtitle="Recent notifications"
        />
        <StatCard
          title="Unread"
          value={notifications.filter((n) => !n.isRead).length}
          icon={<AlertTriangle size={20} className="text-[#F79009]" />}
          subtitle="Action required"
        />
        <StatCard
          title="SLA Warnings"
          value={notifications.filter((n) => n.type === 'SLA_WARNING').length}
          icon={<Clock size={20} className="text-[#B42318]" />}
          subtitle="Critical timeouts"
        />
        <StatCard
          title="Email Queue"
          value="Healthy"
          icon={<Mail size={20} className="text-[#12B76A]" />}
          subtitle="BullMQ Redis Worker"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'ALL', label: `All Alerts (${notifications.length})` },
          { id: 'UNREAD', label: `Unread (${notifications.filter((n) => !n.isRead).length})` },
          { id: 'SLA', label: 'SLA Deadlines' },
          { id: 'PREFERENCES', label: 'Notification Settings' },
        ]}
        activeTab={filter}
        onChange={(id) => setFilter(id as any)}
      />

      {/* Notification Stream */}
      {filter !== 'PREFERENCES' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="text-center py-8 text-xs text-[#667085]">
              No alerts in this category.
            </Card>
          ) : (
            filtered.map((item) => (
              <Card
                key={item.id}
                className={`transition-colors ${!item.isRead ? 'border-[#4779B8] bg-[#F8FAFD]' : 'hover:border-[#D0D5DD]'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      style={{ borderRadius: '4px' }}
                      className={`w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 ${item.type === 'SLA_WARNING'
                          ? 'bg-[#FEF3F2] text-[#B42318]'
                          : item.type === 'QUERY_ASSIGNED'
                            ? 'bg-[#EDF3FA] text-[#4779B8]'
                            : 'bg-[#F2F4F7] text-[#344054]'
                        }`}
                    >
                      {item.type === 'SLA_WARNING' ? (
                        <AlertTriangle size={16} />
                      ) : item.type === 'QUERY_ASSIGNED' ? (
                        <MessageSquare size={16} />
                      ) : (
                        <Bell size={16} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-[#202938]">{item.title}</h4>
                        {!item.isRead && (
                          <span className="w-2 h-2 bg-[#4779B8] rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-[#667085] mt-1">{item.message}</p>
                      <span className="text-[10px] text-[#98A2B3] mt-2 block">
                        {item.createdAt}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRead(item.id)}
                  >
                    {item.isRead ? 'Mark Unread' : 'Mark Read'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Preferences Section */}
      {filter === 'PREFERENCES' && (
        <Card>
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Multi-Channel Dispatch Preferences
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Control when the background BullMQ mail worker and in-app socket dispatch events.
            </p>
          </div>

          <div className="pt-4 space-y-3 text-xs max-w-xl">
            <label className="flex items-center justify-between p-2.5 border border-[#E5E7EB] rounded bg-[#F9FAFB] cursor-pointer">
              <div>
                <span className="font-semibold text-[#202938] block">Ticket Assignment Email</span>
                <span className="text-[#667085]">Send email when an inquiry is assigned to you</span>
              </div>
              <input
                type="checkbox"
                checked={channels.emailOnAssignment}
                onChange={(e) => setChannels({ ...channels, emailOnAssignment: e.target.checked })}
                className="rounded text-[#4779B8]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 border border-[#E5E7EB] rounded bg-[#F9FAFB] cursor-pointer">
              <div>
                <span className="font-semibold text-[#202938] block">Ticket Status Update</span>
                <span className="text-[#667085]">Notify student and staff on resolution or escalation</span>
              </div>
              <input
                type="checkbox"
                checked={channels.emailOnStatusChange}
                onChange={(e) => setChannels({ ...channels, emailOnStatusChange: e.target.checked })}
                className="rounded text-[#4779B8]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 border border-[#E5E7EB] rounded bg-[#F9FAFB] cursor-pointer">
              <div>
                <span className="font-semibold text-[#202938] block">Critical SLA Warnings</span>
                <span className="text-[#667085]">Alert 1 hour before SLA target deadline breaches</span>
              </div>
              <input
                type="checkbox"
                checked={channels.emailOnSlaWarning}
                onChange={(e) => setChannels({ ...channels, emailOnSlaWarning: e.target.checked })}
                className="rounded text-[#4779B8]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 border border-[#E5E7EB] rounded bg-[#F9FAFB] cursor-pointer">
              <div>
                <span className="font-semibold text-[#202938] block">In-App Live Toast Alerts</span>
                <span className="text-[#667085]">Real-time popups when signed in</span>
              </div>
              <input
                type="checkbox"
                checked={channels.inAppPopups}
                onChange={(e) => setChannels({ ...channels, inAppPopups: e.target.checked })}
                className="rounded text-[#4779B8]"
              />
            </label>
          </div>
        </Card>
      )}
    </div>
  );
};
