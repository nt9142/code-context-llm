#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import ignore from 'ignore';
import { program } from 'commander';
import {
  countFilesAndDirectories,
  getDirectoryStructure,
} from './utils/index.js';
import { DEFAULT_SKIP_DIRECTORIES, DEFAULT_SKIP_FILES } from './constants.js';

const prompt = inquirer.createPromptModule();

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
  .option(
    '--include-pattern <pattern>',
    'Glob pattern to include files or directories'
  )
  .option(
    '--exclude-pattern <pattern>',
    'Glob pattern to exclude files or directories'
  )
  .parse(process.argv);

// Extract options
const options = program.opts();

// Main execution
(async () => {
  console.log('📝 Welcome to Code Context LLM\n');

  let projectPath = options.projectPath;
  let outputFileName = options.outputFile;
  const additionalSkipDirs = options.skipDirs
    ? options.skipDirs
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    : [];
  const additionalSkipFiles = options.skipFiles
    ? options.skipFiles
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : [];
  let includePattern = options.includePattern || '';
  let excludePattern = options.excludePattern || '';

  // If options are not provided, prompt the user interactively
  if (!process.argv.slice(2).length) {
    // Interactive prompts
    const initialQuestions = [
      {
        type: 'input',
        name: 'projectPath',
        message: 'Please provide the path to the project directory:',
        default: process.cwd(),
        validate: (input) => {
          const resolved = path.resolve(input);
          return fs.existsSync(resolved) || 'The provided path does not exist.';
        },
      },
      {
        type: 'input',
        name: 'includePattern',
        message:
          'Enter a glob pattern to include files/directories (leave blank to include all):',
      },
      {
        type: 'input',
        name: 'excludePattern',
        message:
          'Enter a glob pattern to exclude files/directories (leave blank to exclude none):',
      },
      {
        type: 'input',
        name: 'outputFileName',
        message:
          'Enter the name of the output Markdown file (e.g., ProjectStructure.md):',
        default: 'ProjectStructure.md',
      },
    ];

    const responses = await prompt(initialQuestions);
    projectPath = responses.projectPath;
    includePattern = responses.includePattern || '';
    excludePattern = responses.excludePattern || '';
    outputFileName = responses.outputFileName;
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

  // Add additional skips from command-line options
  ig.add(additionalSkipDirs.map((dir) => `/${dir}/`));
  ig.add(additionalSkipFiles.map((file) => `/${file}`));

  console.log(
    `\nDefault directories to skip: ${DEFAULT_SKIP_DIRECTORIES.join(', ')}`
  );
  console.log(`Default files to skip: ${DEFAULT_SKIP_FILES.join(', ')}\n`);

  console.log('\nAnalyzing project size...');

  // Count files and directories
  const { directories, files } = countFilesAndDirectories(
    resolvedPath,
    ig,
    includePattern,
    excludePattern
  );
  console.log(
    `Found ${directories} directories and ${files} files to process.\n`
  );

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
    getDirectoryStructure(
      resolvedPath,
      ig,
      writeStream,
      0,
      resolvedPath,
      includePattern,
      excludePattern
    );
    writeStream.end();
  } catch (error) {
    console.error(`Failed to process directory: ${error.message}`);
    writeStream.end();
  }

  writeStream.on('finish', () => {
    console.log(`\n✅ Project structure has been saved to ${outputFilePath}`);
    console.log(
      '\n⚠️ WARNING: Please ALWAYS REVIEW generated files for SENSITIVE INFORMATION before sharing it.'
    );
  });
})();
