import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive,
  subtext,
  icon,
  className,
}) => {
  return (
    <div
      style={{ borderRadius: '4px' }}
      className={cn('bg-white border border-[#E5E7EB] p-4 flex flex-col justify-between', className)}
    >
      <div className="flex items-center justify-between text-[#667085] mb-2">
        <span className="text-[13px] font-medium text-[#667085]">{label}</span>
        {icon && <div className="text-[#4779B8] p-1.5 bg-[#EDF3FA] rounded">{icon}</div>}
      </div>
      <div>
        <div className="text-[24px] font-semibold text-[#202938] leading-none tracking-tight">
          {value}
        </div>
        {(change || subtext) && (
          <div className="flex items-center gap-1.5 mt-2 text-[12px]">
            {change && (
              <span
                className={cn(
                  'flex items-center font-medium',
                  isPositive ? 'text-[#26966A]' : 'text-[#D9534F]'
                )}
              >
                {isPositive ? <TrendingUp size={13} className="mr-0.5" /> : <TrendingDown size={13} className="mr-0.5" />}
                {change}
              </span>
            )}
            {subtext && <span className="text-[#98A2B3]">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
