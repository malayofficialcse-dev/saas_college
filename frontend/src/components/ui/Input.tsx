import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-[#202938] mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-[#98A2B3] pointer-events-none flex items-center">{leftIcon}</div>}
          <input
            id={inputId}
            ref={ref}
            style={{ borderRadius: '4px' }}
            className={cn(
              'w-full h-[38px] px-3 bg-white text-[13px] text-[#202938] border border-[#E5E7EB] placeholder-[#98A2B3] transition-colors',
              'focus:outline-none focus:border-[#4779B8] focus:ring-1 focus:ring-[#4779B8]',
              'disabled:bg-[#F5F6F8] disabled:cursor-not-allowed disabled:text-[#98A2B3]',
              leftIcon && 'pl-9',
              error && 'border-[#D9534F] focus:border-[#D9534F] focus:ring-[#D9534F]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-[12px] text-[#D9534F]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[12px] text-[#667085]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
