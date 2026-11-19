import { describe, it, expect } from 'vitest';
import { cleanInviteCode, formatInviteCode } from './invite-code';

describe('invite-code', () => {
  describe('cleanInviteCode', () => {
    it('normalizes spaces and hyphens to uppercase 8-char code', () => {
      expect(cleanInviteCode(' k7qm-2xpa ')).toBe('K7QM2XPA');
      expect(cleanInviteCode('K7QM2XPA')).toBe('K7QM2XPA');
      expect(cleanInviteCode('k7qm 2xpa')).toBe('K7QM2XPA');
    });

    it('rejects codes with invalid characters (I, O, 0, 1) or wrong length', () => {
      expect(cleanInviteCode('')).toBeNull();
      expect(cleanInviteCode('k7qm2xp')).toBeNull(); // 7 chars
      expect(cleanInviteCode('k7qm2xpa9')).toBeNull(); // 9 chars
      expect(cleanInviteCode('K7QM2XPO')).toBeNull(); // contains 'O'
      expect(cleanInviteCode('K7QM2XP1')).toBeNull(); // contains '1'
      expect(cleanInviteCode('K7QM2XP0')).toBeNull(); // contains '0'
      expect(cleanInviteCode('K7QM2XPI')).toBeNull(); // contains 'I'
    });
  });

  describe('formatInviteCode', () => {
    it('formats 8-char codes with a hyphen', () => {
      expect(formatInviteCode('K7QM2XPA')).toBe('K7QM-2XPA');
      expect(formatInviteCode('k7qm2xpa')).toBe('K7QM-2XPA');
      expect(formatInviteCode('k7qm-2xpa')).toBe('K7QM-2XPA');
    });

    it('handles short inputs gracefully during typing', () => {
      expect(formatInviteCode('K7Q')).toBe('K7Q');
      expect(formatInviteCode('K7QM')).toBe('K7QM');
      expect(formatInviteCode('K7QM2')).toBe('K7QM-2');
    });
  });
});
