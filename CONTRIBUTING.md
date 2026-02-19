# Contributing to Nuvex

Thank you for your interest in contributing to Nuvex! This guide covers everything you need to know to contribute effectively.

## Prerequisites

- **Node.js** `>=20.0.0`
- **pnpm** `>=9.0.0`
- **Redis** and **PostgreSQL** for integration testing

## Development Setup

```bash
# Clone the repository
git clone https://github.com/wgtechlabs/nuvex.git
cd nuvex

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run linter
pnpm lint
```

## Commit Convention

This project enforces the **[Clean Commit](https://github.com/wgtechlabs/clean-commit)** convention for all commit messages. Non-conforming commits will not be accepted.

### Format

```text
<emoji> <type>: <description>
<emoji> <type>(<scope>): <description>
```

### The 9 Types

| Emoji | Type | What it covers |
|:-----:|------|----------------|
| 📦 | `new` | Adding new features, files, or capabilities |
| 🔧 | `update` | Changing existing code, refactoring, improvements |
| 🗑️ | `remove` | Removing code, files, features, or dependencies |
| 🔒 | `security` | Security fixes, patches, vulnerability resolutions |
| ⚙️ | `setup` | Project configs, CI/CD, tooling, build systems |
| ☕ | `chore` | Maintenance tasks, dependency updates, housekeeping |
| 🧪 | `test` | Adding, updating, or fixing tests |
| 📖 | `docs` | Documentation changes and updates |
| 🚀 | `release` | Version releases and release preparation |

### Rules

- Use lowercase for type
- Use present tense ("add" not "added")
- No period at the end
- Keep description under 72 characters

### Examples

```text
📦 new: add redis connection pooling
🔧 update(storage): improve LRU eviction logic
🗑️ remove(deps): unused lodash dependency
🔒 security: patch prototype pollution vulnerability
⚙️ setup: add github actions workflow
☕ chore: update pnpm dependencies
🧪 test: add unit tests for healthCheck method
📖 docs: update quick start installation guide
🚀 release: version 1.1.0
```

## Pull Request Process

1. Fork the repository and create a branch from `main`
2. Make your changes following the code standards below
3. Ensure all tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Write or update tests for any new or changed behavior
6. Submit a pull request with a clear description of the changes

## Code Standards

### TypeScript

- All code must be written in TypeScript with strict type checking enabled
- Avoid using `any` — use proper types or generics
- Export types alongside implementations

### Linting

```bash
# Run linter
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Run security linter
pnpm lint:security
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

All new features must include corresponding tests. Bug fixes should include a regression test.

### Validation

Before submitting a PR, run the full validation suite:

```bash
pnpm validate
```

This runs the linter, tests, and build in sequence.

## Reporting Issues

Please use [GitHub Issues](https://github.com/wgtechlabs/nuvex/issues) to report bugs or request features. Include as much detail as possible:

- Node.js and pnpm versions
- Reproduction steps
- Expected vs actual behavior

## Security

For security vulnerabilities, please follow the [Security Policy](SECURITY.md) and **do not** open a public issue.

---

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
