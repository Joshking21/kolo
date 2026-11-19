import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'muted' | 'primary';
}

export function Card({
  variant = 'surface',
  className = '',
  children,
  ...props
}: CardProps) {
  const variants = {
    surface: 'bg-surface text-ink border border-border',
    muted: 'bg-surface-muted text-ink border border-border',
    primary: 'bg-primary text-on-primary border-transparent',
  };

  return (
    <div
      className={`rounded-2xl p-5 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
