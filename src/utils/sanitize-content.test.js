import { describe, it, expect } from 'vitest';
import { sanitizeContent } from './sanitize-content.js';

describe('sanitizeContent', () => {
  // Test handling of empty and null inputs
  it('should handle empty and null inputs gracefully', () => {
    expect(sanitizeContent('')).toBe('');
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
  });

  // Test that it doesn't modify strings without sensitive content
  it('should not modify strings without sensitive content', () => {
    const safeInputs = [
      'Hello world',
      'Just some regular text',
      'No sensitive data here',
      '123456789',
      'test@example.com',
    ];

    safeInputs.forEach((input) => {
      expect(sanitizeContent(input)).toBe(input);
    });
  });

  // Test that it replaces matched content with [REDACTED]
  it('should replace matched content with [REDACTED]', () => {
    const input = `
  var access_token= "some_secret_value";
  "myToken" : "secret_value",
  token: 'another_secret',
  something_else = "not_a_token"
`;
    const expectedOutput = `
  var access_token= "[REDACTED]";
  "myToken" : "[REDACTED]",
  token: '[REDACTED]',
  something_else = "not_a_token"
`;

    const result = sanitizeContent(input);
    expect(result).toBe(expectedOutput);
  });

  // Test that the replacement is consistent
  it('should be consistent in its replacements', () => {
    const input = 'test string with something to redact';
    const firstRun = sanitizeContent(input);
    const secondRun = sanitizeContent(input);
    expect(firstRun).toBe(secondRun);
  });
});
