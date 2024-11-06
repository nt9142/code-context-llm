// Token pattern (simplistic placeholder regex) used to redact sensitive info
export const TOKEN_PATTERN =
  /([A-Za-z0-9_-]*token[A-Za-z0-9_-]*|"[^"]*"?token"[^"]*")/gi;

export function sanitizeContent(content) {
  return content.replace(TOKEN_PATTERN, '[REDACTED]');
}
