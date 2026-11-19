import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, className = '', disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-xl border p-3 text-[15px] text-ink bg-surface placeholder:text-muted outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
