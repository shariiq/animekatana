# Engineering Standard

Operate at senior/principal-engineer quality.

The goal is not to produce code that merely looks plausible, compiles, or superficially satisfies the request. The goal is to produce the simplest maintainable implementation that is **correct, complete, tested, understandable, and demonstrably working in the real application**.

Do not optimize for speed of implementation at the expense of correctness.

---

# Documentation

Use current official documentation when framework or library behavior matters.

Astro documentation:

https://docs.astro.build

Consult the relevant official guide before making architecture-sensitive changes involving:

* routing and dynamic routes
* Astro components
* framework islands/integrations
* content collections
* styling or Tailwind
* internationalization
* SSR/adapters
* middleware
* image optimization
* client directives
* deployment behavior

Do not rely on remembered APIs when the installed version may behave differently.

Prefer official framework/library documentation over blogs, snippets, Stack Overflow answers, or generated assumptions.

---

# Understand Before Editing

Before making non-trivial changes:

1. Read the relevant implementation.
2. Trace the current data/control flow.
3. Identify callers, consumers, types, tests, and side effects.
4. Understand the intended behavior.
5. Reproduce the bug or limitation when possible.
6. Determine the root cause before editing.

Do not modify code merely because a pattern looks suspicious.

Do not rewrite functioning architecture without understanding why it exists.

For unfamiliar areas, inspect enough surrounding code to make changes confidently rather than guessing from one file.

---

# Root-Cause-First Error Handling

When an error or bug appears:

1. Determine the actual root cause.
2. Fix the underlying defect.
3. Verify that the original failure no longer occurs.
4. Verify that the fix does not create regressions elsewhere.

Do not suppress or disguise failures.

Do not use `try/catch`, silent fallbacks, broad optional chaining, default values, ignored promises, type assertions, or nullable states merely to make an error disappear.

Use exception handling only when the exceptional condition is genuinely part of the intended control   flow.

Prefer:

* correct invariants
* validation at boundaries
* explicit state modeling
* strong types
* better abstractions
* clear error propagation
* deterministic control flow

Preserve and sometimes nicely present the error to user when needed meaningful typed errors.

Never convert real failures into apparently successful states.

---

# Correctness Over Plausibility

Never assume code works because:

* it compiles
* TypeScript is satisfied
* a function looks correct
* a unit test passes
* the API shape seems obvious
* another implementation used the same pattern

Verify actual behavior.

For external APIs, inspect real responses when practical.

For UI behavior, test the real UI.

For network flows, inspect actual requests and responses.

For routing, open the routes.

For playback/media functionality, verify actual media playback.

For persistence, confirm stored state survives the expected lifecycle.

For asynchronous logic, test success, failure, cancellation, retry, and race conditions where relevant.

---

# No Fake Completeness

Do not leave behind:

* placeholder implementations
* TODO logic required for the requested feature
* fake/static production data
* stubbed responses
* dead buttons
* dead routes
* empty handlers
* commented-out broken code
* hardcoded temporary values
* mocks used by production paths
* silently unsupported states

If something cannot be completed correctly, state the limitation clearly rather than pretending it is done.

---

# Code Quality

Write code that another experienced engineer could confidently maintain.

Prefer:

* small cohesive modules
* explicit names
* simple control flow
* strong domain types
* clear boundaries
* composition over unnecessary inheritance
* pure functions where appropriate
* centralized shared logic where duplication would become dangerous
* local logic where abstraction would add unnecessary indirection

Avoid:

* abstraction for abstraction's sake
* premature generic frameworks
* god objects
* giant components
* deeply nested conditionals
* hidden mutation
* duplicated business logic
* unnecessary dependencies
* clever code that reduces readability
* excessive comments explaining bad code instead of improving it

Comments should explain **why**, constraints, invariants, or non-obvious decisions—not narrate obvious code.

---

# Types

Use TypeScript strictly.

Do not weaken the type system to avoid fixing a problem.

Avoid:

```ts
any
as any
as unknown as ...
@ts-ignore
@ts-expect-error
```

unless there is a concrete justified reason that cannot reasonably be modeled safely.

When consuming external data, validate at the boundary instead of trusting remote JSON.

Internal application code should operate on well-defined domain types rather than raw API responses whenever that improves correctness.

---

# External APIs

Treat external systems as unreliable boundaries.

Account for:

* malformed responses
* missing fields
* rate limits
* timeouts
* partial failures
* unavailable resources
* incompatible content
* stale data
* unexpected status codes

Do not invent fields or behavior that the API does not provide.

Inspect API documentation and real responses before building logic around them.

Encode path and query parameters correctly.

Do not discard fields that may be operationally significant.

---

# Performance

Performance must be designed, not claimed.

Before optimizing, identify actual costs.

Inspect when relevant:

* network waterfalls
* duplicated API requests
* unnecessary client JavaScript
* hydration
* bundle size
* expensive rendering
* image loading
* fonts
* layout shifts
* repeated computation
* cache behavior
* blocking work

Prefer architectural wins over micro-optimizations.

Do not introduce caching without defining:

* cache key
* lifetime
* invalidation behavior
* stale behavior
* failure behavior

Avoid unnecessary client-side rendering when Astro can render content on the server.

Keep interactive islands as narrow as practical.

Do not eagerly load functionality that is only needed after user intent.

---

# UI Quality

UI work must be evaluated visually by the user and only pass if they approve, not only structurally.

When modifying UI:

1. Verify the affected behavior through the repository's automated test suite and production build.
2. Inspect desktop and mobile layouts.
3. Check alignment, hierarchy, spacing, typography, states, and responsiveness.
4. Verify interactions.
5. Verify loading, empty, error, disabled, hover, focus, and active states.
6. Ensure all screens look like parts of the same product.

Do not create isolated components that are individually acceptable but collectively inconsistent.

Use the project's design system rather than arbitrary local styling.

Avoid default-framework-looking UI unless intentionally required.

Do not use random spacing, shadows, radii, colors, or typography values when design tokens exist.

---

# Accessibility

Interactive UI must work without a mouse.

Verify:

* semantic elements
* keyboard navigation
* visible focus states
* labels
* accessible names
* logical tab order
* dialogs and focus management
* reduced-motion preferences
* sufficient contrast where practical

Do not implement clickable `div`s when native interactive elements are appropriate.

---

# Testing Philosophy

Verification should be performed through the repository's automated test code.

Prefer the existing test architecture, especially `src/tests/`. Do not introduce Playwright, Cypress, browser-driven E2E infrastructure, or a local-server verification workflow unless the user explicitly requests it.

Tests exist to verify behavior, not inflate test counts.

Add or update tests for meaningful behavior affected by the change.

Prefer tests that would fail if the implementation were genuinely broken.

Do not write tests that merely reproduce implementation details.

For bug fixes, add a regression test when practical.

Use an appropriate combination of:

* unit tests for deterministic logic
* integration tests for boundaries and workflows
* integration tests for complete user-critical behavior

Mocks must not hide integration problems.

Critical external workflows should be verified against real behavior where safe and practical.

---

# Mandatory Verification Before Completion

Before declaring a task complete, run the full relevant verification suite.

For substantial changes, at minimum:

```bash
format
lint
typecheck
all tests under src/tests/
all other applicable automated tests
production build
```

Use the project's actual commands.

Run **the complete `src/tests/` suite**, not only tests related to the files you changed. If additional automated integration or regression tests exist elsewhere in the repository, run those too.

Do not skip failing or slow tests merely to obtain a green result. Fix the underlying defect or document a genuinely external blocker.

Verify the final production build completes successfully, and use automated tests to exercise complete user flows and application behavior.

Automated checks are necessary but not sufficient.

For frontend changes, cover the affected UI states, responsive behavior, and interactions through automated tests where the project can test them reliably.

For bug fixes:
1. reproduce the original failure when possible;
2. apply the fix;
3. rerun the complete relevant test suite;
4. verify the original failure no longer occurs;
5. check for regressions in adjacent flows.

For new functionality, test the complete end-to-end user journey, including success, loading, empty, error, retry, and important edge states—not just individual functions.

---

# Self-Review

Before considering work complete, inspect your own changes as if reviewing another engineer's pull request.

Check for:

* incorrect assumptions
* missing edge cases
* broken paths
* duplicated logic
* race conditions
* stale state
* poor naming
* unnecessary abstractions
* leaked implementation details
* performance regressions
* accessibility regressions
* visual inconsistencies
* unnecessary dependencies
* accidental debug code
* security issues
* behavior that only works on the happy path

Fix issues you discover before proceeding.

Do not knowingly submit "good enough for now" code when the defect can reasonably be fixed in the current task.

---

# Git Discipline

Use a branch-and-pull-request workflow by default.

Do not commit or push directly to `main` unless explicitly instructed.

## Automated Quality Gates

Local Git hooks provide early feedback:

- **Pre-commit**: Checks formatting, lint, and types without modifying staged files
- **Pre-push**: Runs the complete deterministic test suite and production build

The hooks are configured automatically via `npm install` (postinstall script). If needed, manually run:

```bash
git config core.hooksPath .githooks
```

GitHub Actions is the authoritative pull-request quality gate. The `CI` workflow checks formatting, lint, Astro/TypeScript types, the deterministic test suite, and the production build. The separate `Dependency Review` workflow blocks newly introduced high- or critical-severity dependency vulnerabilities. Scheduled and manually dispatched `Live Tests` exercise AniList and AniSource without making external availability a merge gate.

Vercel Git integration owns deployments: it creates pull-request previews and deploys `main` to production. Do not add a duplicate deployment workflow. Protect `main` by requiring all `CI` jobs, `Dependency Review`, and the Vercel deployment check before merge; failed checks must prevent production deployment through the merge gate.

Hooks can be bypassed with `--no-verify` in emergencies, but only when the failure is a false positive or external blocker—never to push known-broken code. See `.github/README.md` for workflow operation and repository-setting recommendations.

## Before Committing

1. Review `git diff`.
2. Remove unrelated changes.
3. Remove temporary/debug files.
4. Ensure secrets and credentials are not present.
5. The pre-commit hook will format, lint, and type-check automatically.

Keep commits focused and understandable.

Do not create meaningless checkpoint commits merely to save progress.

---

# Absolute Pre-Push Quality Gate

Do not commit or push any implementation that is known, suspected, or reasonably likely to be incomplete or broken.

Before any push, all of the following must be true:

* the complete `src/tests/` suite passes
* every other applicable automated test passes
* lint passes
* type checking passes
* the production build passes
* no test has been skipped, disabled, weakened, or rewritten merely to make the suite green
* no runtime error discovered during implementation remains unresolved
* no required behavior is stubbed, mocked, hardcoded, or simulated in production code
* no known regression remains
* all changed external API contracts have been validated against real documented/observed responses where practical
* the implementation has been self-reviewed against the original task, not only against the tests

If any of these conditions fail, do not push.

A green test suite is necessary but not sufficient. Tests can be incomplete. Before pushing, explicitly verify that the implementation actually satisfies the requested behavior and that the tests meaningfully exercise the critical success and failure paths.

Never change a test merely because the implementation fails it unless the test itself is demonstrably incorrect.

Never reduce validation, remove assertions, broaden mocks, weaken types, suppress errors, or add fallbacks solely to achieve a passing CI result.

If a real external dependency prevents full verification, stop short of claiming completion and clearly identify the unverified boundary.

# Push and CI Gate

Do **not push code merely because local implementation appears complete**.

Before pushing:

* formatting passes
* lint passes
* type checking passes
* the complete applicable test suite passes, including all relevant tests under `src/tests/`
* production build passes
* complete automated test suite pass where the project provides them
* affected application flows have been tested
* no known runtime errors remain
* no known broken UI remains
* no unresolved required TODOs remain

After pushing, verify CI/CD.

If CI fails:

1. inspect the real failure
2. fix the root cause locally
3. rerun relevant checks
4. push the correction

Do not merge while required CI checks are failing.

Merge to `main` only after required CI/CD succeeds unless explicitly instructed otherwise.

---

# Definition of Done

A task is complete only when:

* the requested behavior is fully implemented
* the implementation is technically sound
* the real application behavior has been verified
* relevant edge cases are handled
* tests meaningfully cover important logic
* lint/typecheck/production build/full applicable test suite pass
* all relevant `src/tests/` tests pass
* no known regression remains
* no required functionality is stubbed or faked
* UI changes have been visually reviewed
* performance implications have been considered
* the resulting code is maintainable
* CI passes before merge

"Compiles", "looks right", and "should work" are not acceptable completion criteria.

Prefer evidence over assumption.

# Engineering Efficiency

High quality does not mean maximum process for every task.

Use engineering judgment to choose the **smallest amount of investigation, implementation, and verification that gives strong confidence in correctness**.

Do not turn simple or isolated tasks into repository-wide audits.

Before working, classify the change by scope and risk:

### Small / Low-Risk

Examples:

* documentation
* comments
* isolated configuration
* CI YAML
* formatting
* copy/text
* simple styles
* narrowly scoped refactors with unchanged behavior

For these:

* inspect only directly relevant files and dependencies
* make the smallest correct change
* run focused validation appropriate to the change
* do not run unrelated tests
* do not perform broad architecture reviews
* do not research unrelated framework behavior
* do not add tests merely for process compliance when existing validation already proves the change

### Medium-Risk

Examples:

* normal feature work
* component behavior
* API client changes
* routing changes
* shared utilities

For these:

* inspect affected dependencies/callers
* run focused tests plus directly relevant integration/regression tests
* run type/lint/build checks when the change can affect them
* expand verification only if failures or uncertainty justify it

### High-Risk / Cross-Cutting

Examples:

* authentication
* playback/media
* deployment architecture
* caching/concurrency
* security-sensitive code
* large refactors
* shared data models
* production-critical infrastructure

For these:

* perform deeper root-cause and architecture analysis
* test success/failure/edge/race paths where relevant
* run broad regression coverage
* run the complete applicable test suite and production build before push

# Progressive Verification

Verification must be **progressive**, not maximal by default.

Start with the fastest, most targeted check capable of detecting errors in the change.

If it passes and the change is well-isolated, stop escalating unless another quality gate is required before push.

If it fails, affects shared behavior, or reveals uncertainty, progressively widen verification.

Preferred order:

1. syntax/schema/static validation specific to the changed file
2. directly affected tests
3. affected integration tests
4. lint/typecheck/build as applicable
5. broader regression tests
6. complete test suite only when justified by risk, cross-cutting impact, or the final pre-push gate

Do not repeatedly run expensive checks after every small edit.

Batch related edits, then validate once at the appropriate boundary.

# Time and Complexity Discipline

Avoid spending disproportionate effort on straightforward work.

Do not:

* over-plan simple changes
* repeatedly reread unchanged files
* research facts already established by the repository
* create abstractions for one-off problems
* introduce new infrastructure when existing tooling is sufficient
* add exhaustive tests for trivial declarative configuration
* rerun the entire test suite when a narrowly scoped validator is sufficient during development
* expand task scope merely because additional improvements are possible

For configuration such as GitHub Actions, first inspect the relevant package scripts and existing workflows, implement the minimal correct configuration, validate the YAML and referenced commands, and stop unless evidence shows deeper repository changes are required.

Correctness remains mandatory. **Unnecessary work is not quality.**

# Final Pre-Push Gate

Development-time verification should be proportional.

Immediately before pushing a substantial implementation, perform the broader repository quality gate required by this project.

For genuinely small, isolated changes, run only the checks capable of being affected by that change plus any mandatory repository hook/CI requirements.

Do not duplicate work already guaranteed by an immediately subsequent authoritative CI gate unless local execution is necessary to avoid reasonably foreseeable CI failure.
