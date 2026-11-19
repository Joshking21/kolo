import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError = false, className = '', disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`h-11 w-full appearance-none rounded-xl border pl-3.5 pr-10 text-[15px] text-ink bg-surface outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${
            hasError
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <ChevronDown size={18} />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
