import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none focus:ring-1 focus:ring-[#4779B8] disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-[13px]';

    const variants = {
      primary: 'bg-[#4779B8] text-white hover:bg-[#38699F] active:bg-[#2F5887] border border-transparent',
      secondary: 'bg-[#EDF3FA] text-[#4779B8] hover:bg-[#E2ECF7] active:bg-[#D5E3F2] border border-transparent',
      outline: 'bg-white text-[#202938] hover:bg-[#F9FAFB] border border-[#E5E7EB] active:bg-[#F2F4F7]',
      danger: 'bg-[#D9534F] text-white hover:bg-[#C9423E] active:bg-[#B33431] border border-transparent',
      ghost: 'bg-transparent text-[#667085] hover:text-[#202938] hover:bg-[#F5F6F8] border border-transparent',
    };

    const sizes = {
      sm: 'h-[30px] px-2.5 text-[12px]',
      md: 'h-[36px] px-3.5 text-[13px]',
      lg: 'h-[40px] px-4 text-[14px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{ borderRadius: '4px' }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
