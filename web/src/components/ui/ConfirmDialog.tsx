import React from 'react';
import { Dialog } from './Dialog';
import { Button, ButtonVariant } from './Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmRow {
  label: string;
  value: React.ReactNode;
  isDanger?: boolean;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  warning?: string;
  rows?: ConfirmRow[];
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  rows = [],
  confirmLabel,
  confirmVariant = 'primary',
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex flex-col gap-4">
        {warning && (
          <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft p-3 text-[13px] text-warning font-medium">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{warning}</span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-muted divide-y divide-border overflow-hidden">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-[14px]">
                <span className="text-muted">{row.label}</span>
                <span
                  className={`font-semibold tabular-nums text-right ${
                    row.isDanger ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {children}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={confirmLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            loading={confirmLoading}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
