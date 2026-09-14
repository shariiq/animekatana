import { describe, it, expect } from 'vitest';
import { slugify, date } from '../../../lib/anilist/client';

describe('AniList Utils', () => {
  describe('slugify', () => {
    it('converts titles to clean slugs', () => {
      expect(slugify('Attack on Titan: The Final Season')).toBe('attack-on-titan-the-final-season');
      expect(slugify('My Hero Academia')).toBe('my-hero-academia');
      expect(slugify('ハイキュー!!')).toBe('ハイキュー'); // Handles native text
    });

    it('removes trailing/leading dashes', () => {
      expect(slugify(' -Title- ')).toBe('title');
    });
  });

  describe('date', () => {
    it('formats date parts correctly', () => {
      expect(date({ year: 2024, month: 1, day: 1 })).toBe('2024-01-01');
      expect(date({ year: 2024, month: null, day: null })).toBe('2024-01-01');
    });

    it('returns null if year is missing', () => {
      expect(date({ year: null, month: 1, day: 1 })).toBeNull();
    });
  });
});
