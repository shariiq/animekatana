# Engineering Standard

Operate at senior/principal-engineer quality: the simplest maintainable implementation that is correct, complete, tested, understandable, and demonstrably working — not merely code that compiles or looks plausible.

Do not optimize for speed of implementation at the expense of correctness. Do not optimize for perceived thoroughness at the expense of proportionality — see **Change Classification** below, which governs every other section in this document.

---

## Change Classification (read this first — it governs everything below)

Before working, classify the change. Every verification, testing, and gate requirement later in this document is scaled by this classification, not applied uniformly.

**Small / low-risk** — docs, comments, isolated config, CI YAML, formatting, copy/text, simple styles, narrowly-scoped refactors with unchanged behavior.
→ Touch only directly relevant files. Make the smallest correct change. Run the focused checks that could actually be affected (e.g. a linter on the changed file, the one test file that covers it). Do not run the full suite, do not audit unrelated code, do not add tests for process compliance.

**Medium-risk** — normal feature work, component behavior, API client changes, routing, shared utilities.
→ Inspect affected callers/dependencies. Run the directly relevant tests plus integration tests that touch the boundary you changed. Run lint/typecheck/build if the change could plausibly affect them. Widen scope only if something fails or looks uncertain.

**High-risk / cross-cutting** — auth, playback/media, deployment, caching/concurrency, security, large refactors, shared data models, production-critical infra.
→ Do the deeper root-cause and architecture analysis. Test success/failure/edge/race paths. Run the complete applicable test suite, lint, typecheck, and production build before push.

**Rule of thumb:** start with the fastest check capable of catching an error in *this specific change*. If it passes and the change is well-isolated, stop. Escalate only when a check fails, the change touches shared behavior, or you're genuinely unsure. Never rerun the full suite after every small edit — batch edits, then validate once at a natural boundary.

---

## Documentation

Use current official docs when framework/library behavior matters, especially for architecture-sensitive changes (routing, content collections, SSR/adapters, middleware, image optimization, client directives, i18n, deployment). Astro docs: https://docs.astro.build

Prefer official docs over blogs, snippets, or remembered APIs — installed versions may behave differently than training data assumes.

---

## Understand Before Editing

For non-trivial changes: read the relevant implementation, trace current data/control flow, identify callers/consumers/types/tests/side effects, and determine root cause before editing. Don't rewrite functioning architecture without understanding why it exists, and don't guess from a single file when the area is unfamiliar — depth of investigation should match the risk tier above.

---

## Root-Cause-First Error Handling

Fix the underlying defect, verify the original failure is gone, verify no regressions. Never suppress or disguise failures with try/catch, silent fallbacks, broad optional chaining, default values, ignored promises, type assertions, or nullable states used to make an error disappear. Use exceptions only for genuinely exceptional control flow. Prefer correct invariants, boundary validation, explicit state modeling, strong types, and clear error propagation — and preserve/surface meaningful typed errors to the user rather than converting failures into apparent successes.

---

## Correctness Over Plausibility

Code compiling, typechecking, or "looking right" is not evidence it works. Verify actual behavior proportional to risk: inspect real API responses, test the real UI, inspect actual network requests, open the routes, verify actual playback, confirm persisted state survives its lifecycle, and test success/failure/cancellation/retry/race paths where they matter to the change.

---

## No Fake Completeness

Never leave behind placeholder implementations, required-but-missing TODO logic, fake/static production data, stubbed responses, dead buttons/routes/handlers, commented-out broken code, hardcoded temporary values, mocks on production paths, or silently unsupported states. If something can't be completed correctly, say so explicitly rather than pretending it's done.

---

## Code Quality

Prefer small cohesive modules, explicit names, simple control flow, strong domain types, clear boundaries, pure functions where appropriate, and centralizing logic only where duplication would become dangerous. Avoid abstraction for its own sake, god objects, deeply nested conditionals, hidden mutation, duplicated business logic, and clever code that trades away readability. Comments explain *why*, constraints, and non-obvious decisions — not narrate obvious code.

---

## Types

Use TypeScript strictly. Don't weaken the type system to dodge a problem — avoid `any`, `as any`, `as unknown as ...`, `@ts-ignore`, `@ts-expect-error` unless there's a concrete reason it can't reasonably be modeled safely. Validate external data at the boundary; internal code should operate on well-defined domain types, not raw API responses.

---

## External APIs

Treat external systems as unreliable: handle malformed responses, missing fields, rate limits, timeouts, partial failures, unavailable resources, stale data, and unexpected status codes. Don't invent fields or behavior the API doesn't document — check real docs/responses before building logic around them. Encode params correctly; don't discard operationally significant fields.

---

## Performance

Identify actual costs before optimizing (network waterfalls, duplicated requests, unnecessary client JS, hydration, bundle size, expensive rendering, images, fonts, layout shift, cache behavior) rather than guessing. Prefer architectural wins over micro-optimizations. Any new cache needs a defined key, lifetime, invalidation, stale behavior, and failure behavior. Avoid client-side rendering when Astro can render server-side; keep interactive islands narrow; don't eagerly load functionality that's only needed after user intent.

---

## UI Quality & Accessibility

UI changes are judged by the user visually, not just structurally — check desktop and mobile, alignment/hierarchy/spacing/typography, loading/empty/error/disabled/hover/focus/active states, and that screens feel like the same product. Use the project's design system and tokens rather than arbitrary local values.

Interactive UI must work without a mouse: semantic elements (not clickable `div`s), keyboard navigation, visible focus states, labels/accessible names, logical tab order, dialog focus management, reduced-motion support, sufficient contrast.

---

## Testing Philosophy

Use the repository's existing test architecture, primarily `src/tests/`. Don't introduce Playwright/Cypress/browser E2E or a local-server verification workflow unless explicitly requested. Tests verify behavior, not inflate counts — prefer tests that fail if the implementation is genuinely broken, and add a regression test for bug fixes when practical. Mocks must not hide integration problems; verify critical external workflows against real behavior where safe. Match test type to what you're changing: unit tests for deterministic logic, integration tests for boundaries and user-critical workflows.

---

## Verification & Push Gate

Verification scope is set by the **Change Classification** above — this section describes *how* to run it, not a separate, larger requirement.

**Before considering any change done:**
1. Run the checks appropriate to its risk tier (see classification).
2. Reproduce bugs before fixing them when possible; confirm the fix resolves them and doesn't regress adjacent flows.
3. Self-review the diff as if reviewing someone else's PR: wrong assumptions, missed edge cases, duplicated logic, race conditions, stale state, leaked implementation details, accidental debug code, happy-path-only behavior.

**Before pushing** (scaled by risk tier — full weight only applies to medium/high-risk changes touching shared behavior):
- Formatting, lint, and typecheck pass.
- The tests relevant to the change pass — the *complete* `src/tests/` suite plus other applicable automated tests only for high-risk/cross-cutting changes, or when CI would otherwise be the first thing to catch a foreseeable failure.
- Production build passes when the change could plausibly affect it.
- No test was skipped, weakened, or rewritten just to get green; no known runtime error or regression is left unresolved; no required behavior is stubbed/mocked/hardcoded in production code.
- If a real external dependency blocks full verification, don't claim completion — state the unverified boundary explicitly.

Do not duplicate work that GitHub Actions will authoritatively re-check immediately after push, unless skipping it locally would let a foreseeable failure land in CI. Never weaken validation, assertions, mocks, or types just to force a passing result.

After pushing, check CI. If it fails: find the real root cause, fix it locally, rerun the relevant checks, push the correction. Don't merge with required checks failing.

---

## Git Discipline

Branch-and-PR workflow by default; don't push to `main` directly unless told to.

**Automated gates already in place** — don't duplicate them manually beyond what's needed to avoid a foreseeable CI failure:
- Pre-commit hook: formatting, lint, types (configured via `npm install` postinstall; `git config core.hooksPath .githooks` if needed).
- Pre-push hook: full deterministic test suite + production build.
- CI (`CI` workflow) is the authoritative PR gate: formatting, lint, Astro/TS types, deterministic tests, production build. `Dependency Review` blocks new high/critical-severity vulnerabilities. Scheduled/manual `Live Tests` exercise AniList/AniSource without gating merges on external availability.
- Vercel's Git integration owns deployments (PR previews + `main` → production) — don't add a duplicate deployment workflow. `main` should require `CI`, `Dependency Review`, and the Vercel check before merge.

`--no-verify` is for genuine false positives or external blockers only — never to push known-broken code.

Before committing: review `git diff`, drop unrelated changes and temp/debug files, confirm no secrets. Keep commits focused; no meaningless checkpoint commits.

---

## Definition of Done

A task is done when the requested behavior is fully implemented and verified at the level its risk tier requires, edge cases relevant to that tier are handled, no known regression or required-but-stubbed functionality remains, UI changes have been visually reviewed, and lint/typecheck/build/tests appropriate to the change all pass. "Compiles," "looks right," and "should work" are not completion criteria — but neither is running every check in this document against a one-line copy fix.
