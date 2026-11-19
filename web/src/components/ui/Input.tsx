import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = '', disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`h-11 w-full rounded-xl border px-3.5 text-[15px] text-ink bg-surface placeholder:text-muted outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
