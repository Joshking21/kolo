export type FormatKoboOptions = {
  signDisplay?: 'auto' | 'always' | 'never';
};

/**
 * Formats integer kobo into a Nigerian Naira currency string.
 * Whole naira displays no decimals (₦12,500); anything else displays exactly 2 (₦12,500.50).
 */
export function formatKobo(
  kobo: number,
  opts: FormatKoboOptions = {}
): string {
  const isWhole = kobo % 100 === 0;
  const naira = kobo / 100;

  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    signDisplay: opts.signDisplay ?? 'auto',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });

  return formatter.format(naira);
}

/**
 * Parses a user input string in Naira into integer kobo without floating point arithmetic.
 * Accepts "12500", "12,500", " 12,500.5 ", "₦12,500.50", "0.01".
 * Rejects empty strings, negatives, letters, multiple dots, misplaced commas ("1,2,3"),
 * more than 2 decimal places, and values above Number.MAX_SAFE_INTEGER.
 */
export function parseNairaToKobo(input: string): number | null {
  if (!input || typeof input !== 'string') return null;

  let str = input.trim();
  if (!str) return null;

  if (str.startsWith('₦')) {
    str = str.slice(1).trim();
  }
  if (!str) return null;

  if (!/^[0-9,.]+$/.test(str)) return null;

  const parts = str.split('.');
  if (parts.length > 2) return null;

  const intPart = parts[0] ?? '';
  const fracPart = parts[1];

  if (!intPart && fracPart === undefined) return null;

  const intNormalized = intPart || '0';
  if (intNormalized.includes(',')) {
    if (!/^\d{1,3}(,\d{3})+$/.test(intNormalized)) return null;
  } else {
    if (!/^\d+$/.test(intNormalized)) return null;
  }

  const cleanInt = intNormalized.replace(/,/g, '');

  let cleanFrac = '00';
  if (fracPart !== undefined) {
    if (fracPart.length > 2) return null;
    if (fracPart.length > 0 && !/^\d+$/.test(fracPart)) return null;
    cleanFrac = fracPart.padEnd(2, '0');
  }

  const cleanIntNoLeadingZeros = cleanInt.replace(/^0+(?=\d)/, '');
  const combined =
    cleanIntNoLeadingZeros === '0'
      ? cleanFrac.replace(/^0+/, '') || '0'
      : cleanIntNoLeadingZeros + cleanFrac;

  const num = Number(combined);
  if (!Number.isSafeInteger(num) || num < 0) return null;

  return num;
}

/**
 * Converts integer kobo to a string suitable for filling an input field when editing.
 * 1250000 -> "12,500", 1250050 -> "12,500.50".
 */
export function koboToNairaInput(kobo: number): string {
  const isWhole = kobo % 100 === 0;
  const naira = kobo / 100;

  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(naira);
}
