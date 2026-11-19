import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface/50 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted mb-3">
        <Icon size={24} />
      </div>
      <h3 className="text-[16px] font-semibold text-ink mb-1">
        {title}
      </h3>
      <p className="text-[14px] text-muted max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
