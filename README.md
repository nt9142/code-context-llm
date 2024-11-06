![Code Context LLM visualization](assets/hero.png)

# Code Context LLM

[![npm version](https://img.shields.io/npm/v/code-context-llm.svg)](https://www.npmjs.com/package/code-context-llm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Downloads](https://img.shields.io/npm/dt/code-context-llm.svg)](https://www.npmjs.com/package/code-context-llm)
![Cross-Platform](https://img.shields.io/badge/platform-win%20|%20macos%20|%20linux-informational)

Generate a **Markdown** representation of your project's file structure to provide valuable context for **Large Language Models (LLMs)** like ChatGPT, enhancing code analysis, prompt engineering, and AI-driven development.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
  - [Quick Start with npx](#quick-start-with-npx)
  - [Global Installation](#global-installation)
- [Usage](#usage)
  - [Interactive Mode](#interactive-mode)
  - [Non-Interactive Mode](#non-interactive-mode)
  - [Command-Line Options](#command-line-options)
- [Use Cases](#use-cases)
- [Example Output](#example-output)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Introduction

**Code Context LLM** bridges the gap between your codebase and **Large Language Models (LLMs)**. Without proper context, LLMs might **hallucinate** file structures or offer irrelevant suggestions, impacting developer productivity and code quality.

By generating a comprehensive **Markdown** outline of your project's directory tree, this tool empowers developers to enhance **prompt engineering**, improve **AI-assisted code navigation**, and facilitate **code understanding for AI** models. Ensure AI interactions are accurate, relevant, and aligned with your project's architecture.

## Features

- 🔒 **Secure Content Redaction**: Automatically redacts sensitive information like API keys, passwords, and credentials, allowing safe sharing of project structures. [Learn more about our security measures](#security).
- 🧠 **LLM Context Generation**: Provides accurate project context for improved LLM prompts, enhancing AI responses.
- 📂 **Respects `.gitignore`**: Excludes files and directories specified in your `.gitignore`, keeping your context clean.
- ⚙️ **Interactive & Non-Interactive Modes**: Choose between user-friendly prompts or command-line options for flexibility.
- 🎯 **Customizable Exclusions**: Specify additional files or directories to skip, tailoring the output to your needs.
- 📝 **Markdown Output**: Produces a readable and structured Markdown file for easy sharing and documentation.

## Installation

### Quick Start with npx

Get started instantly without installing:

```bash
npx code-context-llm
```

### Global Installation

Install the package globally to use it anytime:

```bash
npm install -g code-context-llm
```

## Usage

### Interactive Mode

Run:

```bash
npx code-context-llm
```

You'll be guided through prompts to:

- Provide the project directory path.
- Specify additional directories or files to skip.
- Set the output Markdown file name.

### Non-Interactive Mode

Use command-line options for automation:

```bash
npx code-context-llm --project-path ./my-project --output-file MyProjectStructure.md --skip-dirs dist,build --skip-files .env
```

### Command-Line Options

- `-p, --project-path <path>`: Path to the project directory (default: `.`).
- `-o, --output-file <filename>`: Name of the output Markdown file (default: `ProjectStructure.md`).
- `--skip-dirs <dirs>`: Comma-separated list of directories to skip.
- `--skip-files <files>`: Comma-separated list of files to skip.
- `-h, --help`: Display help information.
- `-V, --version`: Display the version number.

## Use Cases

- **LLM Prompt Engineering**: Enhance code summaries and refactoring tasks by providing LLMs with accurate project context, potentially saving up to **50%** of development time.
- **Codebase Documentation**: Automatically generate a Markdown outline of your project's architecture, reducing documentation effort by **up to 70%**.
- **AI-Assisted Development**: Improve the accuracy of AI-powered code suggestions and bug detection by offering context about file relationships.
- **Team Collaboration**: Share project structures with team members to improve onboarding and facilitate code reviews.
- **Codebase Summarization**: Create summaries of large codebases for reviews or audits, helping you quickly understand unfamiliar projects.

## Example Output

Here's a snippet of the generated Markdown:

````markdown
# Project Structure for /path/to/your/project

- **src/**
  - **components/**
    - Header.js (1.2 KB)
      - Content preview:
        ```javascript
        import React from "react";
        // Header component
        const Header = () => {
          return <header>Welcome to My Project</header>;
        };
        export default Header;
        ```
    - Footer.js (800 bytes)
  - **utils/**
    - helpers.js (2.5 KB)
- **package.json** (1.1 KB)
  - Content preview:
    ```json
    {
      "name": "my-project",
      "version": "1.0.0",
      "dependencies": {
        "react": "^17.0.2"
      }
    }
    ```
````

This structured overview helps LLMs understand your project's architecture, improving code analysis and AI interactions.

## Security

Your project's security is our priority. **Code Context LLM** automatically redacts sensitive information such as API keys, passwords, credentials, and other secrets from code previews. We use pattern matching to identify and replace sensitive data with `[REDACTED]`. However, we strongly recommend that you **review the generated Markdown file yourself** to ensure that no sensitive information is included before sharing it.

## Contributing

Contributions are welcome! If you have suggestions or find issues, please:

- Open an [issue](https://github.com/nt9142/code-context-llm/issues).
- Submit a pull request.
- Share your ideas in the [discussions](https://github.com/nt9142/code-context-llm/discussions) section.

Please see our [contribution guidelines](CONTRIBUTING.md) for more details.

## License

This project is licensed under the [MIT License](LICENSE).

## Support

If you find this project helpful:

- ⭐ **Star this repository** on [GitHub](https://github.com/nt9142/code-context-llm)!
- 🗣 **Spread the word** by sharing with your colleagues and friends.
- 💬 **Share your feedback** and experiences.

---

**Keywords**: LLM context, Code Understanding for AI, Prompt Engineering Tools, Codebase Documentation for LLMs, AI-Assisted Code Navigation, Improve LLM Prompts, Code Context, Markdown, Project Structure, Codebase Summarization, AI, Machine Learning, Code Analysis, Documentation Generator, CLI Tool, Developer Tools.
