#!/usr/bin/env node

/**
 * codeContextLLM.js
 *
 * This script generates a Markdown representation of a project's file structure.
 * It uses Commander.js for command-line options and Inquirer.js for interactive prompts.
 *
 * Usage:
 *   $ generate-md-structure [options]
 *
 * Options:
 *   -p, --project-path <path>     Path to the project directory (default: '.')
 *   -o, --output-file <filename>  Name of the output Markdown file (default: 'ProjectStructure.md')
 *   --skip-dirs <dirs>            Comma-separated directories to skip
 *   --skip-files <files>          Comma-separated files to skip
 *   -h, --help                    Display help information
 *   -V, --version                 Display the version number
 *
 */
const { isBinaryFileSync } = require('isbinaryfile');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const ignore = require('ignore');
const { program } = require('commander');

const prompt = inquirer.createPromptModule();

// Default directories and files to skip
const DEFAULT_SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  '.idea',
  '.next',
  '.cache',
  '__pycache__',
  '.venv',
];
const DEFAULT_SKIP_FILES = [
  'package-lock.json',
  '.env',
  '.gitignore',
  '.DS_Store',
  '__pycache__',
];

// Token pattern (simplistic placeholder regex) used to redact sensitive info
const TOKEN_PATTERN = /([A-Za-z0-9_-]*token[A-Za-z0-9_-]*|"[^"]*"?token"[^"]*")/gi;
const CODE_BLOCK_DELIMITER = '```';

// Utility: Recursively gather file structure
function getDirectoryStructure(dirPath, ig, writeStream, indentLevel = 0) {
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
function tryReadFileContent(filePath) {
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
    const sanitizedContent = content.replace(TOKEN_PATTERN, '[REDACTED]');
    return sanitizedContent;
  } catch (error) {
    // Possibly a binary file or an error reading it
    return '';
  }
}

// Utility: Sanitize code block delimiters in content to avoid breaking Markdown format
function sanitizeCodeBlockDelimiters(content) {
  return content.replace(new RegExp(CODE_BLOCK_DELIMITER, 'g'), '` ` `');
}

// Utility: Recursively count files and directories for size confirmation
function countFilesAndDirectories(dirPath, ig) {
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

// Define command-line options using Commander
program
  .version('1.0.0')
  .option('-p, --project-path <path>', 'Path to the project directory', '.')
  .option(
    '-o, --output-file <filename>',
    'Name of the output Markdown file',
    'ProjectStructure.md'
  )
  .option('--skip-dirs <dirs>', 'Comma-separated directories to skip', '')
  .option('--skip-files <files>', 'Comma-separated files to skip', '')
  .parse(process.argv);

// Extract options
const options = program.opts();

// Main execution
(async () => {
  console.log('📝 Welcome to the Project Structure Generator CLI!\n');

  let projectPath = options.projectPath;
  let outputFileName = options.outputFile;
  let additionalSkipDirs = options.skipDirs
    ? options.skipDirs.split(',').map((d) => d.trim()).filter(Boolean)
    : [];
  let additionalSkipFiles = options.skipFiles
    ? options.skipFiles.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  // If options are not provided, prompt the user interactively
  if (!process.argv.slice(2).length) {
    // Interactive prompts
    const initialQuestions = [
      {
        type: 'input',
        name: 'projectPath',
        message: 'Please provide the path to the project directory:',
        default: '.',
        validate: (input) => {
          const resolved = path.resolve(input);
          return fs.existsSync(resolved) || 'The provided path does not exist.';
        },
      },
    ];

    const { projectPath: interactiveProjectPath } = await prompt(initialQuestions);
    projectPath = interactiveProjectPath;

    console.log(
      `\nDefault directories to skip: ${DEFAULT_SKIP_DIRECTORIES.join(', ')}`
    );
    console.log(`Default files to skip: ${DEFAULT_SKIP_FILES.join(', ')}\n`);

    const skipQuestions = [
      {
        type: 'input',
        name: 'additionalSkipDirs',
        message:
          'Enter any additional directories to skip (comma-separated, leave blank to skip):',
        filter: (val) => val.split(',').map((d) => d.trim()).filter(Boolean),
      },
      {
        type: 'input',
        name: 'additionalSkipFiles',
        message:
          'Enter any additional files to skip (comma-separated, leave blank to skip):',
        filter: (val) => val.split(',').map((f) => f.trim()).filter(Boolean),
      },
    ];

    const { additionalSkipDirs: interactiveSkipDirs, additionalSkipFiles: interactiveSkipFiles } =
      await prompt(skipQuestions);

    additionalSkipDirs = interactiveSkipDirs;
    additionalSkipFiles = interactiveSkipFiles;

    // Prompt for output file name
    const outputQuestion = [
      {
        type: 'input',
        name: 'outputFileName',
        message:
          'Enter the name of the output Markdown file (e.g., ProjectStructure.md):',
        default: 'ProjectStructure.md',
      },
    ];

    const { outputFileName: interactiveOutputFileName } = await prompt(outputQuestion);
    outputFileName = interactiveOutputFileName;
  }

  // Validate project path
  const resolvedPath = path.resolve(projectPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error('The provided path does not exist.');
    process.exit(1);
  }

  // Initialize the ignore instance
  const ig = ignore();

  // Read .gitignore file if it exists
  const gitignorePath = path.join(resolvedPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  }

  // Add default skip patterns
  ig.add(DEFAULT_SKIP_DIRECTORIES.map((dir) => `/${dir}/`));
  ig.add(DEFAULT_SKIP_FILES.map((file) => `/${file}`));

  // Add additional skips from user input or command-line options
  ig.add(additionalSkipDirs.map((dir) => `/${dir}/`));
  ig.add(additionalSkipFiles.map((file) => `/${file}`));

  console.log(
    `\nDefault directories to skip: ${DEFAULT_SKIP_DIRECTORIES.join(', ')}`
  );
  console.log(`Default files to skip: ${DEFAULT_SKIP_FILES.join(', ')}\n`);

  console.log('\nAnalyzing project size...');

  // Count files and directories
  const { directories, files } = countFilesAndDirectories(resolvedPath, ig);
  console.log(`Found ${directories} directories and ${files} files to process.\n`);

  if (directories + files === 0) {
    console.log(
      'There are no files or directories to process after applying the skip filters.'
    );
    process.exit(0);
  }

  // If the project is large, ask for confirmation
  if (directories + files > 1000) {
    let confirmProceed = options.yes || false;

    if (!confirmProceed) {
      const { confirmProceed: userConfirm } = await prompt([
        {
          type: 'confirm',
          name: 'confirmProceed',
          message: 'The project is quite large. Do you want to proceed?',
          default: false,
        },
      ]);

      confirmProceed = userConfirm;
    }

    if (!confirmProceed) {
      console.log('Aborting operation...');
      process.exit(0);
    }
  }

  // Generate the project structure
  const outputFilePath = path.join(resolvedPath, outputFileName);

  // Check if the output file already exists
  if (fs.existsSync(outputFilePath)) {
    let overwrite = options.force || false;

    if (!overwrite) {
      const { overwrite: userOverwrite } = await prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `The file ${outputFileName} already exists in ${resolvedPath}. Do you want to overwrite it?`,
          default: false,
        },
      ]);

      overwrite = userOverwrite;
    }

    if (!overwrite) {
      console.log('Operation cancelled by the user.');
      process.exit(0);
    }
  }

  // Open write stream
  const writeStream = fs.createWriteStream(outputFilePath, {
    flags: 'w',
    encoding: 'utf8',
  });

  writeStream.on('error', (error) => {
    console.error(`Failed to write to file: ${error.message}`);
  });

  writeStream.write(`# Project Structure for ${resolvedPath}\n\n`);

  // Start generating structure
  try {
    getDirectoryStructure(resolvedPath, ig, writeStream);
    writeStream.end();
  } catch (error) {
    console.error(`Failed to process directory: ${error.message}`);
    writeStream.end();
  }

  writeStream.on('finish', () => {
    console.log(`\n✅ Project structure has been saved to ${outputFilePath}`);
    console.log('\n⚠️ WARNING: Please ALWAYS REVIEW generated files for SENSITIVE INFORMATION before sharing it.');
  });
})();
