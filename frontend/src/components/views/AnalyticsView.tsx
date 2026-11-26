'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { MOCK_DEPARTMENTS, MOCK_TICKETS } from '@/lib/mock-data';
import { analyticsApi } from '@/lib/api';

export const AnalyticsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'term'>('30d');

  useEffect(() => {
    analyticsApi.getOverview().catch(() => { });
    analyticsApi.getQueryVolume().catch(() => { });
  }, [timeframe]);

  const deptMetrics = [
    { name: 'Computer Science & Eng (CSE)', total: 540, resolved: 528, sla: 98.2, avgHours: 3.4 },
    { name: 'Finance & Accounts (FIN)', total: 420, resolved: 398, sla: 94.8, avgHours: 5.1 },
    { name: 'Controller of Exams (COE)', total: 310, resolved: 302, sla: 97.4, avgHours: 2.8 },
    { name: 'Electronics & Comm (ECE)', total: 240, resolved: 232, sla: 96.5, avgHours: 4.0 },
    { name: 'Campus Administration (ADM)', total: 180, resolved: 178, sla: 99.1, avgHours: 1.8 },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Analytics & SLA Compliance
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Operational speed, resolution throughput, and institutional response benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-3 py-1 text-xs font-semibold rounded ${timeframe === '7d' ? 'bg-white shadow text-[#202938]' : 'text-[#667085]'
              }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-3 py-1 text-xs font-semibold rounded ${timeframe === '30d' ? 'bg-white shadow text-[#202938]' : 'text-[#667085]'
              }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeframe('term')}
            className={`px-3 py-1 text-xs font-semibold rounded ${timeframe === 'term' ? 'bg-white shadow text-[#202938]' : 'text-[#667085]'
              }`}
          >
            Current Term
          </button>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Queries Ingested"
          value="1,690"
          icon={<Layers size={20} className="text-[#4779B8]" />}
          change={{ value: '+14% vs previous term', type: 'positive' }}
        />
        <StatCard
          title="Overall SLA Compliance"
          value="97.2%"
          icon={<CheckCircle size={20} className="text-[#12B76A]" />}
          change={{ value: '+1.8% target exceeded', type: 'positive' }}
        />
        <StatCard
          title="Avg First Response"
          value="24 Mins"
          icon={<Clock size={20} className="text-[#2E90FA]" />}
          subtitle="Target: under 60 mins"
        />
        <StatCard
          title="SLA Breach Incidents"
          value="18"
          icon={<AlertOctagon size={20} className="text-[#F79009]" />}
          change={{ value: '-8 fewer breaches', type: 'positive' }}
        />
      </div>

      {/* Department Breakdown Table */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Department Performance Scorecard
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Volume vs resolution percentage and mean turnaround time.
            </p>
          </div>
          <Badge variant="success">Campus SLA Target: 95.0%</Badge>
        </div>

        <div className="space-y-4 pt-4">
          {deptMetrics.map((dept) => (
            <div key={dept.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202938]">{dept.name}</span>
                <div className="flex items-center gap-4 text-[#667085]">
                  <span>
                    Volume: <strong className="text-[#202938]">{dept.total}</strong>
                  </span>
                  <span>
                    Avg: <strong className="text-[#202938]">{dept.avgHours} hrs</strong>
                  </span>
                  <span className="font-bold text-[#12B76A]">{dept.sla}% SLA</span>
                </div>
              </div>
              <div className="w-full bg-[#F2F4F7] h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#4779B8] h-full"
                  style={{ width: `${(dept.resolved / dept.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Priority & Volume Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-[14px] text-[#202938] mb-3">
            Inquiries by Priority Tier
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#B42318] flex items-center gap-1">
                  ● Urgent Priority (4h deadline)
                </span>
                <span className="font-semibold text-[#202938]">112 (7%)</span>
              </div>
              <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#B42318] h-full" style={{ width: '7%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#F79009] flex items-center gap-1">
                  ● High Priority (12h deadline)
                </span>
                <span className="font-semibold text-[#202938]">348 (21%)</span>
              </div>
              <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#F79009] h-full" style={{ width: '21%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#4779B8] flex items-center gap-1">
                  ● Medium Priority (24h deadline)
                </span>
                <span className="font-semibold text-[#202938]">890 (53%)</span>
              </div>
              <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#4779B8] h-full" style={{ width: '53%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#667085] flex items-center gap-1">
                  ● Low Priority (48h deadline)
                </span>
                <span className="font-semibold text-[#202938]">340 (19%)</span>
              </div>
              <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#98A2B3] h-full" style={{ width: '19%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-[14px] text-[#202938] mb-3">
            Inquiry Ingestion Peak Hours
          </h3>
          <p className="text-xs text-[#667085] mb-4">
            Staff helpdesk staffing should align with peak submission hours:
          </p>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 bg-[#EDF3FA] border border-[#D0D5DD]">
              <span className="text-[#667085] block">09:00 - 11:00</span>
              <span className="text-[15px] font-bold text-[#4779B8] mt-1 block">38%</span>
              <span className="text-[10px] text-[#667085]">Morning Rush</span>
            </div>
            <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB]">
              <span className="text-[#667085] block">11:00 - 14:00</span>
              <span className="text-[15px] font-bold text-[#202938] mt-1 block">22%</span>
              <span className="text-[10px] text-[#667085]">Midday</span>
            </div>
            <div className="p-2.5 bg-[#EDF3FA] border border-[#D0D5DD]">
              <span className="text-[#667085] block">14:00 - 17:00</span>
              <span className="text-[15px] font-bold text-[#4779B8] mt-1 block">29%</span>
              <span className="text-[10px] text-[#667085]">Post-Class</span>
            </div>
            <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB]">
              <span className="text-[#667085] block">After 17:00</span>
              <span className="text-[15px] font-bold text-[#202938] mt-1 block">11%</span>
              <span className="text-[10px] text-[#667085]">Evening</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
