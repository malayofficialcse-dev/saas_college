import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{ borderRadius: '4px' }}
      className="flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E5E7EB]"
    >
      <div className="p-3 bg-[#F2F4F7] text-[#667085] rounded mb-3">
        {icon || <Inbox size={24} />}
      </div>
      <h4 className="text-[15px] font-medium text-[#202938]">{title}</h4>
      <p className="text-[13px] text-[#667085] mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
