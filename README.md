# Nx Code Coverage Action

A comprehensive coverage reporter for Nx monorepos. This GitHub Action processes coverage data from nested directories, supports both LCOV and JSON summary formats, provides base coverage comparison, and generates comprehensive coverage reports with diff visualization.

## Features

- 🏗️ **Nx Monorepo Support**: Automatically discovers and processes coverage from nested directories (apps/, libs/, etc.)
- 📊 **Multiple Formats**: Supports both LCOV (.info) and JSON summary files
- 🔄 **Coverage Comparison**: Compare current coverage with base branch coverage to show diffs
- 💬 **Smart Comments**: Creates or updates PR comments with coverage reports
- 📈 **Diff Visualization**: Shows coverage changes with emojis and clear indicators
- ⚙️ **Configurable**: Extensive configuration options for customization
- 🎯 **Minimum Coverage**: Fail builds if coverage falls below threshold
- 🧹 **Clean Reports**: Hide unchanged files and detailed reports when needed

## Quick Start

```yaml
- name: Coverage Report
  uses: your-username/nx-code-coverage@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
    minimum-coverage: 80
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for posting comments | Yes | `${{ github.token }}` |
| `coverage-folder` | Path to coverage folder with nested directories | Yes | `'./coverage'` |
| `coverage-base-folder` | Path to base coverage folder for comparison | No | `''` |
| `no-coverage-ran` | Set to true if no coverage was generated | No | `'false'` |
| `hide-coverage-reports` | Hide detailed coverage reports in comments | No | `'false'` |
| `hide-unchanged` | Hide unchanged files in coverage diff | No | `'false'` |
| `minimum-coverage` | Minimum coverage percentage required | No | `'0'` |
| `comment-title` | Title for the coverage comment | No | `'Coverage Report'` |
| `update-comment` | Update existing comment instead of creating new | No | `'true'` |
| `include-summary` | Include coverage summary in comment | No | `'true'` |
| `working-directory` | Working directory for the action | No | `'./'` |

## Outputs

| Output | Description |
|--------|-------------|
| `total-coverage` | Total coverage percentage |
| `coverage-changed` | Whether coverage changed compared to base |
| `coverage-diff` | Coverage difference from base (+ or - percentage) |

## Usage Examples

### Basic Usage

```yaml
- name: Generate coverage report
  uses: your-username/nx-code-coverage@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
```

### Complete Workflow Example

```yaml
name: Coverage Report

on:
  workflow_call:

jobs:
  coverage:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Download coverage artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./coverage-artifacts

      - name: Consolidate coverage data
        run: |
          # Your coverage consolidation logic here
          mkdir -p ./coverage/apps/frontend
          mkdir -p ./coverage/apps/backend
          mkdir -p ./coverage/libs/shared
          
          # Copy coverage files to expected structure
          cp -r ./coverage-artifacts/frontend-coverage/* ./coverage/apps/frontend/
          cp -r ./coverage-artifacts/backend-coverage/* ./coverage/apps/backend/
          cp -r ./coverage-artifacts/libs-coverage/* ./coverage/libs/shared/

      - name: Download base coverage (optional)
        uses: dawidd6/action-download-artifact@v6
        continue-on-error: true
        with:
          workflow: ci.yml
          branch: ${{ github.event.pull_request.base.ref || 'main' }}
          name: coverage-base
          path: ./coverage-base

      - name: Generate Coverage Report
        uses: your-username/nx-code-coverage@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          coverage-folder: './coverage'
          coverage-base-folder: './coverage-base'
          minimum-coverage: 80
          hide-unchanged: true
          comment-title: 'Code Coverage Report'
```

### Advanced Configuration

```yaml
- name: Advanced Coverage Report
  uses: your-username/nx-code-coverage@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
    minimum-coverage: 85
    hide-coverage-reports: false
    hide-unchanged: true
    comment-title: '📊 Test Coverage Analysis'
    update-comment: true
    include-summary: true
    working-directory: './'
```

### Handle No Coverage Scenario

```yaml
- name: Check if coverage exists
  id: check-coverage
  run: |
    if find ./coverage -name "*.json" -o -name "lcov.info" | grep -q .; then
      echo "has-coverage=true" >> $GITHUB_OUTPUT
    else
      echo "has-coverage=false" >> $GITHUB_OUTPUT
    fi

- name: Generate Coverage Report
  uses: your-username/nx-code-coverage@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    no-coverage-ran: ${{ steps.check-coverage.outputs.has-coverage == 'false' }}
```

## Expected Directory Structure

The action expects coverage files to be organized in a nested directory structure, typical of Nx monorepos:

```
coverage/
├── apps/
│   ├── frontend/
│   │   ├── lcov.info
│   │   └── coverage-summary.json
│   └── backend/
│       ├── lcov.info
│       └── coverage-summary.json
├── libs/
│   ├── shared/
│   │   ├── lcov.info
│   │   └── coverage-summary.json
│   └── utils/
│       ├── lcov.info
│       └── coverage-summary.json
└── libraries-coverage/
    ├── lcov.info
    └── coverage-summary.json
```

## Supported Coverage Formats

### LCOV Format (`lcov.info`)
Standard LCOV format generated by tools like Jest, Karma, etc.

### JSON Summary Format (`coverage-summary.json`)
JSON format with the following structure:

```json
{
  "total": {
    "lines": { "total": 100, "covered": 85, "pct": 85 },
    "functions": { "total": 20, "covered": 18, "pct": 90 },
    "statements": { "total": 100, "covered": 85, "pct": 85 },
    "branches": { "total": 50, "covered": 40, "pct": 80 }
  }
}
```

## Coverage Report Features

### Summary Section
- Overall coverage percentage
- Coverage change from base (if available)
- Visual indicators (📈 increase, 📉 decrease, ➡️ no change)

### Detailed Comparison
- Project-by-project coverage breakdown
- Line, function, and branch coverage
- Diff indicators for changes
- Status indicators (🆕 Added, 🗑️ Removed, 📊 Changed)

### Example Report

```markdown
## Coverage Report

### Overall Coverage: 87.45%

**Coverage Change:** 📈 +2.15% (from 85.30%)

### Coverage Changes by Project

| Project | Lines | Functions | Branches | Status |
|---------|-------|-----------|----------|--------|
| apps/frontend | 89.50% (+1.20%) 📈 | 92.00% (+0.50%) 📈 | 85.30% (+2.10%) 📈 | 📊 Changed |
| apps/backend | 85.20% (-0.30%) 📉 | 88.00% | 82.50% (+1.00%) 📈 | 📊 Changed |
| libs/shared | 91.00% ✨ | 95.00% ✨ | 88.00% ✨ | 🆕 Added |
```

## Troubleshooting

### No Coverage Files Found
Ensure your coverage files are in the expected locations and formats. Check the console output for specific error messages about file parsing.

### Permission Denied
Make sure your workflow has the necessary permissions:

```yaml
permissions:
  pull-requests: write
  contents: read
```

### Coverage Parsing Errors
Verify that your LCOV and JSON files are properly formatted. The action will log warnings for files it cannot parse.

## Getting Started

This action provides comprehensive coverage reporting for Nx monorepos. All common input parameters are supported, with many additional features available for enhanced coverage analysis.

## Development

### Building the Action

```bash
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/nx-code-coverage/issues) on GitHub.
