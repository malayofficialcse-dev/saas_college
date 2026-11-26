'use client';

import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Smile,
  Frown,
  TrendingUp,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { QueryFeedbackItem } from '@/lib/types';
import { MOCK_FEEDBACK } from '@/lib/mock-data';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';

export const FeedbackView: React.FC = () => {
  const [feedbackList] = useState<QueryFeedbackItem[]>(MOCK_FEEDBACK);
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');

  const avgRating = (
    feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length
  ).toFixed(1);

  const filtered = feedbackList.filter((fb) => {
    if (ratingFilter !== 'ALL' && fb.rating !== ratingFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
          Student Feedback & CSAT Quality
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Post-resolution satisfaction scores, student sentiment, and resolution quality metrics.
        </p>
      </div>

      {/* CSAT Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall CSAT Index"
          value={`${avgRating} / 5.0`}
          icon={<Star size={20} className="text-[#F79009] fill-[#F79009]" />}
          change={{ value: '+0.3 vs last month', type: 'positive' }}
        />
        <StatCard
          title="Positive Satisfaction"
          value="96.2%"
          icon={<Smile size={20} className="text-[#12B76A]" />}
          subtitle="4 & 5 star ratings"
        />
        <StatCard
          title="Response Speed Score"
          value="4.9 / 5"
          icon={<CheckCircle size={20} className="text-[#4779B8]" />}
          subtitle="Rated by 142 students"
        />
        <StatCard
          title="Resolution Accuracy"
          value="98.1%"
          icon={<TrendingUp size={20} className="text-[#7F56D9]" />}
          subtitle="First contact resolution"
        />
      </div>

      {/* Ratings Distribution & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating Breakdown Bar Chart Card */}
        <Card className="md:col-span-1">
          <h3 className="font-semibold text-[14px] text-[#202938] mb-3">
            Rating Distribution
          </h3>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = feedbackList.filter((f) => f.rating === stars).length;
              const pct = Math.round((count / feedbackList.length) * 100);
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-[#667085] font-medium flex items-center gap-1">
                    {stars} <Star size={11} className="text-[#F79009] fill-[#F79009]" />
                  </span>
                  <div className="flex-1 bg-[#F2F4F7] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#F79009] h-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold text-[#344054]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Feedback List Stream */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">
              Recent Student Reviews ({filtered.length})
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#667085]">Filter:</span>
              <button
                onClick={() => setRatingFilter('ALL')}
                className={`px-2 py-0.5 rounded text-xs ${
                  ratingFilter === 'ALL' ? 'bg-[#4779B8] text-white font-semibold' : 'text-[#667085]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRatingFilter(5)}
                className={`px-2 py-0.5 rounded text-xs ${
                  ratingFilter === 5 ? 'bg-[#4779B8] text-white font-semibold' : 'text-[#667085]'
                }`}
              >
                5★
              </button>
              <button
                onClick={() => setRatingFilter(4)}
                className={`px-2 py-0.5 rounded text-xs ${
                  ratingFilter === 4 ? 'bg-[#4779B8] text-white font-semibold' : 'text-[#667085]'
                }`}
              >
                4★
              </button>
              <button
                onClick={() => setRatingFilter(3)}
                className={`px-2 py-0.5 rounded text-xs ${
                  ratingFilter === 3 ? 'bg-[#4779B8] text-white font-semibold' : 'text-[#667085]'
                }`}
              >
                3★
              </button>
            </div>
          </div>

          {filtered.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-[#202938]">
                      {item.studentName}
                    </span>
                    <Badge variant="primary">{item.queryTicketNumber}</Badge>
                  </div>
                  <span className="text-[11px] text-[#667085]">{item.studentEmail}</span>
                </div>

                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < item.rating
                          ? 'text-[#F79009] fill-[#F79009]'
                          : 'text-[#D0D5DD]'
                      }
                    />
                  ))}
                </div>
              </div>

              <p className="mt-3 text-xs text-[#344054] leading-relaxed">
                "{item.comment}"
              </p>

              <div className="mt-3 pt-2.5 border-t border-[#F2F4F7] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{ borderRadius: '4px' }}
                      className="px-2 py-0.5 bg-[#EDF3FA] text-[#4779B8] text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-[#98A2B3]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
