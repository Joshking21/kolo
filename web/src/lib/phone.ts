const PHONE_REGEX = /^(?:\+234|0)[789][01]\d{8}$/;

/**
 * Normalizes a Nigerian phone number to +234XXXXXXXXXX format.
 * Returns null if the number does not match valid Nigerian telecom patterns.
 */
export function normalizePhone(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.replace(/[\s-]/g, '').trim();
  if (!PHONE_REGEX.test(clean)) return null;

  if (clean.startsWith('0')) {
    return `+234${clean.slice(1)}`;
  }
  return clean;
}

/**
 * Formats a +234XXXXXXXXXX phone number into local Nigerian display format:
 * "0803 123 4567"
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;

  const localDigits = `0${normalized.slice(4)}`; // e.g. 08031234567
  if (localDigits.length === 11) {
    return `${localDigits.slice(0, 4)} ${localDigits.slice(4, 7)} ${localDigits.slice(7)}`;
  }
  return phone;
}
