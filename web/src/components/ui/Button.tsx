import React, { forwardRef } from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const base =
      'relative inline-flex items-center justify-center font-semibold rounded-xl transition select-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover shadow-xs',
      secondary:
        'bg-surface text-ink border border-border hover:bg-surface-muted active:bg-surface-muted',
      ghost:
        'bg-transparent text-ink hover:bg-surface-muted active:bg-surface-muted',
      danger:
        'bg-danger text-white hover:opacity-90 active:opacity-95',
    };

    const sizes: Record<ButtonSize, string> = {
      md: 'h-11 px-4 text-[14px] min-w-[44px]',
      sm: 'h-9 px-3 text-[13px] min-w-[44px] min-h-[44px] sm:min-h-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size={size === 'sm' ? 16 : 18} />
          </span>
        )}
        <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
