import { describe, it, expect } from 'vitest';
import { formatKobo, parseNairaToKobo, koboToNairaInput } from './money';

describe('money', () => {
  describe('formatKobo', () => {
    it('formats whole naira without decimals', () => {
      expect(formatKobo(1250000)).toBe('₦12,500');
      expect(formatKobo(0)).toBe('₦0');
      expect(formatKobo(100)).toBe('₦1');
    });

    it('formats fractional naira with exactly two decimals', () => {
      expect(formatKobo(1250050)).toBe('₦12,500.50');
      expect(formatKobo(1)).toBe('₦0.01');
      expect(formatKobo(1250009)).toBe('₦12,500.09');
    });

    it('formats negative amounts with signDisplay', () => {
      expect(formatKobo(-100000, { signDisplay: 'always' })).toBe('-₦1,000');
    });
  });

  describe('parseNairaToKobo', () => {
    it('accepts valid inputs and parses with string precision', () => {
      expect(parseNairaToKobo('12500')).toBe(1250000);
      expect(parseNairaToKobo('12,500')).toBe(1250000);
      expect(parseNairaToKobo(' 12,500.5 ')).toBe(1250050);
      expect(parseNairaToKobo('₦12,500.50')).toBe(1250050);
      expect(parseNairaToKobo('0.01')).toBe(1);
      expect(parseNairaToKobo('0.29')).toBe(29);
      expect(parseNairaToKobo('1.10')).toBe(110);
      expect(parseNairaToKobo('1,234,567')).toBe(123456700);
    });

    it('rejects invalid inputs', () => {
      expect(parseNairaToKobo('')).toBeNull();
      expect(parseNairaToKobo('   ')).toBeNull();
      expect(parseNairaToKobo('12.345')).toBeNull();
      expect(parseNairaToKobo('-100')).toBeNull();
      expect(parseNairaToKobo('abc')).toBeNull();
      expect(parseNairaToKobo('1.2.3')).toBeNull();
      expect(parseNairaToKobo('1,2,3')).toBeNull();
      expect(parseNairaToKobo('1,23,45')).toBeNull();
    });
  });

  describe('koboToNairaInput', () => {
    it('formats numbers for form inputs correctly', () => {
      expect(koboToNairaInput(1250000)).toBe('12,500');
      expect(koboToNairaInput(1250050)).toBe('12,500.50');
      expect(koboToNairaInput(0)).toBe('0');
    });
  });
});
