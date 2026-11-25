import React from 'react';
import { cn } from '@/lib/utils';

export interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1 border-b border-[#E5E7EB] bg-transparent', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{ borderRadius: '4px 4px 0 0' }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors cursor-pointer select-none -mb-[1px]',
              isActive
                ? 'border-[#4779B8] text-[#4779B8] bg-white'
                : 'border-transparent text-[#667085] hover:text-[#202938] hover:border-[#D0D5DD]'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{ borderRadius: '4px' }}
                className={cn(
                  'px-1.5 py-0.2 text-[11px] leading-tight font-semibold',
                  isActive ? 'bg-[#EDF3FA] text-[#4779B8]' : 'bg-[#F2F4F7] text-[#667085]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
