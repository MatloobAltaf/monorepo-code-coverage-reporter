# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-04

## [1.0.0] - 2025-08-04

### Added

- Initial release of Nx Code Coverage Action
- Comprehensive coverage reporter for Nx monorepos
- Support for nested directory structures (Nx monorepos)
- LCOV (.info) and JSON summary file parsing
- Base coverage comparison with diff visualization
- Smart PR comment generation and updating
- Configurable minimum coverage thresholds
- Option to hide unchanged files and detailed reports
- Comprehensive test coverage
- Detailed documentation and examples

### Features

- 🏗️ **Nx Monorepo Support**: Automatically discovers coverage from nested directories
- 📊 **Multiple Formats**: Supports both LCOV and JSON summary formats
- 🔄 **Coverage Comparison**: Compare with base branch coverage
- 💬 **Smart Comments**: Creates or updates PR comments
- 📈 **Diff Visualization**: Shows coverage changes with emojis
- ⚙️ **Configurable**: Extensive configuration options
- 🎯 **Minimum Coverage**: Fail builds if below threshold
- 🧹 **Clean Reports**: Hide unchanged files when needed

### Technical Details

- Built with Node.js 20
- Uses GitHub Actions toolkit
- Supports glob patterns for file discovery
- Robust error handling and logging
- Comprehensive test suite with Jest
- ESLint and Prettier for code quality

## [1.0.1] - 2025-08-04

### Added

- This is a test release

## [1.0.2] - 2025-08-04

### Fixed

- Fixed a bug where the release action was not working as expected

## [1.0.3] - 2025-08-05

### Fixed

- Added dist folder to the release
