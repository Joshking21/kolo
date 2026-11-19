export type BadgeTone =
  | 'warning-soft'
  | 'success-soft'
  | 'danger-soft'
  | 'surface-muted'
  | 'accent-soft'
  | 'primary-soft';

export interface BadgeProps {
  status?: string;
  label?: string;
  tone?: BadgeTone;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  // Group status
  forming: { label: 'Forming', tone: 'warning-soft' },
  active: { label: 'Active', tone: 'success-soft' },
  completed: { label: 'Completed', tone: 'surface-muted' },
  cancelled: { label: 'Cancelled', tone: 'danger-soft' },

  // Round status
  upcoming: { label: 'Upcoming', tone: 'surface-muted' },
  collecting: { label: 'Collecting', tone: 'accent-soft' },
  paid_out: { label: 'Paid out', tone: 'success-soft' },

  // Payment status
  pending: { label: 'Pending', tone: 'warning-soft' },
  processing: { label: 'Processing', tone: 'warning-soft' },
  succeeded: { label: 'Successful', tone: 'success-soft' },
  failed: { label: 'Failed', tone: 'danger-soft' },

  // Roles
  admin: { label: 'Admin', tone: 'primary-soft' },
  member: { label: 'Member', tone: 'surface-muted' },
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  'warning-soft': 'bg-warning-soft text-warning',
  'success-soft': 'bg-success-soft text-success',
  'danger-soft': 'bg-danger-soft text-danger',
  'surface-muted': 'bg-surface-muted text-muted',
  'accent-soft': 'bg-[#FDF4E5] dark:bg-[#3D2E17] text-[#9A5B00] dark:text-[#E8A33D]',
  'primary-soft': 'bg-primary text-on-primary',
};

export function Badge({ status, label, tone, className = '' }: BadgeProps) {
  let resolvedLabel = label ?? status ?? '';
  let resolvedTone: BadgeTone = tone ?? 'surface-muted';

  if (status && STATUS_CONFIG[status]) {
    const config = STATUS_CONFIG[status]!;
    if (!label) resolvedLabel = config.label;
    if (!tone) resolvedTone = config.tone;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold tracking-normal select-none ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      {resolvedLabel}
    </span>
  );
}
