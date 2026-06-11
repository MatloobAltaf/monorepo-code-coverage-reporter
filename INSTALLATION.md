# Installation Guide

This guide will help you set up and use the Monorepo Code Coverage Reporter in your repository.

## Quick Setup

### 1. Basic Setup

Add the action to your workflow:

```yaml
- name: Generate coverage report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
```

### 2. Set Required Permissions

Comments are only posted on `pull_request` events. Ensure your workflow job has write access to pull requests:

```yaml
jobs:
  coverage:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
```

### 3. Prepare Coverage Data

Organize your coverage files in a nested directory structure, one `coverage-summary.json` per project:

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

## Advanced Setup

### With Base Coverage Comparison

```yaml
- name: Download base coverage
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

- name: Generate coverage report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
    hide-unchanged: 'true'
```

### With Custom Configuration

```yaml
- name: Generate coverage report
  uses: MatloobAltaf/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
    comment-title: 'Test Coverage Report'
    hide-coverage-reports: 'false'
    hide-unchanged: 'true'
    update-comment: 'true'
    include-summary: 'true'
```

## Inputs Reference

| Input                   | Description                                                      | Required | Default               |
| ----------------------- | ---------------------------------------------------------------- | -------- | --------------------- |
| `github-token`          | GitHub token for posting comments                                | Yes      | `${{ github.token }}` |
| `coverage-folder`       | Path to coverage folder with nested directories                  | Yes      | `'./coverage'`        |
| `coverage-base-folder`  | Path to base coverage folder for comparison                      | No       | `''`                  |
| `no-coverage-ran`       | Set to `'true'` if no coverage was generated                     | No       | `'false'`             |
| `hide-coverage-reports` | Hide the detailed coverage table in comments                     | No       | `'false'`             |
| `hide-unchanged`        | Hide projects with no significant coverage change                | No       | `'false'`             |
| `comment-title`         | Title for the coverage comment                                   | No       | `'Coverage Report'`   |
| `update-comment`        | Update the existing comment instead of creating a new one        | No       | `'true'`              |
| `include-summary`       | Include the overall coverage summary line in the comment         | No       | `'true'`              |
| `detailed-coverage`     | Show detailed coverage breakdown with individual app/lib metrics | No       | `'true'`              |

## Troubleshooting

### Common Issues

1. **No coverage files found**
   - Verify your coverage files are named `coverage-summary.json` and placed under subdirectories of the configured `coverage-folder`
   - The action only discovers `coverage-summary.json` files
   - If the folder contains no parseable files, the action fails with `No coverage data found in <folder>`. For builds that legitimately produce no coverage, set `no-coverage-ran: 'true'` to post a warning comment instead of failing

2. **Permission denied errors**
   - Ensure your workflow job has `pull-requests: write` permission
   - Check that the GitHub token has sufficient permissions

3. **Coverage parsing errors**
   - Verify JSON files contain a valid `total` field with numeric values
   - Files that cannot be parsed are skipped with a warning in the action log

4. **`coverage-changed` / `coverage-diff` outputs not set**
   - These are only set when a valid `coverage-base-folder` was provided and at least one project appears in both runs

### Getting Help

If you encounter issues:

1. Check the [troubleshooting section](README.md#troubleshooting) in the README
2. Review the [examples](examples/) directory
3. Open an issue on [GitHub](https://github.com/MatloobAltaf/monorepo-code-coverage-reporter/issues) with:
   - Your workflow configuration
   - Error logs
   - Sample coverage files (if possible)

## Setup Checklist

- [ ] Add the action to your workflow
- [ ] Add required permissions to your job
- [ ] Verify coverage file structure (one `coverage-summary.json` per project)
- [ ] Test the action on a pull request
- [ ] Configure base coverage comparison (optional)
- [ ] Customize report appearance (optional)
