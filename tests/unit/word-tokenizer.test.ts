import { describe, it, expect } from 'vitest';
import { isJapanese } from '@/content/word-tokenizer';

describe('isJapanese', () => {
  it('should return true for Hiragana', () => {
    expect(isJapanese('こんにちは')).toBe(true);
  });

  it('should return true for Katakana', () => {
    expect(isJapanese('テレビ')).toBe(true);
  });

  it('should return true for Kanji', () => {
    expect(isJapanese('日本語')).toBe(true);
  });

  it('should return true for sentences containing mixed Japanese and English', () => {
    expect(isJapanese('This is 日本語.')).toBe(true);
  });

  it('should return false for purely English text', () => {
    expect(isJapanese('Hello World')).toBe(false);
  });

  it('should return false for Spanish text', () => {
    expect(isJapanese('Hola Mundo')).toBe(false);
  });

  it('should return false for numbers and punctuation only', () => {
    expect(isJapanese('12345!?...')).toBe(false);
  });
});
