import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { registerFormSchema, RegisterFormValues } from '../lib/validation';
import { useAuth } from '../lib/auth/AuthProvider';
import { isApiError, messageFor } from '../lib/api/errors';

export function Register() {
  const { register: registerAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerAuth(data);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          err.details.forEach((detail) => {
            const field = detail.path as keyof RegisterFormValues;
            setError(field, { message: detail.message });
          });
        }
        if (err.code === 'EMAIL_TAKEN') {
          setError('email', { message: messageFor(err) });
        }
        if (err.code === 'PHONE_TAKEN') {
          setError('phone', { message: messageFor(err) });
        }
        setServerError(messageFor(err));
      } else {
        setServerError('Something went wrong on our side. Please try again.');
      }
    }
  };

  return (
    <PublicLayout formMode>
      <div className="flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <h1 className="text-[28px] font-[650] font-display text-ink mb-1">
            Create an account
          </h1>
          <p className="text-[14px] text-muted">
            Start saving together with trusted friends and colleagues.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3.5 text-[13px] text-danger font-medium leading-relaxed"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            id="fullName"
            label="Full name"
            error={errors.fullName?.message}
          >
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="e.g. Chiamaka Okafor"
              hasError={Boolean(errors.fullName)}
              {...register('fullName')}
            />
          </Field>

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
            id="phone"
            label="Phone number"
            hint="We'll format it for you"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0803 123 4567"
              hasError={Boolean(errors.phone)}
              {...register('phone')}
            />
          </Field>

          <Field
            id="password"
            label="Password"
            hint="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            className="w-full mt-2"
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-[14px] text-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
