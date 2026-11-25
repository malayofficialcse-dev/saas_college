import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  title,
  subtitle,
  action,
  padding = 'md',
  children,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      style={{ borderRadius: '4px' }}
      className={cn('bg-white border border-[#E5E7EB]', className)}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <div>
            {title && <h3 className="text-[15px] font-medium text-[#202938] leading-tight">{title}</h3>}
            {subtitle && <p className="text-[12px] text-[#667085] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
    </div>
  );
};
