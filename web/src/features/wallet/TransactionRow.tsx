import { Link } from 'react-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Gift,
  RotateCcw,
} from 'lucide-react';
import { WalletTransaction } from '../../lib/api/types';
import { Money } from '../../components/ui/Money';
import { formatDateTime } from '../../lib/dates';
import { formatKobo } from '../../lib/money';

function getTransactionIcon(type: WalletTransaction['type'], amountKobo: number) {
  switch (type) {
    case 'dev_funding':
    case 'deposit':
      return { icon: ArrowDownLeft, bg: 'bg-success-soft', text: 'text-success' };
    case 'withdrawal':
      return { icon: ArrowUpRight, bg: 'bg-surface-muted', text: 'text-ink' };
    case 'withdrawal_reversal':
      return { icon: RotateCcw, bg: 'bg-success-soft', text: 'text-success' };
    case 'contribution':
      return { icon: Users, bg: 'bg-surface-muted', text: 'text-ink' };
    case 'payout':
      return { icon: Gift, bg: 'bg-[#FDF4E5] dark:bg-[#3D2E17]', text: 'text-accent' };
    default:
      return amountKobo > 0
        ? { icon: ArrowDownLeft, bg: 'bg-success-soft', text: 'text-success' }
        : { icon: ArrowUpRight, bg: 'bg-surface-muted', text: 'text-ink' };
  }
}

export function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const { icon: Icon, bg, text } = getTransactionIcon(tx.type, tx.amountKobo);

  return (
    <Link
      to={`/app/transactions/${tx.transactionId}`}
      className="flex items-center justify-between p-3.5 -mx-2 rounded-xl hover:bg-surface-muted/70 transition group select-none"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} ${text}`}
        >
          <Icon size={18} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-semibold text-ink truncate leading-tight group-hover:text-primary transition">
            {tx.description}
          </span>
          <span className="text-[12px] text-muted leading-tight mt-0.5">
            {formatDateTime(tx.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0 pl-3">
        <Money kobo={tx.amountKobo} tone="auto" className="text-[14px] font-semibold" />
        <span className="text-[12px] tabular-nums text-muted mt-0.5">
          Balance {formatKobo(tx.balanceAfterKobo)}
        </span>
      </div>
    </Link>
  );
}
