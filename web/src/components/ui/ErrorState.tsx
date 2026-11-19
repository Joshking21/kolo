import { AlertCircle } from 'lucide-react';
import { isApiError, messageFor } from '../../lib/api/errors';
import { Button } from './Button';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className = '' }: ErrorStateProps) {
  const userMessage = messageFor(error);
  const requestId = isApiError(error) ? error.requestId : null;
  const shortRef = requestId ? requestId.slice(0, 8) : null;

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-danger-soft bg-surface ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger mb-3">
        <AlertCircle size={24} />
      </div>

      <h3 className="text-[16px] font-semibold text-ink mb-1">
        Couldn't load this
      </h3>

      <p className="text-[14px] text-muted max-w-sm mb-4 leading-relaxed">
        {userMessage}
      </p>

      {onRetry && (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mb-3">
          Try again
        </Button>
      )}

      {shortRef && (
        <span className="text-[12px] font-mono text-muted">
          Ref: {shortRef}
        </span>
      )}
    </div>
  );
}
