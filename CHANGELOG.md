# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]



## [0.1.1] - 2026-02-22

### Changed

- configure pnpm setup and caching in GitHub Actions workflow

### Removed

- eliminate sponsored ads section from README

## [0.1.0] - 2026-02-22

### Added

- add keys method for pattern-based key retrieval in memory cache
- implement atomic increment operations (#15)
- add layer-specific filtering to healthCheck and getMetrics methods (#12)
- initial setup
- initial commit

### Changed

- refine type definitions for configuration and constructor
- refactor batch operations and enhance key retrieval logic
- implement default logger and enhance logging in schema setup
- refactor storage access methods and add getEngine
- refactor pg.Pool mock and type usage in tests
- improve the actions and update to latest version
- update action versions to full semver tags
- add package and release build flow workflows
- refactor to modular 3-layer storage with LRU, health checks, and L3-first writes (#6)
- migrate package manager from Yarn 4.2.2 to PNPM 9.15.4 (#7)
- update packages
- add snyk rules instructions
- add SECURITY.md with unified security policy (#3)
- update documentation and interfaces
- integrate eslint-plugin-security for enhanced security linting
- add license

### Removed

- eliminate version number from type definitions documentation
- eliminate version number from Redis storage layer documentation
- eliminate version number and unused database connection interface
- delete unused global dependency from package.json and pnpm-lock.yaml

