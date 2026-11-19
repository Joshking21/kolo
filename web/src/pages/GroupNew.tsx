import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, AlertCircle } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { createGroupApi } from '../lib/api/groups';
import { createGroupFormSchema, CreateGroupFormValues } from '../lib/validation';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { MoneyInput } from '../components/ui/MoneyInput';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatKobo } from '../lib/money';
import { messageFor } from '../lib/api/errors';
import { toast } from 'sonner';

export function GroupNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: '',
      description: null,
      contributionKobo: 1_000_000, // ₦10,000
      frequency: 'weekly',
      maxMembers: 6,
      payoutOrder: 'join_order',
    },
  });

  const formValues = watch();
  const descLength = (formValues.description || '').length;

  const createGroupMutation = useMutation({
    mutationFn: (values: CreateGroupFormValues) => {
      return createGroupApi(values);
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success('Group created. Share the invite code to bring people in.');
      navigate(`/app/groups/${newGroup.id}`);
    },
    onError: (err) => {
      setServerError(messageFor(err));
    },
  });

  const onSubmit = (data: CreateGroupFormValues) => {
    setServerError(null);
    createGroupMutation.mutate(data);
  };

  // Live Summary Calculations
  const contribution = formValues.contributionKobo || 0;
  const maxMembers = formValues.maxMembers || 2;
  const totalPot = contribution * maxMembers;
  const freqLabel = formValues.frequency === 'weekly' ? 'weekly' : 'monthly';
  const durationUnit = formValues.frequency === 'weekly' ? 'weeks' : 'months';

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-[28px] font-[650] font-display text-ink leading-tight mb-1">
          Create a group
        </h1>
        <p className="text-[14px] text-muted">
          Set up a new savings circle for your team or family.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3.5 text-[13px] text-danger font-medium"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-8 flex flex-col gap-6"
        >
          <Field id="name" label="Group name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="e.g. Office Ajo"
              hasError={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>

          <Field
            id="description"
            label="Description (optional)"
            hint={`${280 - descLength} characters remaining`}
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              maxLength={280}
              placeholder="What is this savings circle for?"
              hasError={Boolean(errors.description)}
              {...register('description')}
            />
          </Field>

          <Field
            label="Contribution per round"
            hint="Minimum ₦1,000, whole naira only"
            error={errors.contributionKobo?.message}
          >
            <Controller
              name="contributionKobo"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onChange={(val) => field.onChange(val || 0)}
                  chips={[100_000, 500_000, 1_000_000, 5_000_000]}
                  hasError={Boolean(errors.contributionKobo)}
                />
              )}
            />
          </Field>

          {/* Frequency (Segmented control) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-ink">
              Frequency
            </span>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-muted border border-border">
              <label
                className={`flex items-center justify-center h-10 rounded-[10px] text-[14px] font-semibold cursor-pointer transition select-none ${
                  formValues.frequency === 'weekly'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  value="weekly"
                  className="sr-only"
                  {...register('frequency')}
                />
                Weekly
              </label>
              <label
                className={`flex items-center justify-center h-10 rounded-[10px] text-[14px] font-semibold cursor-pointer transition select-none ${
                  formValues.frequency === 'monthly'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  value="monthly"
                  className="sr-only"
                  {...register('frequency')}
                />
                Monthly
              </label>
            </div>
            {errors.frequency && (
              <span className="text-[13px] text-danger font-medium">
                {errors.frequency.message}
              </span>
            )}
          </div>

          {/* Max Members Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-ink">
              Max members
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setValue('maxMembers', Math.max(2, (formValues.maxMembers || 2) - 1))
                }
                disabled={formValues.maxMembers <= 2}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-ink hover:bg-surface-muted transition disabled:opacity-40"
              >
                <Minus size={16} />
              </button>

              <input
                type="number"
                min={2}
                max={12}
                value={formValues.maxMembers}
                onChange={(e) =>
                  setValue('maxMembers', parseInt(e.target.value, 10) || 2)
                }
                className="h-11 w-20 text-center rounded-xl border border-border bg-surface text-[16px] font-bold tabular-nums outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setValue('maxMembers', Math.min(12, (formValues.maxMembers || 2) + 1))
                }
                disabled={formValues.maxMembers >= 12}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-ink hover:bg-surface-muted transition disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
              <span className="text-[13px] text-muted">
                Between 2 and 12 members
              </span>
            </div>
            {errors.maxMembers && (
              <span className="text-[13px] text-danger font-medium">
                {errors.maxMembers.message}
              </span>
            )}
          </div>

          {/* Payout Order Radio Cards */}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink">
              Payout order
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex flex-col p-4 rounded-[14px] border cursor-pointer transition ${
                  formValues.payoutOrder === 'join_order'
                    ? 'border-primary bg-surface-muted/40 ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-surface-muted/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[14px] text-ink">
                    Order people joined
                  </span>
                  <input
                    type="radio"
                    value="join_order"
                    className="h-4 w-4 accent-primary"
                    {...register('payoutOrder')}
                  />
                </div>
                <p className="text-[13px] text-muted leading-relaxed">
                  The first to join collects first. You're first.
                </p>
              </label>

              <label
                className={`flex flex-col p-4 rounded-[14px] border cursor-pointer transition ${
                  formValues.payoutOrder === 'random'
                    ? 'border-primary bg-surface-muted/40 ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-surface-muted/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[14px] text-ink">
                    Random
                  </span>
                  <input
                    type="radio"
                    value="random"
                    className="h-4 w-4 accent-primary"
                    {...register('payoutOrder')}
                  />
                </div>
                <p className="text-[13px] text-muted leading-relaxed">
                  Kolo shuffles the order when the group starts.
                </p>
              </label>
            </div>
            {errors.payoutOrder && (
              <span className="text-[13px] text-danger font-medium">
                {errors.payoutOrder.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            size="md"
            loading={createGroupMutation.isPending}
            className="w-full mt-4"
          >
            Create group
          </Button>
        </form>

        {/* Live Summary Panel (sticky on desktop) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <Card className="p-6 bg-surface border-border flex flex-col gap-4">
            <h3 className="font-display font-semibold text-[17px] text-ink pb-3 border-b border-border">
              Summary
            </h3>

            <div className="flex flex-col gap-3 text-[14px]">
              <div className="flex items-start justify-between">
                <span className="text-muted">Payment</span>
                <span className="font-semibold tabular-nums text-right text-ink">
                  Each member pays {formatKobo(contribution)} {freqLabel}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-muted">Each payout</span>
                <div className="flex flex-col items-end">
                  <span className="font-bold tabular-nums text-primary text-[16px]">
                    {formatKobo(totalPot)}
                  </span>
                  <span className="text-[11px] text-muted">
                    if the group is full
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between pt-2 border-t border-border">
                <span className="text-muted">Duration</span>
                <span className="font-semibold tabular-nums text-ink">
                  The group runs for {maxMembers} {durationUnit}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
