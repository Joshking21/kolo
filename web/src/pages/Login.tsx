import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { loginFormSchema, LoginFormValues } from '../lib/validation';
import { useAuth } from '../lib/auth/AuthProvider';
import { isApiError, messageFor } from '../lib/api/errors';

export function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Countdown timer for RATE_LIMITED
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          setServerError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.code === 'RATE_LIMITED' && err.retryAfterSeconds) {
          setRateLimitCountdown(err.retryAfterSeconds);
        }
        setServerError(messageFor(err));
      } else {
        setServerError('Something went wrong on our side. Please try again.');
      }
    }
  };

  const isMockMode = Boolean(
    import.meta.env.VITE_MOCK_DOMAINS &&
    import.meta.env.VITE_MOCK_DOMAINS.includes('auth')
  );

  const handleFillDemo = () => {
    setValue('email', 'demo@kolo.test', { shouldValidate: true });
    setValue('password', 'kolo2026', { shouldValidate: true });
  };

  return (
    <PublicLayout formMode>
      <div className="flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <h1 className="text-[28px] font-[650] font-display text-ink mb-1">
            Log in to Kolo
          </h1>
          <p className="text-[14px] text-muted">
            Welcome back. Enter your details to continue.
          </p>
        </div>

        {/* Demo Helper Box */}
        {isMockMode && (
          <div className="flex items-center justify-between rounded-xl bg-surface-muted p-3.5 border border-border text-[13px]">
            <div>
              <span className="font-semibold text-ink block">Demo account</span>
              <span className="text-muted font-mono text-[12px]">
                demo@kolo.test / kolo2026
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[12px] font-semibold text-ink hover:bg-surface-muted transition"
            >
              Fill in
            </button>
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3.5 text-[13px] text-danger font-medium leading-relaxed"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              {rateLimitCountdown !== null
                ? `Too many attempts. Try again in ${rateLimitCountdown} seconds.`
                : serverError}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            id="email"
            label="Email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              hasError={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field
            id="password"
            label="Password"
            error={errors.password?.message}
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                hasError={Boolean(errors.password)}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            size="md"
            loading={isSubmitting}
            disabled={rateLimitCountdown !== null && rateLimitCountdown > 0}
            className="w-full mt-2"
          >
            Log in
          </Button>
        </form>

        <p className="text-center text-[14px] text-muted">
          New to Kolo?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
