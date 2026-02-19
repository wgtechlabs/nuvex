# GitHub Copilot Instructions for Nuvex

## Project Overview

Nuvex is a TypeScript-first 3-layer storage SDK for Node.js that unifies in-memory cache, Redis, and PostgreSQL behind a single API.

- **Language**: TypeScript (strict mode)
- **Package manager**: pnpm
- **Test framework**: Jest with ts-jest
- **Node.js requirement**: `>=20.0.0`

## Commit Convention

All commits **must** follow the **[Clean Commit](https://github.com/wgtechlabs/clean-commit)** convention.

```text
<emoji> <type>: <description>
<emoji> <type>(<scope>): <description>
```

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

Rules: lowercase type, present tense, no trailing period, description under 72 characters.

## Code Conventions

- Use TypeScript with strict type checking — avoid `any`
- Follow existing patterns in `src/` for consistency
- Always run `pnpm lint` and `pnpm test` before suggesting code is complete
- Prefer `pnpm validate` to verify the full build, lint, and test pipeline
- Security linting is enforced via `eslint-plugin-security` — do not suppress security rules
- All public-facing changes should include or update tests
