import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-[13px] font-medium text-[#202938] mb-1">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          style={{ borderRadius: '4px' }}
          className={cn(
            'w-full h-[38px] px-3 bg-white text-[13px] text-[#202938] border border-[#E5E7EB] transition-colors cursor-pointer',
            'focus:outline-none focus:border-[#4779B8] focus:ring-1 focus:ring-[#4779B8]',
            'disabled:bg-[#F5F6F8] disabled:cursor-not-allowed disabled:text-[#98A2B3]',
            error && 'border-[#D9534F] focus:border-[#D9534F] focus:ring-[#D9534F]',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-[12px] text-[#D9534F]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[12px] text-[#667085]">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
