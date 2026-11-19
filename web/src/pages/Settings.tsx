import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileFormSchema,
  ProfileFormValues,
  passwordChangeFormSchema,
  PasswordChangeFormValues,
} from '../lib/validation';
import { updateMeApi, changePasswordApi } from '../lib/api/auth';
import { useAuth } from '../lib/auth/AuthProvider';
import { queryKeys } from '../lib/query-client';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { messageFor } from '../lib/api/errors';
import { toast } from 'sonner';

type ThemeMode = 'system' | 'light' | 'dark';

export function Settings() {
  const { user, logout, logoutAll, setUserDirectly } = useAuth();
  const queryClient = useQueryClient();

  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('kolo-theme') as ThemeMode) || 'system';
    } catch {
      return 'system';
    }
  });

  // Theme change
  const applyTheme = (mode: ThemeMode) => {
    setTheme(mode);
    try {
      localStorage.setItem('kolo-theme', mode);
      if (mode === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (mode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch {
      // ignore
    }
  };

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { isDirty: isProfileDirty, isSubmitting: isProfileSubmitting, errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        fullName: user.fullName,
        phone: user.phone,
      });
    }
  }, [user, resetProfile]);

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateMeApi(values),
    onSuccess: (updatedUser) => {
      setUserDirectly(updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      toast.success('Profile updated');
      resetProfile({
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
      });
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordChangeFormValues) =>
      changePasswordApi({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed. Other devices have been logged out.');
      resetPassword();
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      <div>
        <h1 className="text-[28px] font-[650] font-display text-ink leading-tight mb-1">
          Settings
        </h1>
        <p className="text-[14px] text-muted">
          Manage your account profile, security, and preferences.
        </p>
      </div>

      {/* 1. Profile Section */}
      <Card className="p-6 bg-surface border-border flex flex-col gap-5">
        <h2 className="font-display font-semibold text-[18px] text-ink border-b border-border pb-3">
          Profile
        </h2>

        <form
          onSubmit={handleProfileSubmit((data) => profileMutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <Field
            label="Full name"
            error={profileErrors.fullName?.message}
          >
            <Input
              type="text"
              autoComplete="name"
              hasError={Boolean(profileErrors.fullName)}
              {...registerProfile('fullName')}
            />
          </Field>

          <Field
            label="Phone number"
            error={profileErrors.phone?.message}
          >
            <Input
              type="tel"
              autoComplete="tel"
              hasError={Boolean(profileErrors.phone)}
              {...registerProfile('phone')}
            />
          </Field>

          <Field
            label="Email"
            hint="Email can't be changed"
          >
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-surface-muted text-muted cursor-not-allowed"
            />
          </Field>

          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={!isProfileDirty || isProfileSubmitting}
              loading={profileMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Password Section */}
      <Card className="p-6 bg-surface border-border flex flex-col gap-5">
        <h2 className="font-display font-semibold text-[18px] text-ink border-b border-border pb-3">
          Password
        </h2>

        <form
          onSubmit={handlePasswordSubmit((data) => passwordMutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <Field
            label="Current password"
            error={passwordErrors.currentPassword?.message}
          >
            <Input
              type="password"
              autoComplete="current-password"
              hasError={Boolean(passwordErrors.currentPassword)}
              {...registerPassword('currentPassword')}
            />
          </Field>

          <Field
            label="New password"
            hint="At least 8 characters, with a letter and a number"
            error={passwordErrors.newPassword?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              hasError={Boolean(passwordErrors.newPassword)}
              {...registerPassword('newPassword')}
            />
          </Field>

          <Field
            label="Confirm new password"
            error={passwordErrors.confirmPassword?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              hasError={Boolean(passwordErrors.confirmPassword)}
              {...registerPassword('confirmPassword')}
            />
          </Field>

          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              loading={passwordMutation.isPending}
            >
              Change password
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Appearance Section */}
      <Card className="p-6 bg-surface border-border flex flex-col gap-4">
        <h2 className="font-display font-semibold text-[18px] text-ink border-b border-border pb-3">
          Appearance
        </h2>

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">
            Theme
          </span>
          <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-muted border border-border max-w-sm">
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => applyTheme(mode)}
                className={`flex items-center justify-center h-9 rounded-[10px] text-[13px] font-semibold capitalize transition ${
                  theme === mode
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. Sessions Section */}
      <Card className="p-6 bg-surface border-border flex flex-col gap-4">
        <h2 className="font-display font-semibold text-[18px] text-ink border-b border-border pb-3">
          Sessions
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => logout()}
          >
            Log out
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            onClick={() => setLogoutAllOpen(true)}
          >
            Log out of all devices
          </Button>
        </div>
      </Card>

      {/* Confirm Dialog for Logout All */}
      <ConfirmDialog
        open={logoutAllOpen}
        onOpenChange={setLogoutAllOpen}
        title="Log out of all devices"
        description="Are you sure you want to end all active sessions across all devices? You will need to log back in."
        confirmLabel="Log out all"
        confirmVariant="danger"
        onConfirm={() => logoutAll()}
      />
    </div>
  );
}
