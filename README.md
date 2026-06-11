# Monorepo Code Coverage Reporter

[![Test Action](https://github.com/MatloobAltaf/monorepo-code-coverage-reporter/actions/workflows/test.yml/badge.svg)](https://github.com/MatloobAltaf/monorepo-code-coverage-reporter/actions/workflows/test.yml)

A coverage reporter for monorepos. This GitHub Action processes coverage data from nested directories, supports the standard `coverage-summary.json` format, provides base coverage comparison, and generates coverage reports as PR comments with diff visualization.

## Features

- Monorepo support: automatically discovers and processes `coverage-summary.json` files from nested directories (apps/, libs/, etc.)
- Individual app/lib coverage: detailed breakdown for each application and library with diff tracking
- Enhanced metrics: shows lines, functions, branches, and statements coverage with actual counts
- Coverage comparison: compare current coverage with base branch coverage to show diffs
- Smart comments: creates or updates PR comments with coverage reports; later runs update the same comment via a hidden HTML marker
- Configurable: hide unchanged projects, disable detailed breakdown, customize the comment title

## Prerequisites

This action requires `coverage-summary.json` files generated from your test suite. Most JavaScript/TypeScript projects can produce this using Jest or `nyc` (Istanbul).

### Jest Setup

Add or update your `jest.config.js` to include:

```js
module.exports = {
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text']
};
```

### NYC (Istanbul) Setup

Ensure your configuration generates JSON summary reports:

```js
// .nycrc or package.json
{
  "reporter": ["text", "json-summary"],
  "report-dir": "./coverage"
}
```

### Coverage Directory Structure

Coverage files must be in a nested directory structure, one `coverage-summary.json` per project:

```
coverage/
├── apps/
│   ├── frontend/
│   │   └── coverage-summary.json
│   └── backend/
│       └── coverage-summary.json
└── libs/
    └── shared/
        └── coverage-summary.json
```

### Coverage File Format

Each `coverage-summary.json` file must contain a `total` field with aggregated coverage data:

```json
{
  "total": {
    "lines": { "total": 100, "covered": 85, "skipped": 0, "pct": 85 },
    "statements": { "total": 120, "covered": 102, "skipped": 0, "pct": 85 },
    "functions": { "total": 30, "covered": 24, "skipped": 0, "pct": 80 },
    "branches": { "total": 50, "covered": 35, "skipped": 0, "pct": 70 }
  }
}
```

Files that do not contain valid numeric `total.lines` data are skipped with a warning in the action log.

## Quick Start

```yaml
- name: Coverage Report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
```

## Required Permissions

Comments are only posted on `pull_request` events. The job must have write access to pull requests:

```yaml
jobs:
  coverage:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
```

## Inputs

| Input                   | Description                                                      | Required | Default            |
| ----------------------- | ---------------------------------------------------------------- | -------- | ------------------ |
| `github-token`          | GitHub token for posting comments                                | Yes      | `${{ github.token }}` |
| `coverage-folder`       | Path to coverage folder with nested directories                  | Yes      | `'./coverage'`     |
| `coverage-base-folder`  | Path to base coverage folder for comparison                      | No       | `''`               |
| `no-coverage-ran`       | Set to `'true'` if no coverage was generated                     | No       | `'false'`          |
| `hide-coverage-reports` | Hide the detailed coverage table in comments                     | No       | `'false'`          |
| `hide-unchanged`        | Hide projects with no significant coverage change                | No       | `'false'`          |
| `comment-title`         | Title for the coverage comment                                   | No       | `'Coverage Report'` |
| `update-comment`        | Update the existing comment instead of creating a new one        | No       | `'true'`           |
| `include-summary`       | Include the overall coverage summary line in the comment         | No       | `'true'`           |
| `detailed-coverage`     | Show detailed coverage breakdown with individual app/lib metrics; `'false'` also switches the comparison table to a compact layout without the Statements column | No       | `'true'`           |

## Outputs

| Output             | Description                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| `total-coverage`   | Total coverage percentage (weighted average over raw line counts across all projects) |
| `coverage-changed` | Whether coverage changed compared to base (only set when a valid base folder was provided; comparison is over projects present in both runs) |
| `coverage-diff`    | Coverage difference from base as a signed percentage string, e.g. `+1.23` or `-0.50` (only set when a valid base folder was provided) |

## Usage Examples

### Basic Usage

```yaml
- name: Generate coverage report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
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
          mkdir -p ./coverage/apps/frontend
          mkdir -p ./coverage/apps/backend
          cp -r ./coverage-artifacts/frontend-coverage/* ./coverage/apps/frontend/
          cp -r ./coverage-artifacts/backend-coverage/* ./coverage/apps/backend/

      - name: Download base coverage (optional)
        # Note: this step only finds an artifact that a previous run on the base branch
        # uploaded. Pair it with upload steps that run on pushes to your default branch;
        # see examples/complete-workflow.yml for the matching upload configuration.
        uses: dawidd6/action-download-artifact@v6
        continue-on-error: true
        with:
          workflow: ci.yml
          branch: ${{ github.event.pull_request.base.ref || 'main' }}
          name: coverage-base
          path: ./coverage-base

      - name: Generate Coverage Report
        uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          coverage-folder: './coverage'
          coverage-base-folder: './coverage-base'
          hide-unchanged: 'true'
          comment-title: 'Code Coverage Report'
```

### Advanced Configuration

```yaml
- name: Advanced Coverage Report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
    hide-coverage-reports: 'false'
    hide-unchanged: 'true'
    comment-title: 'Test Coverage Analysis'
    update-comment: 'true'
    include-summary: 'true'
    detailed-coverage: 'true'
```

### Handle No Coverage Scenario

When `no-coverage-ran` is set to `'true'`, the action posts (or updates) a warning comment on the PR instead of a coverage table:

> No coverage data was generated for this build.

```yaml
- name: Check if coverage exists
  id: check-coverage
  run: |
    if find ./coverage -name "coverage-summary.json" | grep -q .; then
      echo "has-coverage=true" >> $GITHUB_OUTPUT
    else
      echo "has-coverage=false" >> $GITHUB_OUTPUT
    fi

- name: Generate Coverage Report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    no-coverage-ran: ${{ steps.check-coverage.outputs.has-coverage == 'false' }}
```

## Example Report

Below is a representative example of the comment posted to a PR when base coverage comparison is enabled.

```markdown
## Coverage Report

### Overall Coverage: 87.45%

**Coverage Change:** ⬆️ +1.20% (from 86.25%)

### 🔄 Individual App/Library Coverage Changes

| Project | Lines Coverage | Functions Coverage | Branches Coverage | Statements | Status |
|---------|----------------|-------------------|-------------------|------------|--------|
| apps/frontend | 89.50% (+1.20%) ⬆️<br>*179/200* | 92.00% (+0.50%) ⬆️<br>*46/50* | 85.30%<br>*171/200* | 89.50%<br>*179/200* | ⬆️ Increased |
| apps/backend  | 85.20%<br>*341/400*             | 88.00%<br>*44/50*              | 82.50%<br>*165/200* | 85.20%<br>*341/400* | ➖ Unchanged  |

### 📑 Detailed Coverage Breakdown

#### apps/frontend

🔄 **Coverage changes detected**
- **Lines:** 89.50% (+1.20%) ⬆️
  - Current: 179/200
  - Previous: 177/200

#### apps/backend

➖ **No significant changes**
- **Lines:** 85.20% (341/400)
- **Functions:** 88.00% (44/50)
- **Branches:** 82.50% (165/200)
```

**Status values:** `⬆️ Increased`, `⬇️ Decreased`, `➖ Unchanged`, `➕ Added`. Projects present in the base but removed from the current run are intentionally not shown.

## Troubleshooting

### No Coverage Files Found

Ensure your coverage files are named `coverage-summary.json` and located in subdirectories of the configured `coverage-folder`. The action only discovers `coverage-summary.json` files (no LCOV or XML). Check the action log for file discovery messages.

If the coverage folder contains no parseable `coverage-summary.json` files, the action fails with the error `No coverage data found in <folder>`. For builds that legitimately produce no coverage (e.g. a docs-only PR), set `no-coverage-ran: 'true'` to make the action post or update a warning comment instead of failing (see [Handle No Coverage Scenario](#handle-no-coverage-scenario)).

### Malformed Summary Files

If a `coverage-summary.json` file is present but does not contain valid numeric `total.lines` data, the action skips that file and logs a warning. Other projects are still processed.

### Permission Denied

Make sure your workflow job has the `pull-requests: write` permission (see [Required Permissions](#required-permissions) above). Comments are only posted on `pull_request` events.

### coverage-changed / coverage-diff Not Set

These outputs are only set when a valid `coverage-base-folder` containing at least one parseable `coverage-summary.json` was provided, and at least one project appears in both the current and base runs.

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

### Linting and Formatting

```bash
npm run lint        # Biome lint
npm run lint:fix    # Biome lint with auto-fix
npm run format      # Biome format write
npm run format:check  # Biome format check
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on reporting issues, proposing changes, and the pull request process.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/MatloobAltaf/monorepo-code-coverage-reporter/issues) on GitHub.
