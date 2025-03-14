# Contributing to Linear CLI

Thank you for your interest in contributing to the Linear CLI project! This document provides guidelines and instructions for contributing to make the process smooth and effective for everyone involved.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git
- A Linear account with an API key for testing

### Environment Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/linear-mcp.git
   cd linear-mcp
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/shebashio/linear-mcp.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a `.env` file with your Linear API key:
   ```
   LINEAR_API_KEY=lin_api_your_key_here
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following our [coding standards](#coding-standards)

3. Test your changes:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. Commit your changes following our [commit guidelines](#commit-guidelines)

5. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a pull request against the `main` branch of the upstream repository

## Pull Request Process

1. **IMPORTANT**: All commits in PRs must be signed with GPG for verification
2. Ensure your PR description clearly describes the problem and solution
3. Include the relevant issue number in your PR description
4. Update documentation as needed
5. Make sure all CI checks pass
6. Get at least one review from a maintainer
7. Once approved, a maintainer will merge your PR

### Signed Commits Requirement

All commits must be signed using GPG. This helps verify that commits are actually from the contributor claiming to have authored them.

To set up signed commits:

1. [Generate a GPG key](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key)
2. [Add your GPG key to your GitHub account](https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-new-gpg-key-to-your-github-account)
3. [Tell Git about your signing key](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key)
4. [Sign commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

To configure Git to sign all commits by default:
```bash
git config --global commit.gpgsign true
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid using `any` type when possible
- Follow the existing code style in the project

### Code Style

- Use 2 spaces for indentation
- Use semicolons at the end of statements
- Use single quotes for strings
- Name variables and functions using camelCase
- Name interfaces and types using PascalCase
- Add proper JSDoc comments for functions and complex logic

### File Organization

- Keep files focused on a single responsibility
- Group related functionality in appropriate directories
- Use index files to simplify imports
- Follow the existing project structure

## Commit Guidelines

We follow a structured commit message format:

```
<type>(<scope>): <short summary>

<body>

<footer>
```

Where:
- **type**: feat, fix, docs, style, refactor, test, chore
- **scope**: optional, can be anything specifying the scope of the commit
- **summary**: brief description of the change
- **body**: detailed explanation of the change (optional)
- **footer**: information about breaking changes, issue references, etc. (optional)

Examples:
```
feat(labels): add automatic ID resolution for label operations

fix(api): correct parameter type in delete mutation
```

### Important
- All commits MUST be signed with GPG signatures
- Use imperative mood in the subject line (e.g., "add" not "added")
- Do not end the subject line with a period
- Keep the subject line under 50 characters
- Wrap the body at 72 characters
- Reference issues and pull requests in the footer

## Testing

- Write tests for all new features and bug fixes
- Ensure all existing tests pass before submitting a PR
- Strive for good test coverage
- Include both unit tests and integration tests where appropriate

## Documentation

- Update documentation when changing functionality
- Document all public APIs and complex functions
- Keep the README.md up to date
- Add examples for new features
- Include comments in code for complex logic

## Issue Reporting

When reporting issues, please use the issue templates provided and include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots or error messages if applicable
6. Environment information (OS, Node version, etc.)

## Feature Requests

Feature requests are welcome! When submitting a feature request:

1. Use a clear and descriptive title
2. Provide a detailed description of the proposed feature
3. Explain the use case and benefits
4. If possible, outline how the feature might be implemented
5. Indicate if you're willing to work on implementing the feature

---

Thank you for contributing to Linear CLI! Your efforts help make this tool better for everyone.