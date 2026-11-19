import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-none transition-opacity duration-150 animate-in fade-in" />
        <RadixDialog.Content
          aria-describedby={description ? 'dialog-description' : undefined}
          className="fixed z-50 bg-surface border border-border text-ink shadow-[0_12px_32px_rgb(0_0_0/0.12)] outline-none transition-all duration-150
            bottom-0 inset-x-0 w-full max-h-[90vh] rounded-t-[20px] p-5 overflow-y-auto
            sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[480px] sm:rounded-[20px] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <RadixDialog.Title className="text-[20px] font-semibold text-ink font-display leading-tight">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="h-8 w-8 -mr-1 -mt-1 rounded-full inline-flex items-center justify-center text-muted hover:bg-surface-muted hover:text-ink transition focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={18} />
              </button>
            </RadixDialog.Close>
          </div>

          {description && (
            <RadixDialog.Description
              id="dialog-description"
              className="text-[14px] text-muted mb-5 -mt-2 leading-relaxed"
            >
              {description}
            </RadixDialog.Description>
          )}

          <div>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
