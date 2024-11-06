![Code Context LLM](assets/hero.png)

# Code Context LLM

[![npm version](https://img.shields.io/npm/v/code-context-llm.svg)](https://www.npmjs.com/package/code-context-llm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dt/code-context-llm.svg)](https://www.npmjs.com/package/code-context-llm)
![Cross-Platform](https://img.shields.io/badge/platform-win%20|%20macos%20|%20linux-informational)

Generate a **Markdown** representation of your project's file structure to provide valuable **context for Large Language Models (LLMs)** like ChatGPT, Claude, and Gemini, enhancing code analysis, prompt engineering, and AI-driven development.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
  - [Using npx](#using-npx)
  - [Global Installation](#global-installation)
- [Usage](#usage)
  - [Interactive Mode](#interactive-mode)
  - [Non-Interactive Mode](#non-interactive-mode)
  - [Command-Line Options](#command-line-options)
- [Examples](#examples)
- [Sample Output](#sample-output)
- [Use Cases](#use-cases)
- [Security](#security)
- [Advanced Features](#advanced-features)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Introduction

**Code Context LLM** bridges the gap between your codebase and **Large Language Models (LLMs)**. Without proper context, LLMs might **hallucinate** file structures or offer irrelevant suggestions, impacting **developer productivity** and **code quality**.

By generating a comprehensive **Markdown** outline of your project's directory tree, this tool empowers developers to enhance **prompt engineering**, improve **AI-assisted code navigation**, and facilitate **code understanding for AI** models. Ensure AI interactions are accurate, relevant, and aligned with your project's architecture.

## Features

- 🔒 **Secure Content Redaction**: Automatically redacts sensitive information like API keys and credentials, allowing safe sharing of project structures.
- 🧠 **LLM Context Generation**: Generates accurate project structure context for improved LLM prompts, enhancing AI responses.
- 📂 **Respects `.gitignore`**: Excludes files and directories specified in your `.gitignore`, keeping your context clean.
- ⚙️ **Interactive & Non-Interactive Modes**: Choose between user-friendly prompts or command-line options for flexibility.
- 🎯 **Customizable Exclusions**: Specify additional files or directories to skip, tailoring the output to your needs.
- 📝 **Markdown Output**: Produces a readable and structured Markdown file for easy sharing and documentation.
- 🚀 **Optimized for AI and Machine Learning**: Ideal for developers in AI, machine learning, and **prompt engineering**.
- 🌐 **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux environments.

## Installation

### Using npx

Run the tool instantly without installing it globally:

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

Simply run:

```bash
code-context-llm
```

You'll be guided through prompts to:

- Provide the project directory path.
- Specify additional directories or files to skip.
- Set the output Markdown file name.

### Non-Interactive Mode

Use command-line options for automation:

```bash
code-context-llm --project-path ./my-project --output-file MyProjectStructure.md --skip-dirs dist,build --skip-files .env
```

### Command-Line Options

- `-p, --project-path <path>`: Path to the project directory (default: `.`).
- `-o, --output-file <filename>`: Name of the output Markdown file (default: `ProjectStructure.md`).
- `--skip-dirs <dirs>`: Comma-separated list of directories to skip.
- `--skip-files <files>`: Comma-separated list of files to skip.
- `-h, --help`: Display help information.
- `-V, --version`: Display the version number.

## Examples

Generate a Markdown structure of the current directory:

```bash
code-context-llm
```

Generate a Markdown structure of a specific project, skipping `node_modules` and `dist` directories:

```bash
code-context-llm --project-path ./my-project --skip-dirs node_modules,dist
```

Generate a structure and save it to `MyStructure.md`:

```bash
code-context-llm --output-file MyStructure.md
```

## Sample Output

Here's a snippet of what the generated Markdown might look like:

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

## Use Cases

- **LLM Prompt Engineering**: Generate accurate code summaries with proper context for specific files or modules. Refactor code with AI assistance by providing the file structure and the code you want to refactor.

- **Codebase Documentation**: Reduce documentation time by up to **75%** by automatically generating a Markdown outline of your project's architecture. Keep documentation up-to-date effortlessly after code changes.

- **AI-Assisted Development**: Improve the accuracy of AI-powered code suggestions and bug detection by providing context about file relationships, leading to more relevant code completion.

- **Team Collaboration**: Share project structures with team members to improve onboarding and collaboration. Facilitate code reviews with a clear overview of the project's architecture.

- **Codebase Summarization**: Create summaries of large codebases for reviews or audits. Quickly understand unfamiliar projects or legacy code, enhancing productivity and reducing onboarding time.

## Security

Your project's security is our priority. **Code Context LLM** automatically redacts sensitive information such as API keys, credentials, and other secrets from code previews. However, we strongly recommend that you **review the generated Markdown file yourself** to ensure that no sensitive information is included before sharing it. This extra step helps maintain the security and integrity of your codebase.

## Advanced Features

- **Efficient Large Project Handling**: Optimized to handle large codebases smoothly, even with thousands of files.
- **Extensible Ignoring Patterns**: Beyond `.gitignore`, specify custom ignore patterns to exclude specific files or directories.
- **Customizable Output**: Adjust the depth of directory traversal and detail level in code previews to suit your needs.
- **Integration Ready**: Easily integrate with other tools and workflows for enhanced automation and productivity.

## Frequently Asked Questions

### How does this tool compare to similar tools?

**Code Context LLM** uniquely focuses on providing context for LLMs with secure content redaction and customizable output, enhancing AI-assisted development more effectively than general-purpose documentation generators.

### Can I customize the output format?

Yes, you can adjust the depth of directory traversal and the level of detail in code previews using command-line options or prompts.

### How does this help with prompt engineering?

By providing an accurate project structure, you give LLMs the necessary context to generate more relevant and accurate responses, improving the effectiveness of your prompts.

### How does it handle very large projects?

The tool is optimized for performance and can efficiently process large codebases with thousands of files. Advanced options allow you to limit the depth or exclude certain directories to manage output size.

### Is there detailed documentation available?

For more detailed information, visit our [GitHub Wiki](https://github.com/nt9142/code-context-llm/wiki) for comprehensive guides and tutorials.

## Contributing

Contributions are welcome! If you have suggestions or find issues, please open an [issue](https://github.com/nt9142/code-context-llm/issues) or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

---

**Keywords**: LLM context, Code Understanding for AI, Prompt Engineering Tools, Codebase Documentation for LLMs, AI-Assisted Code Navigation, Improve LLM Prompts, Code Context, Markdown, Project Structure, Codebase Summarization, AI, Machine Learning, Code Analysis, Documentation Generator, CLI Tool, Developer Tools.

---

## Support

If you find this project helpful, please give it a ⭐ on [GitHub](https://github.com/nt9142/code-context-llm)!

- **Try `code-context-llm` now with npx!**

  ```bash
  npx code-context-llm
  ```

- **Contribute to the project on [GitHub](https://github.com/nt9142/code-context-llm)!**

- **Share your feedback and experiences!**
