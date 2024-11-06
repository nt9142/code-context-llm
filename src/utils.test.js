import { describe, it, expect } from 'vitest';
import { sanitizeCodeBlockDelimiters } from './utils/index.js';

describe('utils', () => {
  describe('sanitizeCodeBlockDelimiters', () => {
    it('should replace code block delimiters with spaces between backticks', () => {
      const input = '```some code```';
      const expected = '` ` `some code` ` `';
      expect(sanitizeCodeBlockDelimiters(input)).toBe(expected);
    });

    it('should handle multiple code blocks', () => {
      const input = '```block1``` some text ```block2```';
      const expected = '` ` `block1` ` ` some text ` ` `block2` ` `';
      expect(sanitizeCodeBlockDelimiters(input)).toBe(expected);
    });
  });
});
