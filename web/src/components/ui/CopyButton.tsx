import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({
  value,
  label = 'Copy',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] font-medium text-ink hover:bg-surface-muted transition select-none outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {copied ? (
        <>
          <Check size={14} className="text-success shrink-0" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={14} className="text-muted shrink-0" />
          <span>{label}</span>
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
