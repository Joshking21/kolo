import { z } from 'zod';
import { cleanInviteCode } from './invite-code';
import { normalizePhone } from './phone';

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your full name (at least 2 characters)')
  .max(80, 'Full name cannot exceed 80 characters');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter an email address')
  .max(254, 'Email cannot exceed 254 characters')
  .email('Enter a valid email address');

export const phoneSchema = z
  .string()
  .trim()
  .refine((val) => normalizePhone(val) !== null, {
    message: 'Enter a Nigerian phone number, e.g. 0803 123 4567',
  });

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters, with a letter and a number')
  .max(128, 'Password cannot exceed 128 characters')
  .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
    message: 'Use at least 8 characters, with a letter and a number',
  });

export const groupNameSchema = z
  .string()
  .trim()
  .min(3, 'Group name must be at least 3 characters')
  .max(60, 'Group name cannot exceed 60 characters');

export const groupDescriptionSchema = z
  .string()
  .trim()
  .max(280, 'Description cannot exceed 280 characters')
  .optional()
  .transform((val) => (val && val.length > 0 ? val : null));

export const contributionKoboSchema = z
  .number({ required_error: 'Enter a contribution amount', invalid_type_error: 'Enter a valid amount' })
  .int('Use whole naira (no kobo)')
  .min(100_000, 'Minimum contribution is ₦1,000')
  .max(100_000_000, 'Maximum contribution is ₦1,000,000')
  .refine((val) => val % 100 === 0, {
    message: 'Use whole naira (no kobo)',
  });

export const frequencySchema = z.enum(['weekly', 'monthly'], {
  errorMap: () => ({ message: 'Select weekly or monthly frequency' }),
});

export const maxMembersSchema = z
  .number({ required_error: 'Enter member count', invalid_type_error: 'Enter a valid number' })
  .int()
  .min(2, 'A group needs at least 2 members')
  .max(12, 'Maximum group size is 12 members');

export const payoutOrderSchema = z.enum(['join_order', 'random'], {
  errorMap: () => ({ message: 'Select payout order' }),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .refine((val) => cleanInviteCode(val) !== null, {
    message: 'That invite code doesn’t match any group.',
  });

export const depositAmountKoboSchema = z
  .number({ required_error: 'Enter an amount', invalid_type_error: 'Enter a valid amount' })
  .int('Use whole naira')
  .min(10_000, 'Minimum deposit is ₦100')
  .max(50_000_000, 'Maximum deposit is ₦500,000');

export const withdrawalAmountKoboSchema = z
  .number({ required_error: 'Enter an amount', invalid_type_error: 'Enter a valid amount' })
  .int('Use whole naira')
  .min(10_000, 'Minimum withdrawal is ₦100')
  .max(50_000_000, 'Maximum withdrawal is ₦500,000');

export const bankCodeSchema = z
  .string({ required_error: 'Select a bank' })
  .min(1, 'Select a bank');

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Account number must be 10 digits');

export const accountNameSchema = z
  .string()
  .trim()
  .min(3, 'Account name must be at least 3 characters')
  .max(100, 'Account name cannot exceed 100 characters');

// Complete Form Schemas
export const registerFormSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const createGroupFormSchema = z.object({
  name: groupNameSchema,
  description: groupDescriptionSchema,
  contributionKobo: contributionKoboSchema,
  frequency: frequencySchema,
  maxMembers: maxMembersSchema,
  payoutOrder: payoutOrderSchema,
});
export type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

export const joinGroupFormSchema = z.object({
  inviteCode: inviteCodeSchema,
});
export type JoinGroupFormValues = z.infer<typeof joinGroupFormSchema>;

export const depositFormSchema = z.object({
  amountKobo: depositAmountKoboSchema,
});
export type DepositFormValues = z.infer<typeof depositFormSchema>;

export const withdrawalFormSchema = z.object({
  amountKobo: withdrawalAmountKoboSchema,
  bankCode: bankCodeSchema,
  accountNumber: accountNumberSchema,
  accountName: accountNameSchema,
});
export type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>;

export const profileFormSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const passwordChangeFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });
export type PasswordChangeFormValues = z.infer<typeof passwordChangeFormSchema>;
