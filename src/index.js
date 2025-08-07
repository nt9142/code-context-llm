#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import React from 'react';
import { render } from 'ink';
import { program } from 'commander';
import App from './ink/App.js';
import { DEFAULT_SKIP_DIRECTORIES, DEFAULT_SKIP_FILES } from './constants.js';

program
  .argument('[root]', 'Root directory to process', '.')
  .option(
    '-p, --project-path <path>',
    'Path to the project directory (deprecated, use positional argument)'
  )
  .option(
    '-o, --output-file <filename>',
    'Name of the output Markdown file',
    'ProjectStructure.md'
  )
  .parse(process.argv);

const options = program.opts();
const rootArg = program.args[0] || options.projectPath || '.';

const resolvedPath = path.resolve(rootArg);
if (!fs.existsSync(resolvedPath)) {
  console.error('The provided path does not exist.');
  process.exit(1);
}

// Initialize ignore with .gitignore and defaults
const ig = ignore();
const gitignorePath = path.join(resolvedPath, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  ig.add(gitignoreContent);
}
ig.add(DEFAULT_SKIP_DIRECTORIES.map((dir) => `/${dir}/`));
ig.add(DEFAULT_SKIP_FILES.map((file) => `/${file}`));
// Ignore dot-prefixed files and directories by default; users can override in review
ig.add(['.*', '**/.*']);

// Clear the console for a clean UI before rendering (avoid console.* for lint compliance)
if (process.stdout && process.stdout.isTTY) {
  // Clear screen, scrollback, and move cursor to top-left
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

render(
  React.createElement(App, {
    rootPath: resolvedPath,
    outputFileName: options.outputFile,
    ig,
  })
);
