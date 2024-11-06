export const TOKEN_PATTERN =
  /(["']?\w*(?:token|key)\w*["']?\s*[:=]\s*)(["'])(?:(?!\2).)*\2/gi;

export function sanitizeContent(content) {
  if (!content) {
    return '';
  }
  return content.replace(TOKEN_PATTERN, '$1$2[REDACTED]$2');
}
