// Default directories and files to skip
export const DEFAULT_SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  '.idea',
  '.next',
  '.cache',
  '__pycache__',
  '.venv',
  '.vscode',
  '.husky',
];
export const DEFAULT_SKIP_FILES = [
  'package-lock.json',
  '.env',
  '.gitignore',
  '.DS_Store',
  '__pycache__',
];

// Token pattern (simplistic placeholder regex) used to redact sensitive info
export const TOKEN_PATTERN =
  /([A-Za-z0-9_-]*token[A-Za-z0-9_-]*|"[^"]*"?token"[^"]*")/gi;

export const CODE_BLOCK_DELIMITER = '```';
