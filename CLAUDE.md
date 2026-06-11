# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Node.js GitHub Action that reports code coverage for monorepos. It recursively discovers `coverage-summary.json` files (typical of Nx workspaces), optionally compares against a base branch, and posts/updates a markdown report as a PR comment. The action runs `dist/index.js` on `node20` (see `action.yml`).

## Commands

```bash
npm test                                      # run all Jest tests
npx jest src/__tests__/coverage-parser.test.js  # run a single test file
npx jest -t "<test name>"                     # run tests matching a name
npm run lint                                  # ESLint over src/**/*.js
npm run format                                # Prettier write over src/**/*.js
npm run build                                 # ncc bundle src/index.js -> dist/
```

`scripts/build.sh` runs the full sequence (ci, test, lint, build) with sanity checks.

## Critical: dist/ is committed

`dist/index.js` is the ncc bundle that GitHub Actions actually executes. CI (`.github/workflows/test.yml`) fails if `dist/` is out of date with `src/`. After any change to `src/`, run `npm run build` and commit the updated `dist/` alongside the source change.

## Architecture

All source lives in `src/`, orchestrated by `src/index.js` (the action entry point):

1. `index.js` reads action inputs via `@actions/core`. If `no-coverage-ran` is true, it posts a warning comment and exits early.
2. `coverage-parser.js` globs for `**/coverage-summary.json` under the coverage folder, extracts each file's `total` key, and keys projects by relative path (e.g., `apps/frontend`). `parseCoverage()` runs again on the base folder when base comparison is enabled. `compareCoverage()` diffs current vs base and intentionally ignores projects that exist only in base (removed projects are not shown).
3. `index.js` computes total coverage as a weighted average over raw line counts across projects (not a mean of percentages), then sets the outputs `total-coverage`, `coverage-changed`, and `coverage-diff`.
4. On `pull_request` events, `report-generator.js` renders the markdown report (summary, comparison tables with trend indicators, per-project breakdown).
5. `comment-handler.js` wraps octokit (`@actions/github`): it finds an existing comment by matching `## <commentTitle>` plus `user.type === 'Bot'` and updates it, otherwise creates a new one. This is what makes the comment stable across pushes to the same PR.

Tests live in `src/__tests__/`.

## Releases and versioning

- CHANGELOG.md follows Keep a Changelog; recent tags use a single-integer minor like `v1.7`. The `version` field in package.json is not kept in sync with tags.
- Releasing: push a `v*` tag. `.github/workflows/release.yml` tests, builds, commits `dist/` to main, and creates a GitHub Release.
- Keep CHANGELOG.md updated when shipping user-visible changes (this is the established convention; see recent commit history).
