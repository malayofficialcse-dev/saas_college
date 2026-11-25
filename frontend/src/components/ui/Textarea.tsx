import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-[13px] font-medium text-[#202938] mb-1">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          style={{ borderRadius: '4px' }}
          className={cn(
            'w-full min-h-[80px] p-2.5 bg-white text-[13px] text-[#202938] border border-[#E5E7EB] placeholder-[#98A2B3] transition-colors resize-y',
            'focus:outline-none focus:border-[#4779B8] focus:ring-1 focus:ring-[#4779B8]',
            'disabled:bg-[#F5F6F8] disabled:cursor-not-allowed',
            error && 'border-[#D9534F] focus:border-[#D9534F] focus:ring-[#D9534F]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[12px] text-[#D9534F]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[12px] text-[#667085]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
