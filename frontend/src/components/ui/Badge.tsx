import React from 'react';
import { cn } from '@/lib/utils';
import { QueryPriority, QueryStatus } from '@/lib/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  status?: QueryStatus;
  priority?: QueryPriority;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  status,
  priority,
  children,
  ...props
}) => {
  let resolvedVariant = variant;

  if (status) {
    switch (status) {
      case 'OPEN':
        resolvedVariant = 'info';
        break;
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        resolvedVariant = 'default';
        break;
      case 'WAITING_FOR_STUDENT':
      case 'WAITING_FOR_STAFF':
        resolvedVariant = 'warning';
        break;
      case 'ESCALATED':
        resolvedVariant = 'danger';
        break;
      case 'RESOLVED':
      case 'CLOSED':
        resolvedVariant = 'success';
        break;
      case 'CANCELLED':
        resolvedVariant = 'outline';
        break;
    }
  } else if (priority) {
    switch (priority) {
      case 'LOW':
        resolvedVariant = 'outline';
        break;
      case 'MEDIUM':
        resolvedVariant = 'info';
        break;
      case 'HIGH':
        resolvedVariant = 'warning';
        break;
      case 'URGENT':
        resolvedVariant = 'danger';
        break;
    }
  }

  const variants = {
    default: 'bg-[#F2F4F7] text-[#344054] border border-[#E5E7EB]',
    success: 'bg-[#EBF7F2] text-[#26966A] border border-[#B5E3D1]',
    warning: 'bg-[#FDF5E8] text-[#D99A3D] border border-[#F4DCB4]',
    danger: 'bg-[#FCEEEE] text-[#D9534F] border border-[#F3B7B5]',
    info: 'bg-[#EDF3FA] text-[#4779B8] border border-[#C5DAF0]',
    outline: 'bg-white text-[#667085] border border-[#E5E7EB]',
  };

  return (
    <span
      style={{ borderRadius: '4px' }}
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider select-none leading-none',
        variants[resolvedVariant],
        className
      )}
      {...props}
    >
      {children || status || priority}
    </span>
  );
};
