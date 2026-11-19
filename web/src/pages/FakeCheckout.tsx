import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { completeFakeDepositApi } from '../lib/api/payments';
import { getDb, MockDeposit } from '../mocks/db';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatKobo } from '../lib/money';
import { toast } from 'sonner';

export function FakeCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') || '';

  const [depositAmountKobo, setDepositAmountKobo] = useState<number | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);

  useEffect(() => {
    if (reference) {
      const db = getDb();
      const dep = db.deposits.find((d: MockDeposit) => d.reference === reference);
      if (dep) {
        setDepositAmountKobo(dep.amountKobo);
        setDepositId(dep.id);
      }
    }
  }, [reference]);

  const completeMutation = useMutation({
    mutationFn: (outcome: 'success' | 'failed') =>
      completeFakeDepositApi(reference, outcome),
    onSuccess: (data: { depositId: string }) => {
      const targetDepositId = data.depositId || depositId;
      navigate(`/app/wallet?deposit=${targetDepositId}`);
    },
    onError: () => {
      toast.error('Simulation failed');
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-gray-900 font-sans">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-white border border-gray-200 shadow-sm flex flex-col gap-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-gray-600" />
            <h1 className="text-[18px] font-bold text-gray-800">
              Test checkout
            </h1>
          </div>
          <span className="text-[11px] font-mono uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
            Sandbox
          </span>
        </div>

        <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono font-bold text-gray-800">{reference || '—'}</span>
          </div>

          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Amount to pay</span>
            <span className="font-bold text-[18px] text-gray-900 tabular-nums">
              {depositAmountKobo !== null ? formatKobo(depositAmountKobo) : '—'}
            </span>
          </div>
        </div>

        <p className="text-[13px] text-gray-500 text-center leading-relaxed">
          This is a simulated payment gateway. Select an outcome to simulate the payment provider response.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            variant="primary"
            loading={completeMutation.isPending && completeMutation.variables === 'success'}
            onClick={() => completeMutation.mutate('success')}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <CheckCircle size={16} className="mr-1.5" />
            Simulate successful payment
          </Button>

          <Button
            type="button"
            variant="secondary"
            loading={completeMutation.isPending && completeMutation.variables === 'failed'}
            onClick={() => completeMutation.mutate('failed')}
            className="w-full border-gray-300 text-red-700 hover:bg-red-50"
          >
            <XCircle size={16} className="mr-1.5" />
            Simulate failed payment
          </Button>
        </div>
      </Card>
    </div>
  );
}
