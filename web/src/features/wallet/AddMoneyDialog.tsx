import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { useIdempotencyKey, shouldRenewIdempotencyKey } from '../../lib/idempotency';
import { createDepositApi } from '../../lib/api/payments';
import { devFundWalletApi } from '../../lib/api/dev';
import { queryKeys } from '../../lib/query-client';
import { messageFor } from '../../lib/api/errors';
import { formatKobo } from '../../lib/money';
import { toast } from 'sonner';

export interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMoneyDialog({ open, onOpenChange }: AddMoneyDialogProps) {
  const [amountKobo, setAmountKobo] = useState<number | null>(2_000_000); // ₦20,000 default
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { key, renew } = useIdempotencyKey();
  const queryClient = useQueryClient();

  const isDevOrMock = Boolean(
    import.meta.env.DEV ||
    (import.meta.env.VITE_MOCK_DOMAINS && import.meta.env.VITE_MOCK_DOMAINS.includes('dev'))
  );

  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      return createDepositApi(amount, key);
    },
    onSuccess: (deposit) => {
      renew();
      onOpenChange(false);
      window.location.assign(deposit.checkoutUrl);
    },
    onError: (err) => {
      if (shouldRenewIdempotencyKey(err)) {
        renew();
      }
      setErrorMsg(messageFor(err));
    },
  });

  const devFundMutation = useMutation({
    mutationFn: async (amount: number) => {
      return devFundWalletApi(amount, key);
    },
    onSuccess: () => {
      renew();
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      const amountStr = amountKobo ? formatKobo(amountKobo) : '₦20,000';
      toast.success(`${amountStr} test money added`);
      onOpenChange(false);
    },
    onError: (err) => {
      if (shouldRenewIdempotencyKey(err)) {
        renew();
      }
      setErrorMsg(messageFor(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!amountKobo || amountKobo < 10_000 || amountKobo > 50_000_000) {
      setErrorMsg('Amount must be between ₦100 and ₦500,000');
      return;
    }
    depositMutation.mutate(amountKobo);
  };

  const handleDevFund = () => {
    setErrorMsg(null);
    const amount = amountKobo || 2_000_000;
    devFundMutation.mutate(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add money">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          label="Amount"
          hint="Minimum ₦100, maximum ₦500,000"
          error={errorMsg || undefined}
        >
          <MoneyInput
            value={amountKobo}
            onChange={(val) => {
              setAmountKobo(val);
              setErrorMsg(null);
            }}
            chips={[500_000, 2_000_000, 5_000_000]}
            hasError={Boolean(errorMsg)}
          />
        </Field>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            type="submit"
            size="md"
            loading={depositMutation.isPending}
            disabled={!amountKobo || amountKobo < 10_000}
            className="w-full"
          >
            Continue to payment
          </Button>

          {isDevOrMock && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={devFundMutation.isPending}
              onClick={handleDevFund}
              className="w-full text-muted hover:text-ink"
            >
              Add test money instantly
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
