import React from 'react';
import { TestModeBanner } from './TestModeBanner';
import { KoloWordmark } from '../ui/KoloWordmark';

export interface PublicLayoutProps {
  children: React.ReactNode;
  formMode?: boolean;
}

export function PublicLayout({ children, formMode = false }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <TestModeBanner />
      <header className="flex h-16 w-full items-center justify-between px-6 border-b border-border/60 bg-surface/40 backdrop-blur-xs">
        <KoloWordmark linkTo="/" />
      </header>

      <main className="flex-1 flex flex-col">
        {formMode ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-[440px]">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
