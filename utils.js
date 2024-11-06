const fs = require('fs');
const { isBinaryFileSync } = require('isbinaryfile');

// Constants
const CODE_BLOCK_DELIMITER = '```';
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

/**
 * Reads file content safely and applies redaction.
 * @param {string} filePath - The path to the file.
 * @returns {string} - The sanitized file content or an empty string.
 */
function tryReadFileContent(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return ''; // Skip large files
    }
    if (isBinaryFileSync(filePath)) {
      return ''; // Skip binary files
    }
    const content = fs.readFileSync(filePath, 'utf8');
    // Apply redaction
    const sanitizedContent = redactSensitiveInfo(content);
    return sanitizedContent;
  } catch (error) {
    // Possibly a binary file or an error reading it
    return '';
  }
}

/**
 * Redacts sensitive information from the content.
 * @param {string} content - The content to sanitize.
 * @returns {string} - The sanitized content.
 */
function redactSensitiveInfo(content) {
  // Define patterns to redact
  const patterns = [
    // API keys (e.g., 'apiKey: "12345abcde"')
    /apiKey\s*[:=]\s*['"]?[A-Za-z0-9-_]{16,}['"]?/gi,
    // Secret keys (e.g., 'secret: "s3cr3t!"')
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    // Token patterns (e.g., 'token: "abcd1234efgh5678"')
    /token\s*[:=]\s*['"]?[A-Za-z0-9-_]{16,}['"]?/gi,
    // UUIDs
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    // Email addresses
    /[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+/g,
    // IP addresses
    /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
    // Credit card numbers (very basic pattern)
    /\b\d{4}(| |-)\d{4}\1\d{4}\1\d{4}\b/g,
    // AWS Access Key IDs
    /AKIA[0-9A-Z]{16}/g,
    // AWS Secret Access Keys
    /[0-9a-zA-Z/+]{40}/g,
    // Private keys (e.g., RSA)
    /-----BEGIN (?:RSA|DSA|EC|PGP) PRIVATE KEY-----[\s\S]+?-----END (?:RSA|DSA|EC|PGP) PRIVATE KEY-----/g,
  ];

  let sanitizedContent = content;
  patterns.forEach((pattern) => {
    sanitizedContent = sanitizedContent.replace(pattern, '[REDACTED]');
  });

  return sanitizedContent;
}

/**
 * Sanitizes code block delimiters in content to avoid breaking Markdown format.
 * @param {string} content - The content to sanitize.
 * @returns {string} - The sanitized content.
 */
function sanitizeCodeBlockDelimiters(content) {
  return content.replace(new RegExp(CODE_BLOCK_DELIMITER, 'g'), '` ` `');
}

module.exports = {
  tryReadFileContent,
  sanitizeCodeBlockDelimiters,
  redactSensitiveInfo,
};
