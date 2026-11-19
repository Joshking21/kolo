import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, AlertCircle } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { joinGroupApi } from '../lib/api/groups';
import { cleanInviteCode, formatInviteCode } from '../lib/invite-code';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Card } from '../components/ui/Card';
import { messageFor } from '../lib/api/errors';
import { toast } from 'sonner';

export function Join() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const codeParam = searchParams.get('code') || '';
  const [rawInput, setRawInput] = useState(() => formatInviteCode(codeParam));
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (codeParam) {
      setRawInput(formatInviteCode(codeParam));
    }
  }, [codeParam]);

  const joinMutation = useMutation({
    mutationFn: (cleanedCode: string) => joinGroupApi(cleanedCode),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success(`Joined "${group.name}"!`);
      navigate(`/app/groups/${group.id}`);
    },
    onError: (err) => {
      setServerError(messageFor(err));
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setRawInput(formatInviteCode(val));
    setServerError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const cleaned = cleanInviteCode(rawInput);
    if (!cleaned) {
      setServerError('That invite code doesn’t match any group.');
      return;
    }

    joinMutation.mutate(cleaned);
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full max-w-md mx-auto">
      <Card className="w-full p-6 sm:p-8 bg-surface border-border shadow-xs">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary mb-3">
            <UserPlus size={22} />
          </div>
          <h1 className="text-[24px] font-[650] font-display text-ink mb-1">
            Join a savings group
          </h1>
          <p className="text-[14px] text-muted">
            Enter the 8-character code shared by your group admin.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-[13px] text-danger font-medium mb-4"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Invite code"
            hint="Format: K7QM-2XPA"
            error={serverError || undefined}
          >
            <input
              type="text"
              autoCapitalize="characters"
              placeholder="K7QM-2XPA"
              value={rawInput}
              onChange={handleChange}
              maxLength={9} // 8 chars + hyphen
              className="h-12 w-full text-center font-mono text-[20px] font-bold tracking-widest uppercase rounded-xl border border-border bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
            />
          </Field>

          <Button
            type="submit"
            size="md"
            loading={joinMutation.isPending}
            disabled={!cleanInviteCode(rawInput)}
            className="w-full mt-2"
          >
            Join group
          </Button>
        </form>
      </Card>
    </div>
  );
}
