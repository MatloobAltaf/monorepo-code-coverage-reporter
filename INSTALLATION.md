# Installation Guide

This guide will help you set up and use the Monorepo Code Coverage Reporter in your repository.

## Quick Setup

### 1. Basic Setup

Add the action to your workflow:

```yaml
- name: Generate coverage report
  uses: your-username/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'
```

### 2. Set Required Permissions

Ensure your workflow has the necessary permissions:

```yaml
jobs:
  coverage:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write # Required for commenting on PRs
      contents: read # Required for reading repository content
```

### 3. Prepare Coverage Data

Organize your coverage files in a nested directory structure:

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
  uses: dawidd6/action-download-artifact@v6
  continue-on-error: true
  with:
    workflow: ci.yml
    branch: ${{ github.event.pull_request.base.ref || 'main' }}
    name: coverage-base
    path: ./coverage-base

- name: Generate coverage report
  uses: your-username/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'

    hide-unchanged: true
```

### With Custom Configuration

```yaml
- name: Generate coverage report
  uses: your-username/monorepo-code-coverage-reporter@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    coverage-folder: './coverage'
    coverage-base-folder: './coverage-base'

    comment-title: '📊 Test Coverage Report'
    hide-coverage-reports: false
    hide-unchanged: true
    update-comment: true
    include-summary: true
```

## Troubleshooting

### Common Issues

1. **No coverage files found**
   - Verify your coverage files are in the expected locations
   - Check that files are named correctly (`coverage-summary.json`)

2. **Permission denied errors**
   - Ensure your workflow has `pull-requests: write` permission
   - Check that the GitHub token has sufficient permissions

3. **Coverage parsing errors**
   - Verify JSON files are properly formatted
   - Check the action logs for specific parsing errors

### Getting Help

If you encounter issues:

1. Check the [troubleshooting section](README.md#troubleshooting) in the README
2. Review the [examples](examples/) directory
3. Open an issue on GitHub with:
   - Your workflow configuration
   - Error logs
   - Sample coverage files (if possible)

## Setup Checklist

- [ ] Add the action to your workflow
- [ ] Add required permissions to your job
- [ ] Verify coverage file structure
- [ ] Test the action on a pull request
- [ ] Configure base coverage comparison (optional)

- [ ] Customize report appearance (optional)
