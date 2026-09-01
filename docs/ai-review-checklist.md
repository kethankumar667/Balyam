# AI Review Checklist

> Adapted from the open-source **Superpowers** code-review methodology
> (github.com/obra/superpowers), stripped of subagent-dispatch mechanics
> that don't apply outside that toolset. This is the generic, stack-agnostic
> review gate — use it for any change, in any language, in any repo. For
> BHALYAM-specific concerns (DLS tokens, dual mobile/desktop layouts, the
> 9-device matrix, server authority), also run
> [`docs/ai/code-review-checklist.md`](ai/code-review-checklist.md).
>
> Use this checklist for **both** self-review (Phase 6 of
> [`development-workflow.md`](development-workflow.md), run before
> presenting code as finished) and for reviewing someone else's diff.

## How to use this

1. Go through every category below against the actual diff — not from
   memory of what you intended to write.
2. File every real finding under exactly one severity tier. Don't inflate
   Minor issues to Critical, and don't wave away real bugs as Minor to avoid
   friction.
3. For each finding, give the same four things: **location** (file:line),
   **what's wrong**, **why it matters**, **how to fix** (if not obvious).
4. Finish with a clear verdict — not "looks fine," an actual **Ready to
   merge: Yes / No / With fixes**.

**Severity tiers:**
- **Critical (must fix before merge):** bugs, security holes, data loss
  risk, broken functionality, a test suite that doesn't actually pass.
- **Important (should fix before merge):** missing edge case handling, weak
  error handling, a real accessibility or performance regression, a test
  gap around risky logic.
- **Minor (nice to have):** naming, style, optimization opportunities,
  documentation polish — track these but don't let them block merge.

A passing test is not sufficient evidence on its own — check whether its
assertions could actually detect the bug this change was supposed to
prevent. A test that would pass whether or not the fix existed is not
coverage.

---

## 1. Correctness

- [ ] The change does what the requirement/spec/plan actually asked for —
      re-read the requirement, don't just re-read the code.
- [ ] Any deviation from the plan is called out explicitly, with a reason.
- [ ] Business logic matches the stated rules exactly (off-by-one, boundary
      conditions, sign errors, wrong comparison operator).
- [ ] No dead code paths, unreachable branches, or logic that can never
      execute given the actual call sites.
- [ ] Concurrent/async operations produce the intended result under
      realistic interleavings, not just the happy-path ordering.

## 2. Type Safety

- [ ] No new `any` (or equivalent escape hatch) introduced without a
      one-line justification for why it's unavoidable here.
- [ ] Function signatures describe what they actually accept and return —
      no `unknown` cast away without a runtime check backing it.
- [ ] Shared types (wire contracts, DTOs, shared type modules) are updated
      on every side that consumes them — not just the side that changed
      first.
- [ ] Nullability is explicit: a value that can be absent is typed as such,
      not silently assumed present.
- [ ] Generic/inferred types match the intent — no accidental widening to
      `string` or `object` that erases a meaningful constraint.

## 3. Security

- [ ] Every value that crosses a trust boundary (client input, another
      player's payload, a URL parameter, an environment variable) is
      validated against a closed set or a strict schema — never trusted
      as-is.
- [ ] No secret, token, or credential is logged, rendered, or included in
      an error message returned to a client.
- [ ] Authorization is checked server-side (or at the actual trust
      boundary) — a client-side-only check is not a security control.
- [ ] No new injection surface: rendered HTML, constructed file paths,
      constructed shell commands, or constructed queries all use safe
      construction (escaping/parameterization), not string concatenation of
      untrusted input.
- [ ] Rate-sensitive or state-mutating actions can't be replayed or
      duplicated by a malicious or buggy client (idempotency, sequence
      checks, or equivalent).
- [ ] Dependency additions are from a maintained, reputable source — no
      unvetted package for something the standard library already does.

## 4. Accessibility

- [ ] Every interactive element is reachable and operable by keyboard
      alone, in a sensible tab order.
- [ ] Focus is visible (not suppressed) and moves sensibly on
      open/close/navigate.
- [ ] Icon-only or ambiguous controls have an accessible name (`aria-label`
      or equivalent) — not just a tooltip.
- [ ] Color is never the only signal — status, error, and success states
      pair color with text or an icon.
- [ ] Contrast meets at least 4.5:1 for normal text, 3:1 for large
      text/UI components.
- [ ] Motion respects a reduced-motion preference where the platform
      exposes one.
- [ ] Dynamic content that should be announced to a screen reader uses an
      appropriate live region — and isn't so chatty it becomes noise.

## 5. Performance

- [ ] No obviously quadratic-or-worse operation on a collection whose size
      isn't bounded to something small.
- [ ] No unbounded growth: a list, cache, or event log that isn't capped
      will eventually consume unbounded memory.
- [ ] Expensive work (network calls, heavy computation, large renders) is
      not repeated unnecessarily on every re-render/tick/request when it
      could be memoized, debounced, or cached.
- [ ] Every subscription, timer, interval, or listener created has a
      matching cleanup on unmount/teardown — nothing leaks across the
      lifetime of the surrounding scope.
- [ ] Payloads sent over the network carry only what the receiver needs,
      not the whole internal state object.
- [ ] Any newly-added dependency's size/cost is proportional to what it's
      used for — no heavyweight library pulled in for a few lines of logic.

## 6. Maintainability

- [ ] Follows the codebase's existing patterns and naming conventions
      rather than introducing a parallel style for the same problem.
- [ ] No duplicated implementation of something that already exists
      elsewhere in the codebase — reused or extended instead.
- [ ] Each new file/function has one clear responsibility; a reader can
      say what it does without reading its internals.
- [ ] No speculative abstraction, configuration flag, or extensibility hook
      added for a use case that doesn't exist yet (YAGNI).
- [ ] Comments explain *why*, not *what* — and only where the code itself
      can't make the reasoning obvious.
- [ ] The change is scoped to what was asked; no unrelated refactoring,
      formatting-only diffs, or drive-by changes bundled in.

## 7. Testing

- [ ] Every new behavior has a test that would fail without the
      corresponding code change.
- [ ] Tests assert on real behavior/output, not on the fact that a mock was
      called — mocks are used only where a real dependency is genuinely
      impractical to exercise.
- [ ] Integration-level coverage exists for anything that crosses a real
      boundary (API, socket, database) — unit tests on mocked pieces don't
      substitute for proving the wiring actually works.
- [ ] Regression tests for bug fixes are proven to catch the bug (would
      fail if the fix were reverted), not just proven to pass once.
- [ ] No test is tautological (asserting a value against itself) or
      dependent on execution order/timing that could make it flaky.
- [ ] The full test suite passes — not just the new tests — and the output
      is clean (no unexpected warnings, no swallowed errors).

## 8. Edge Cases

- [ ] Empty input (empty string, empty array, empty object, zero) is
      handled explicitly, not just implicitly falling through.
- [ ] Extremely large input (long strings, huge collections, high
      concurrency) doesn't break correctness or blow a resource budget.
- [ ] Malformed or unexpected-shape input is rejected cleanly, not allowed
      to propagate a confusing downstream error.
- [ ] Absent/missing values (network failure, missing optional field, a
      dependency that hasn't loaded yet) have a defined, intentional
      behavior.
- [ ] Concurrent or duplicate operations (double-submit, race between two
      updates, simultaneous requests from two clients) produce a defined,
      correct outcome.
- [ ] Boundary values (first item, last item, exactly-at-the-limit) are
      covered, not just the middle of the range.

## 9. Error Handling

- [ ] Every operation that can fail (I/O, parsing, external calls) has an
      explicit failure path — not a silent catch-and-ignore.
- [ ] Error messages shown to a user are actionable and don't leak internal
      implementation detail (stack traces, internal identifiers, raw
      exception text).
- [ ] Errors are handled at the layer that actually knows what to do about
      them — not defensively re-checked at every layer "just in case,"
      which hides where the real authority for a decision lives.
- [ ] A failure in one part of a batch/loop/multi-step operation doesn't
      silently corrupt or half-apply the rest.
- [ ] Retries (if any) are bounded and don't turn a transient failure into
      an infinite loop or a thundering herd.

## 10. Documentation

- [ ] Public functions/APIs/components have their inputs, outputs, and any
      non-obvious behavior documented where the codebase's convention
      expects it.
- [ ] Any new environment variable, config flag, or setup step is recorded
      wherever the project's setup instructions live.
- [ ] A non-obvious design decision (why this approach and not the obvious
      alternative) is captured in a comment or doc, not left only in the
      requester's memory of the conversation.
- [ ] Governance docs (`AGENTS.md`, `docs/development-workflow.md`, project
      specific standards) are updated in the same change if the change
      introduces a new pattern, convention, or capability those docs
      claim to cover.
- [ ] No documentation describes behavior that no longer matches the code
      after this change.

---

## Verdict

State explicitly, every time:

**Ready to merge:** Yes / No / With fixes
**Reasoning:** one or two sentences, technical, specific to what was
actually found — not a restatement of "looks good."
