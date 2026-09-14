# GitHub CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment system for AnimeKatana.

## Overview

AnimeKatana uses **GitHub Actions** for quality gates and **Vercel** for deployment:

- **GitHub Actions**: Runs automated checks on every PR (format, lint, typecheck, tests, build)
- **Vercel Git Integration**: Handles preview deployments (per PR) and production deployment (on main merge)

This separation ensures deterministic CI checks while leveraging Vercel's optimized Astro deployment.

## Workflows

### Primary CI (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`.

**Jobs** (each installs from the lockfile on its isolated runner):

1. **Checks** - Verifies formatting and runs Biome lint rules
2. **Type Check** - Runs Astro/TypeScript type checking
3. **Test** - Runs Vitest suite (excluding live external API tests)
4. **Build** - Runs the production build and uploads `dist/` for inspection

**Concurrency**: Automatically cancels obsolete runs when new commits are pushed to the same branch.

**Caching**: npm's download cache is reused based on `package-lock.json`; every job still reconstructs dependencies with `npm ci`.

### Live Tests (`.github/workflows/live-tests.yml`)

Runs tests that call external APIs (AniList, AniSource).

**Triggers**:
- Manual dispatch (on-demand)
- Weekly schedule (Sundays at 2:17 AM UTC)
- Optional: After main merge (commented out by default)

**Why separate?**: External API tests are non-deterministic and can fail due to upstream availability. They provide valuable integration coverage but should not block PRs.

**Status**: Failures are informational only and do not block deployment.

### Dependency Review (`.github/workflows/dependency-review.yml`)

Runs on pull requests only.

**Purpose**: Scans dependency changes for known vulnerabilities.

**Action**: Fails the PR if critical or high-severity vulnerabilities are detected.

## Running Tests Locally

### Standard Test Suite

```bash
npm test
```

Runs all unit and integration tests. External API tests are skipped by default.

### With Live Tests

```bash
RUN_LIVE_TESTS=true npm test
```

Includes tests that call AniList (always runs) and AniSource (conditional). Use this to verify external integrations before pushing.

### Individual Test Files

```bash
npm test src/tests/lib/playback/player.test.ts
```

Run a specific test file for focused debugging.

## Package Scripts

- `npm run format` - Auto-format all files with Biome
- `npm run format:check` - Check formatting without modifying files (used in CI)
- `npm run lint` - Run Biome lint checks
- `npm run check` - Run Astro type checking
- `npm test` - Run complete Vitest suite
- `npm run build` - Type-check and build for production

## Branch Protection

**Recommended settings for `main` branch**:

- Require pull request before merging
- Require status checks to pass before merging:
  - `Checks`
  - `Type Check`
  - `Test`
  - `Build`
  - `Dependency Review`
  - Vercel deployment check
- Require branches be up to date before merge
- Do not allow force pushes
- Do not allow deletions

Configure via: Repository Settings → Branches → Branch protection rules

## Vercel Deployment

### Current Setup

Vercel's Git integration automatically:
- Creates preview deployments for every PR
- Deploys to production when PRs are merged to `main`

### Vercel Configuration

**Build settings** (configured in Vercel dashboard):
- Framework: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Node version: 22.x

**Environment variables**: None required for build.

### Deployment Flow

1. Open a PR → Vercel creates preview deployment
2. GitHub Actions runs CI checks
3. Both Vercel and GitHub checks must pass
4. Merge to `main` → Vercel deploys to production

## Troubleshooting

### "Format Check failed"

Run `npm run format` locally, commit the changes, and push.

### "Lint failed"

Run `npm run lint` locally to see diagnostics. Fix reported issues and push.

### "Type Check failed"

Run `npm run check` locally. Fix TypeScript errors and push.

### "Test failed"

Run `npm test` locally to reproduce. Check the failure output:
- If a unit test fails: fix the code or test
- If you suspect external API issues: try `RUN_LIVE_TESTS=true npm test` to isolate

### "Build failed"

Run `npm run build` locally. Common causes:
- Type errors (also caught by Type Check)
- Missing dependencies
- Astro configuration issues

### Live Tests Failing

Live test failures are informational and do not block deployment. They may indicate:
- Temporary upstream API unavailability
- API contract changes (investigate if consistent)
- Network issues

Trigger a manual live test run: Actions tab → Live Tests → Run workflow

### Vercel Build Failing

Check the Vercel deployment logs in the PR checks. Common causes:
- Same as local build failures above
- Environment differences (Node version mismatch)

Ensure your local Node version matches the engine in `package.json` (22.12.0).

## Manual Workflow Triggers

### Run Live Tests Manually

1. Go to the Actions tab in GitHub
2. Select "Live Tests" workflow
3. Click "Run workflow"
4. Select branch and run

Useful for on-demand integration verification without waiting for the weekly schedule.

## GitHub Environments

Two environments exist:
- **Preview**: Automatic, no protection rules (managed by Vercel)
- **Production**: Automatic, no protection rules (managed by Vercel)

Protection rules can be added via: Repository Settings → Environments

## Workflow Files

- `.github/workflows/ci.yml` - Primary CI checks
- `.github/workflows/live-tests.yml` - External API integration tests
- `.github/workflows/dependency-review.yml` - Security scanning for PRs

## Local Git Hooks

The repository also uses local Git hooks (`.githooks/`) for pre-commit and pre-push checks:

- **Pre-commit**: Formatting check, lint, typecheck
- **Pre-push**: Complete test suite, production build

These are configured automatically via `npm install` (postinstall script).

To manually configure: `git config core.hooksPath .githooks`

To bypass in emergencies: `git commit --no-verify` or `git push --no-verify`

## Node Version

**Required**: Node.js >= 22.12.0

The CI environment pins to exactly 22.12.0 to match the engine requirement and ensure reproducible builds.

## Cache Behavior

GitHub Actions uses `actions/setup-node`'s npm cache, keyed from `package-lock.json`. Each job still runs `npm ci` so installation remains lockfile-enforced; the cache stores npm's download data rather than an untracked `node_modules` tree.

Caches are automatically invalidated when the lockfile changes. If you suspect stale cache data, re-run the workflow; dependencies are still reconstructed by `npm ci`.

## Security

- **Permissions**: Workflows use least-privilege permissions (`contents: read` by default)
- **Secrets**: No secrets are required for PR validation
- **Fork safety**: PR workflows from forks run with restricted permissions
- **Dependency scanning**: Automatic high-severity vulnerability review via dependency-review workflow

## Workflow Badge

Add this to `README.md` to show CI status:

```markdown
![CI](https://github.com/shariiq/animekatana/actions/workflows/ci.yml/badge.svg)
```

## Support

For CI issues:
- Check the Actions tab for detailed logs
- Review this documentation
- Verify local reproduction with the same commands CI runs
