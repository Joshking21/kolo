import { formatKobo } from '../../lib/money';

export interface MoneyProps {
  kobo: number;
  signDisplay?: 'auto' | 'always' | 'never';
  tone?: 'neutral' | 'auto' | 'danger';
  hidden?: boolean;
  className?: string;
}

export function Money({
  kobo,
  signDisplay = 'auto',
  tone = 'neutral',
  hidden = false,
  className = '',
}: MoneyProps) {
  if (hidden) {
    return (
      <span className={`tabular-nums font-semibold tracking-wider ${className}`}>
        ₦ ••••••
      </span>
    );
  }

  let colorClass = 'text-ink';
  if (tone === 'auto') {
    if (kobo > 0) {
      colorClass = 'text-success';
    } else {
      colorClass = 'text-ink';
    }
  } else if (tone === 'danger') {
    colorClass = 'text-danger';
  }

  const formatted = formatKobo(kobo, { signDisplay });
  const prefix = tone === 'auto' && kobo > 0 && signDisplay !== 'never' ? '+' : '';

  return (
    <span className={`tabular-nums font-semibold ${colorClass} ${className}`}>
      {prefix}
      {formatted}
    </span>
  );
}
