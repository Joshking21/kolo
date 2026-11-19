import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhone } from './phone';

describe('phone', () => {
  describe('normalizePhone', () => {
    it('normalizes local Nigerian numbers with spaces to +234 format', () => {
      expect(normalizePhone('0803 123 4567')).toBe('+2348031234567');
      expect(normalizePhone('07011234567')).toBe('+2347011234567');
      expect(normalizePhone('+234 803 123 4567')).toBe('+2348031234567');
      expect(normalizePhone('+2348031234567')).toBe('+2348031234567');
      expect(normalizePhone('0908-123-4567')).toBe('+2349081234567');
    });

    it('rejects invalid numbers', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone('080')).toBeNull();
      expect(normalizePhone('06031234567')).toBeNull(); // 06 is invalid network
      expect(normalizePhone('+1234567890')).toBeNull();
      expect(normalizePhone('080312345678')).toBeNull(); // too long
    });
  });

  describe('formatPhone', () => {
    it('formats +234 number into local spaced representation', () => {
      expect(formatPhone('+2348031234567')).toBe('0803 123 4567');
      expect(formatPhone('08031234567')).toBe('0803 123 4567');
    });

    it('returns original input if invalid', () => {
      expect(formatPhone('invalid-phone')).toBe('invalid-phone');
      expect(formatPhone('')).toBe('');
    });
  });
});
