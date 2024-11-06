import fs from 'fs';
import path from 'path';
import { isBinaryFileSync } from 'isbinaryfile';
import { CODE_BLOCK_DELIMITER } from '../constants.js';
import { sanitizeContent } from './sanitize-content.js';

// Utility: Recursively gather file structure
export function getDirectoryStructure(
  dirPath,
  ig,
  writeStream,
  indentLevel = 0
) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Sort entries so directories come before files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    const relativeEntryPath = path.relative(process.cwd(), entryPath);

    // Skip if the entry matches .gitignore patterns
    if (ig.ignores(relativeEntryPath)) {
      continue;
    }

    const indent = '  '.repeat(indentLevel);

    if (entry.isDirectory()) {
      writeStream.write(`${indent}- **${entry.name}/**\n`);
      getDirectoryStructure(entryPath, ig, writeStream, indentLevel + 1);
    } else if (entry.isFile()) {
      const fileSize = fs.statSync(entryPath).size;
      const fileContent = tryReadFileContent(entryPath);
      writeStream.write(
        `${indent}- ${entry.name} ${fileSize > 0 ? `(${fileSize} bytes)` : ''}\n`
      );
      if (fileContent && fileContent.length > 0) {
        const sanitizedContent = sanitizeCodeBlockDelimiters(fileContent);
        writeStream.write(
          `${indent}  - Content preview:\n\`\`\`\n${sanitizedContent}\n\`\`\`\n`
        );
      }
    }
  }
}

// Utility: Read file content safely and mask tokens if found
export function tryReadFileContent(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
    if (stats.size > MAX_FILE_SIZE) {
      return ''; // Skip large files
    }
    if (isBinaryFileSync(filePath)) {
      return ''; // Skip binary files
    }
    const content = fs.readFileSync(filePath, 'utf8');
    // If tokens found, replace them
    const sanitizedContent = sanitizeContent(content);
    return sanitizedContent;
  } catch (error) {
    // Possibly a binary file or an error reading it
    return '';
  }
}

// Utility: Sanitize code block delimiters in content to avoid breaking Markdown format
export function sanitizeCodeBlockDelimiters(content) {
  return content.replace(new RegExp(CODE_BLOCK_DELIMITER, 'g'), '` ` `');
}

// Utility: Recursively count files and directories for size confirmation
export function countFilesAndDirectories(dirPath, ig) {
  let directoriesCount = 0;
  let filesCount = 0;

  function count(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const relativeEntryPath = path.relative(process.cwd(), entryPath);

      // Skip if the entry matches .gitignore patterns
      if (ig.ignores(relativeEntryPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        directoriesCount += 1;
        count(entryPath);
      } else if (entry.isFile()) {
        filesCount += 1;
      }
    }
  }
  count(dirPath);

  return { directories: directoriesCount, files: filesCount };
}
