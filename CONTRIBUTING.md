# Contributing

This is a GitHub Action (Node 20, CommonJS) that recursively discovers
`coverage-summary.json` files in a monorepo, optionally compares against a
base branch, and posts or updates a markdown coverage report as a PR comment.

**Module map:**

| File | Role |
|---|---|
| `src/index.js` | Entry point: reads action inputs, computes weighted totals, sets outputs, drives the comment upsert |
| `src/coverage-parser.js` | Globs for `coverage-summary.json` files, validates structure, returns per-project and aggregate data |
| `src/report-generator.js` | Renders the markdown report (summary line, comparison tables, per-project breakdown) |
| `src/comment-handler.js` | Octokit wrapper: finds an existing bot comment by hidden marker and updates it, or creates a new one |
| `src/__tests__/` | Jest test suite (coverage-parser, comment-handler, report-generator, index) |

---

## Prerequisites

- Node 20 (repo ships a `.nvmrc`; run `nvm use` if you use nvm)
- npm (comes with Node)

```bash
npm ci
```

---

## Development commands

| Command | What it does |
|---|---|
| `npm test` | Run all Jest tests |
| `npx jest src/__tests__/<file>` | Run a single test file |
| `npx jest -t "<name>"` | Run tests matching a name pattern |
| `npm run lint` | Biome lint over `src/` |
| `npm run lint:fix` | Biome lint with auto-fix |
| `npm run format` | Biome format-write over `src/` |
| `npm run format:check` | Biome format check (no writes; used in CI) |
| `npm run build` | ncc bundle `src/index.js` into `dist/` |
| `scripts/build.sh` | Full sequence: ci, test, lint, build with sanity checks |

---

## The dist/ rule

> **Every change to `src/` must include an updated `dist/index.js` in the same
> commit.** `dist/` is the ncc bundle that GitHub Actions actually executes.
> CI runs a freshness gate that fails the build if `dist/` is out of sync with
> `src/`.

After editing any source file, run:

```bash
npm run build
git add dist/
```

and include the `dist/` diff in your commit alongside the source change.

---

## Testing

The test suite uses Jest. When submitting a change:

- Add or update a test for every bug fix or new behavior.
- For changes to `coverage-parser.js`: prefer fixture-based tests that create
  real temporary directories (see existing parser tests for the pattern).
- For changes to `comment-handler.js`: inject a fake octokit at the
  constructor/call seam rather than mocking the module globally.
- Keep tests falsifiable: assert real output values, not just that a mock was
  called with the arguments you passed it.

---

## Code style

Biome enforces both lint and formatting in CI (`format:check` + `lint` both
run on every push). Before opening a PR, run:

```bash
npm run format
npm run lint:fix
```

A few conventions to follow:

- CommonJS modules (`require` / `module.exports`), no ESM.
- No new runtime dependencies without prior discussion in an issue. Runtime
  deps grow the shipped ncc bundle and affect action cold-start time.

---

## CHANGELOG

This project follows [Keep a Changelog](https://keepachangelog.com/). For any
user-visible change (new input, changed output, behavior fix, new report
field), add an entry under the appropriate subsection of the upcoming version
at the top of `CHANGELOG.md` before the PR is merged.

---

## Pull request process

Note: `develop` is the active working branch (PRs target it); `main` is the production branch.

1. Fork the repo and create a branch from `develop`.
2. Verify locally: `npm run format:check && npm run lint && npm test && npm run build`.
3. Commit the `dist/` update in the same commit as your source changes (see "The dist/ rule" above).
4. Fill in the pull request template and open the PR.
5. CI must be green. Fork PRs intentionally skip the comment smoke-test job (token permissions); the format, lint, test, and dist-gate jobs still run and must pass.

---

## Release process (maintainers)

Note: releases are cut from `main` (the production branch) after merging `develop` into it.

1. Update `CHANGELOG.md`: move the unreleased entries under a new version
   heading with today's date.
2. Update the `version` field in `package.json`.
3. Run `npm run build` and commit both files plus `dist/` together.
4. Push the commit, then push a `vX.Y` tag.
5. The release workflow (`release.yml`) re-runs tests, verifies dist freshness
   for the tag, force-updates the floating major tag (e.g. `v1`), and creates
   the GitHub Release automatically.
