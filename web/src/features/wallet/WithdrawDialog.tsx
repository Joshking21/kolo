import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { formatKobo } from '../../lib/money';
import { queryKeys } from '../../lib/query-client';
import { getBanksApi, createWithdrawalApi } from '../../lib/api/payments';
import { useIdempotencyKey, shouldRenewIdempotencyKey } from '../../lib/idempotency';
import { messageFor } from '../../lib/api/errors';
import { toast } from 'sonner';

export interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalanceKobo: number;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  availableBalanceKobo,
}: WithdrawDialogProps) {
  const [amountKobo, setAmountKobo] = useState<number | null>(null);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const { key, renew } = useIdempotencyKey();
  const queryClient = useQueryClient();

  const { data: banksData } = useQuery({
    queryKey: queryKeys.banks(),
    queryFn: getBanksApi,
    staleTime: Infinity,
  });
  const banks = banksData?.data ?? [];

  const selectedBank = banks.find((b) => b.code === bankCode);

  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      if (!amountKobo || !bankCode || !accountNumber || !accountName) {
        throw new Error('All fields are required');
      }
      return createWithdrawalApi(
        {
          amountKobo,
          bankCode,
          accountNumber,
          accountName,
        },
        key
      );
    },
    onSuccess: () => {
      renew();
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals() });
      toast.success('Withdrawal started');
      setConfirmOpen(false);
      onOpenChange(false);
      // Reset form
      setAmountKobo(null);
      setAccountNumber('');
      setAccountName('');
    },
    onError: (err) => {
      if (shouldRenewIdempotencyKey(err)) {
        renew();
      }
      toast.error(messageFor(err));
    },
  });

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!amountKobo || amountKobo < 10_000) {
      setFormError('Minimum withdrawal is ₦100');
      return;
    }
    if (amountKobo > availableBalanceKobo) {
      setFormError("You don't have enough in your wallet. Add money and try again.");
      return;
    }
    if (!bankCode) {
      setFormError('Please select a bank');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setFormError('Account number must be 10 digits');
      return;
    }
    if (!accountName.trim() || accountName.trim().length < 3) {
      setFormError('Account name must be at least 3 characters');
      return;
    }

    setConfirmOpen(true);
  };

  const balanceAfter = amountKobo ? availableBalanceKobo - amountKobo : availableBalanceKobo;
  const maskedAccount = accountNumber.length === 10 ? `******${accountNumber.slice(-4)}` : accountNumber;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title="Withdraw funds">
        <form onSubmit={handleReview} className="flex flex-col gap-4">
          <Field
            label="Amount"
            hint={`Available: ${formatKobo(availableBalanceKobo)}`}
            error={formError || undefined}
          >
            <MoneyInput
              value={amountKobo}
              onChange={(val) => {
                setAmountKobo(val);
                setFormError(null);
              }}
              hasError={Boolean(formError)}
            />
          </Field>

          <Field label="Bank">
            <Select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
            >
              <option value="">Select a bank...</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Account number"
            hint={
              import.meta.env.DEV
                ? 'Tip: numbers ending in 0000 always fail. Useful for testing.'
                : undefined
            }
          >
            <Input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              required
            />
          </Field>

          <Field label="Account name">
            <Input
              type="text"
              placeholder="Name as it appears on bank account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </Field>

          <div className="pt-2">
            <Button
              type="submit"
              size="md"
              disabled={!amountKobo || amountKobo > availableBalanceKobo}
              className="w-full"
            >
              Review
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm withdrawal"
        confirmLabel={`Withdraw ${amountKobo ? formatKobo(amountKobo) : ''}`}
        confirmLoading={withdrawalMutation.isPending}
        onConfirm={() => withdrawalMutation.mutate()}
        rows={[
          { label: 'Amount', value: amountKobo ? formatKobo(amountKobo) : '₦0' },
          { label: 'Bank', value: selectedBank?.name ?? bankCode },
          { label: 'Account', value: maskedAccount },
          { label: 'Name', value: accountName },
          { label: 'Balance after', value: formatKobo(balanceAfter) },
        ]}
      />
    </>
  );
}
