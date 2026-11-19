const INVITE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

/**
 * Cleans an invite code input:
 * Removes spaces, hyphens, and validates it against the 8-character Crockford Base32 alphabet.
 * Returns uppercase 8-char string or null if invalid.
 */
export function cleanInviteCode(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '').trim();
  if (!INVITE_CODE_REGEX.test(cleaned)) return null;
  return cleaned;
}

/**
 * Formats an invite code into hyphenated representation:
 * "K7QM2XPA" -> "K7QM-2XPA"
 */
export function formatInviteCode(code: string): string {
  if (!code) return '';
  const cleaned = code.toUpperCase().replace(/[\s-]/g, '').trim();
  if (cleaned.length <= 4) {
    return cleaned;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}
