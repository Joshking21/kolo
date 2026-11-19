import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, hint, error, className = '', children }: FieldProps) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[14px] font-semibold text-ink"
        >
          {label}
        </label>
      )}

      {/* If child is single element we could clone it or simply wrap it */}
      <div>{children}</div>

      {hint && !error && (
        <p id={hintId} className="text-[13px] text-muted leading-tight">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-[13px] text-danger font-medium leading-tight"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
