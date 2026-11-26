import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  change?: string | { value: string; type: 'positive' | 'negative' };
  isPositive?: boolean;
  subtext?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  change,
  isPositive,
  subtext,
  subtitle,
  icon,
  className,
}) => {
  const displayLabel = title || label || '';
  const displaySubtext = subtitle || subtext;
  const changeText = typeof change === 'object' ? change?.value : change;
  const changeIsPositive =
    typeof change === 'object' ? change?.type === 'positive' : isPositive;

  return (
    <div
      style={{ borderRadius: '4px' }}
      className={cn('bg-white border border-[#E5E7EB] p-4 flex flex-col justify-between', className)}
    >
      <div className="flex items-center justify-between text-[#667085] mb-2">
        <span className="text-[13px] font-medium text-[#667085]">{displayLabel}</span>
        {icon && <div className="text-[#4779B8] p-1.5 bg-[#EDF3FA] rounded">{icon}</div>}
      </div>
      <div>
        <div className="text-[24px] font-semibold text-[#202938] leading-none tracking-tight">
          {value}
        </div>
        {(changeText || displaySubtext) && (
          <div className="flex items-center gap-1.5 mt-2 text-[12px]">
            {changeText && (
              <span
                className={cn(
                  'flex items-center font-medium',
                  changeIsPositive ? 'text-[#26966A]' : 'text-[#D9534F]'
                )}
              >
                {changeIsPositive ? (
                  <TrendingUp size={13} className="mr-0.5" />
                ) : (
                  <TrendingDown size={13} className="mr-0.5" />
                )}
                {changeText}
              </span>
            )}
            {displaySubtext && <span className="text-[#98A2B3]">{displaySubtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
