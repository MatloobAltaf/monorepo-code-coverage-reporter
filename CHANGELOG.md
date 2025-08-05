# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3] - 2025-08-06

### Changed

- Simplified the report generation logic for better project naming

## [1.2.0] - 2025-08-06

### Changed

- **BREAKING**: Renamed action from `nx-code-coverage` to `monorepo-code-coverage-reporter`
- **BREAKING**: Simplified to only support `coverage-summary.json` format (removed LCOV and coverage-final.json support)
- Updated package name and description to reflect broader monorepo support
- Updated all documentation and examples to use new action name

### Added

- Comprehensive prerequisites section in README with setup instructions for Jest and NYC
- Detailed coverage file format documentation with examples
- Simplified architecture with reduced dependencies (removed `lcov-parse`)
- Better error handling and logging for coverage parsing

### Improved

- **Performance**: 58% reduction in code complexity (from ~320 to ~135 lines)
- **Reliability**: Single file format reduces parsing errors and edge cases
- **Maintainability**: Cleaner codebase with 95.12% test coverage
- **Documentation**: Complete setup guide with step-by-step instructions
- **User Experience**: Clearer error messages and better troubleshooting

### Fixed

- **Critical**: Missing projects in coverage reports (apps/transect, libraries-coverage now properly detected)
- **Critical**: Incorrect coverage comparison logic between different file formats
- **Critical**: Project name generation inconsistencies
- All linting errors and unused variables

### Removed

- LCOV (.info) file parsing support
- coverage-final.json file parsing support
- `lcov-parse` dependency
- Complex coverage calculation logic

## [1.1.0] - 2025-08-06

### Added

- Enhanced status column showing overall coverage trend (⬆️ Increased/⬇️ Decreased/➖ Unchanged) instead of generic "Changed"
- Professional icon set replacing emoji-heavy approach for better cross-platform compatibility
- More intuitive visual indicators using arrows and symbols

### Improved

- Coverage report accuracy by fixing statement coverage diff calculations
- Report clarity by removing confusing "Project removed" sections for projects without current coverage
- Icon consistency across all report sections using professional symbols:
  - ⬆️/⬇️ for trend indicators (replacing 📈/📉)
  - ➖ for neutral/no change (replacing ➡️)
  - 🔄 for change sections (replacing 📊)
  - ➕ for additions (replacing 🆕)
  - 🔹 for new values (replacing ✨)
  - 📑 for detailed sections (replacing 📋)

### Fixed

- Statement coverage diff now uses proper statements calculation instead of lines diff
- Comparison logic now only processes projects with current coverage data
- Filtering logic properly considers all coverage metrics (lines, functions, branches, statements)
- Linting errors and unused variables cleaned up

### Changed

- Status column now displays meaningful coverage trend information
- Reports focus only on projects with actual coverage changes
- More professional appearance suitable for corporate environments

## [1.0.0] - 2025-08-04

### Added

- Initial release of Monorepo Code Coverage Reporter
- Comprehensive coverage reporter for monorepos
- Support for nested directory structures (monorepos)
- LCOV (.info) and JSON summary file parsing
- Base coverage comparison with diff visualization
- Smart PR comment generation and updating
- Configurable minimum coverage thresholds
- Option to hide unchanged files and detailed reports
- Comprehensive test coverage
- Detailed documentation and examples

### Features

- 🏗️ **Monorepo Support**: Automatically discovers coverage from nested directories
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

## [1.0.4] - 2025-08-05

### Added

- Modified report generation logic to include detailed coverage
- Update message ui

### Tests

- Added tests for the report generator
