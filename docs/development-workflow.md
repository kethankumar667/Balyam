# Development Workflow — 8 Phases

> Adapted from the open-source **Superpowers** engineering methodology
> (github.com/obra/superpowers), with every Claude-, Cursor-, Codex-, or
> Antigravity-specific mechanism (plugin hooks, subagent-dispatch tools, CLI
> marketplace commands) removed. What remains is the platform-agnostic
> process: how a change moves from an idea to a merged, verified result.
> This governs *process*. For BHALYAM's concrete coding standards, stack,
> and architecture, `AGENTS.md` and `docs/ai/*.md` are still the source of
> truth — this document tells you *when* to consult them.

Every non-trivial change moves through these phases in order. A one-line
typo fix collapses most phases to a sentence each; a new subsystem spends
real time in each one. Nothing skips Phase 6 (Review) or Phase 7
(Verification) regardless of size — those are the two gates that catch
what speed hides.

---

## Phase 1 — Requirements

**Purpose:** Understand what is actually being asked before proposing how.

**Do:**
- Classify the size of the request:
  - **Trivial** — a one-file fix, a config value, a copy change. Proceed
    with a one-sentence statement of intent.
  - **Bounded** — a change to a flow that already exists in this repo (a new
    field, a new endpoint, a bug fix). Ask the clarifying questions that
    matter, then present a short design in chat.
  - **Architectural** — a new subsystem, a new game, a change to an
    interface other code depends on, anything that restructures how
    components fit together. Follow the full Phase 1–3 process below and
    produce a written spec.
  - When in doubt between two sizes, treat it as the larger one. If hidden
    complexity surfaces mid-task, stop and re-classify — nothing downgrades
    mid-task, but anything can upgrade.
- Ask clarifying questions one at a time for anything the request leaves
  ambiguous. Prefer multiple-choice questions when there's a natural set of
  options.
- State assumptions explicitly rather than silently picking one interpretation.
- Surface risks now: breaking changes, migration needs, security-sensitive
  surfaces, anything that could surprise the requester later.

**Exit criteria:** You can state, in one or two sentences, what problem this
solves and for whom — and the requester has not corrected that statement.

---

## Phase 2 — Specification

**Purpose:** Turn an approved idea into an unambiguous, reviewable
description of the solution. Trivial and Bounded work generally skips a
written spec — the "short design in chat" from Phase 1 *is* the
specification. Architectural work gets a written one.

**Do (Architectural work):**
- Propose 2–3 approaches with trade-offs; lead with a recommendation and
  say why.
- Present the design in sections (architecture, data flow, error handling,
  testing strategy), scaled to their complexity, checking in after each
  section rather than dumping the whole thing at once.
- Write the approved design to a spec document (e.g.
  `docs/specs/YYYY-MM-DD-<topic>.md`) and get it reviewed before moving to
  Planning.
- Include explicit **non-goals** — what this change deliberately does not
  do — so scope doesn't silently creep during implementation.

**Self-review before handing the spec off** — read it with fresh eyes and
check for:
1. **Placeholders** — any "TBD", "TODO", or vague requirement. Fix or
   remove.
2. **Internal contradictions** — do two sections disagree?
3. **Scope** — is this one implementation plan's worth of work, or does it
   need to be split into independent sub-specs?
4. **Ambiguity** — could any requirement be read two ways? Pick one and say
   so explicitly.

**Exit criteria:** A reader with no other context can tell exactly what is
being built and what is explicitly out of scope.

---

## Phase 3 — Planning

**Purpose:** Decompose the specification into small, independently
verifiable tasks.

**Do:**
- Map out which files will be created or modified and what each is
  responsible for before naming tasks — this is where the decomposition
  decisions actually get made.
- Size each task as the smallest unit that carries its own test cycle: write
  test → watch it fail → implement → watch it pass → commit. A task should
  be independently reviewable; if a reviewer could plausibly approve one
  step and reject its neighbor, that's the task boundary.
- For each task, write down: exact files touched, what it consumes from
  earlier tasks (exact function/type names), what it produces for later
  tasks. This is what lets tasks be implemented (and reviewed) with only
  their own slice in view.
- **No placeholders in the plan.** "Add appropriate error handling," "write
  tests for the above," "similar to Task 2" are plan failures — write the
  actual code, the actual test, the actual error path. A task's implementer
  should need zero additional research to start.

**Self-review before executing the plan:**
1. **Spec coverage** — can you point to a task for every requirement in the
   spec? List any gaps and add tasks for them.
2. **Placeholder scan** — re-check for the patterns above.
3. **Type/name consistency** — does a function named one thing in Task 2
   keep that name in Task 5?

**Exit criteria:** Every task in the plan could be handed to someone with
zero context on this codebase and completed without them needing to ask a
clarifying question.

---

## Phase 4 — Testing Strategy

**Purpose:** Decide what "correct" means, in checkable terms, before writing
implementation code.

**Do:**
- For each task, name the test cases before the code: the happy path, the
  edge cases (empty / huge / malformed / absent / concurrent / duplicate
  input), and the failure modes (what should happen when a dependency is
  down, a request is unauthorized, a value is out of range).
- Prefer real behavior over mocks. A test that only proves a mock was
  called proves nothing about the actual code.
- Decide the test level per case: unit (isolated logic), integration
  (crossing a real boundary — API, socket, database), or manual/exploratory
  (only for what automation genuinely can't cover, e.g. visual layout at a
  specific breakpoint) — and say which.
- Where the project's tooling supports test-first development, plan to
  write the test, run it, and confirm it fails for the *right* reason,
  before writing the implementation. A test that passes immediately on
  creation is testing nothing.

**Exit criteria:** For every task, there's a named list of test cases that,
if all green, would make you confident the task is correct — written down
*before* the implementation exists.

---

## Phase 5 — Implementation

**Purpose:** Build exactly what the plan and testing strategy describe — no
more, no less.

**Do:**
- **Red → Green → Refactor**, per task, where test-first is in play: write
  the failing test, confirm it fails for the expected reason (not a typo or
  setup error), write the minimal code to pass it, confirm it passes and
  nothing else broke, then clean up without changing behavior.
- **Root cause before fix, always**, for any bug: reproduce it reliably,
  read the actual error/stack trace completely, check what changed
  recently, and trace the bad value backward to its origin before writing a
  fix. A fix that address a symptom without an explanation of the
  underlying cause is not acceptable — see the Iron Law below.
- **YAGNI.** Don't add configuration options, abstraction layers, or
  "while I'm here" improvements the current task doesn't need.
- Keep commits small and frequent, one logical change each, with a message
  that states *why* when the why isn't obvious from the diff.
- Consider accessibility, security, and performance *as you write the
  code*, not as a checklist item after the fact — see Phase 6 for the
  explicit gate, but the earlier a concern is caught, the cheaper it is to
  fix.

**Iron Laws (violating the letter is violating the spirit — there are no
"just this once" exceptions without the requester's explicit sign-off):**

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST (where test-first applies)
NO BUG FIX WITHOUT ROOT-CAUSE INVESTIGATION FIRST
```

If a fix attempt fails three times in a row, stop attempting fixes. That
pattern means the architecture itself is suspect, not that the fourth
attempt will succeed — raise it with the requester instead of trying a
fourth variation.

**Exit criteria:** Every task's tests pass, the diff matches what the plan
described (or deviations are called out explicitly), and nothing outside
the task's stated scope changed.

---

## Phase 6 — Review

**Purpose:** Catch what the implementer's own perspective can't see, before
it costs more to fix later.

**Do:**
- Run a structured self-review against
  [`docs/ai-review-checklist.md`](ai-review-checklist.md) — correctness,
  type safety, security, accessibility, performance, maintainability,
  testing, edge cases, error handling, documentation. For BHALYAM-specific
  concerns (DLS tokens, dual mobile/desktop layouts, server authority, the
  9-device matrix), also check
  [`docs/ai/code-review-checklist.md`](ai/code-review-checklist.md).
- Categorize any issue found by actual severity — Critical (bugs, security
  holes, broken functionality), Important (missing edge cases, weak error
  handling, architecture concerns), Minor (style, naming, polish). Not
  everything is Critical; over-flagging erodes trust in the flags that
  matter.
- **Security review is mandatory before implementation is considered
  reviewable**, for anything touching input handling, authentication,
  authorization, or data exposed to another player's client.
- **Performance review is mandatory before merge**, for anything touching a
  hot path, a render loop, a payload sent over the socket, or a bundle-size
  budget.
- **Accessibility review is mandatory before merge**, for anything touching
  UI: keyboard reachability, focus visibility, screen-reader labels,
  contrast, motion preferences.
- If feedback (from a human or a review pass) is unclear, ask before
  implementing it — partial understanding of multi-item feedback produces
  wrong implementations of the parts you didn't fully understand.
- If feedback is technically wrong for this codebase, say so with reasoning
  rather than implementing it anyway to avoid friction.

**Exit criteria:** Zero unresolved Critical findings. Important findings are
either fixed or explicitly deferred with a stated reason. The security,
performance, and accessibility gates above have each been explicitly
checked, not silently skipped.

---

## Phase 7 — Verification

**Purpose:** Prove the work is correct with evidence, not confidence.

**Iron Law:**

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE FROM THIS SESSION
```

**Do:**
- Identify the exact command that proves each claim (test suite, typecheck,
  build, linter) and run it in full — not a partial run, not a memory of a
  previous run.
- Read the actual output: exit code, pass/fail counts, warnings. "Should
  pass now" is not verification; a fresh, complete run is.
- For a bug fix, verify the *original* symptom is gone — re-run the exact
  reproduction from Phase 5, not just the new regression test in isolation.
- For a regression test, prove it actually catches the bug: temporarily
  revert the fix, confirm the test fails, restore the fix, confirm it
  passes again. A test that passes once, without ever being watched to
  fail, hasn't proven anything.
- Never use "should," "probably," or "seems to" in a completion claim — if
  you find yourself writing one of those words, that's the signal to go run
  the command instead.

**Exit criteria:** Every claim of "done," "fixed," or "passing" is backed by
output from a command run in this session, quoted or summarized with its
actual result.

---

## Phase 8 — Completion

**Purpose:** Close the loop cleanly so the next person (human or AI) can
trust the state of the work.

**Do:**
- Follow `AGENTS.md`'s Task Completion Protocol: a task-specific
  verification checklist (what was actually run, what it showed) and a
  single Conventional Commits line the requester can copy verbatim.
- State plainly what was *not* verified (e.g., "typecheck and unit tests
  pass; this was not exercised in a browser") rather than implying full
  coverage.
- Note any follow-up work the change surfaced but didn't include, so it
  isn't silently lost — without inventing speculative future work that
  wasn't asked for.
- Leave no placeholder code, no commented-out blocks "for later," and no
  unresolved merge markers.

**Exit criteria:** The requester can read the completion summary and know
exactly what changed, exactly how it was verified, and exactly what (if
anything) still needs their attention — with nothing overstated and nothing
hidden.
