import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { getLedgerTransactionApi } from '../lib/api/wallet';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { CopyButton } from '../components/ui/CopyButton';
import { formatDateTime } from '../lib/dates';
import { formatKobo } from '../lib/money';

export function LedgerTransaction() {
  const { transactionId = '' } = useParams<{ transactionId: string }>();

  const {
    data: tx,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.ledgerTransaction(transactionId),
    queryFn: () => getLedgerTransactionApi(transactionId),
    enabled: Boolean(transactionId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !tx) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Double-entry column calculations
  let totalOutKobo = 0;
  let totalInKobo = 0;

  for (const entry of tx.entries) {
    if (entry.amountKobo < 0) {
      totalOutKobo += Math.abs(entry.amountKobo);
    } else {
      totalInKobo += entry.amountKobo;
    }
  }

  const isBalanced = totalOutKobo === totalInKobo;

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* Back button */}
      <Link
        to="/app/wallet"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink transition w-fit"
      >
        <ArrowLeft size={16} />
        <span>Back to wallet</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge status={tx.type} />
          <span className="text-[13px] text-muted font-medium">
            {formatDateTime(tx.createdAt)}
          </span>
        </div>

        <h1 className="text-[26px] font-[650] font-display text-ink leading-snug">
          {tx.description}
        </h1>

        <p className="text-[14px] text-muted leading-relaxed">
          Every movement of money in Kolo is recorded as a set of entries that add up to zero. Money leaving one account always arrives in another.
        </p>
      </div>

      {/* Double-entry Table */}
      <Card className="p-0 border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-[12px] font-bold uppercase tracking-wider text-muted">
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Money out</th>
                <th className="py-3 px-4 text-right">Money in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tx.entries.map((entry, idx) => {
                const isOut = entry.amountKobo < 0;
                return (
                  <tr key={idx} className="hover:bg-surface-muted/30 transition">
                    <td className="py-3 px-4 font-semibold text-ink">
                      {entry.label}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-danger font-medium">
                      {isOut ? formatKobo(Math.abs(entry.amountKobo)) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-success font-medium">
                      {!isOut ? formatKobo(entry.amountKobo) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/60 font-bold text-[14px]">
                <td className="py-3 px-4 text-ink">Total</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-danger">
                  {formatKobo(totalOutKobo)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-success">
                  {formatKobo(totalInKobo)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Balanced Verification Banner */}
      {isBalanced ? (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-success-soft text-[13px] text-success font-semibold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>
            Balanced: {formatKobo(totalOutKobo)} out, {formatKobo(totalInKobo)} in.
          </span>
        </div>
      ) : (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3.5 rounded-xl bg-danger-soft text-[13px] text-danger font-semibold"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>This transaction doesn't balance</span>
        </div>
      )}

      {/* Reference & Copy */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-muted border border-border text-[13px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted font-medium">Transaction ID:</span>
          <span className="font-mono text-[12px] text-ink truncate font-semibold">
            {tx.id}
          </span>
        </div>
        <CopyButton value={tx.id} label="Copy ID" />
      </div>
    </div>
  );
}
