# GitHub Copilot Instructions — BHALYAM

These instructions apply to every Copilot Chat, inline suggestion, and agent
session in this repository. They encode a requirements-first, evidence-based
engineering methodology (adapted from the open-source **Superpowers**
methodology, stripped of any tool that isn't available in GitHub Copilot).
Full detail lives in three companion documents — read them when the
situation calls for depth; this file is the always-on summary:

- [`AGENTS.md`](../AGENTS.md) — senior-engineer governance: mandatory
  reading order, coding standards, the Iron Laws, and the Task Completion
  Protocol.
- [`docs/development-workflow.md`](../docs/development-workflow.md) — the
  8-phase process from requirements to completion.
- [`docs/ai-review-checklist.md`](../docs/ai-review-checklist.md) — the
  review gate every change must pass before it's presented as done.

## Never jump directly into code

Before writing or editing a single line, do all of the following, scaled to
the size of the request (a one-line fix needs a sentence of each; a new
subsystem needs paragraphs):

1. **State the plan.** What files change, in what order, and why. For
   anything touching more than a couple of files or crossing a client/server
   or module boundary, present the plan and wait for confirmation before
   editing.
2. **Identify assumptions.** Anything you inferred rather than verified from
   the code, the request, or the user (a data shape, a library's behavior, an
   unstated requirement) is an assumption. Name it explicitly — don't bury it
   silently in the implementation.
3. **Highlight risks.** Breaking changes, migration needs, concurrency
   issues, backward-compatibility concerns, anything that could surprise the
   user later.
4. **Propose tests before implementation.** Name the test cases — including
   edge cases and failure modes — you intend to write, before writing the
   code they verify. Prefer writing the test first and watching it fail
   (TDD) whenever the codebase's test setup supports it.
5. **Consider accessibility, security, and performance up front**, not as an
   afterthought once code exists. If a change touches UI, check keyboard/
   screen-reader/contrast implications now. If it touches input handling,
   auth, or external data, check injection/authorization implications now. If
   it touches a hot path or a large payload, check the cost now.

## While implementing

- Prefer the smallest change that correctly satisfies the requirement. Don't
  add speculative flexibility, unrequested features, or defensive handling
  for cases that can't occur (see `AGENTS.md`'s implementation discipline).
- Write a failing test before the code that makes it pass wherever the
  project's test tooling supports it. A test written after the code proves
  nothing about whether it would have caught the bug.
- When fixing a bug, find the root cause before changing anything. A fix
  that suppresses a symptom without an explanation of *why* the symptom
  occurred is not acceptable — see the root-cause-first rule in
  `docs/development-workflow.md`.
- Never fabricate an assumption as if it were verified fact. If you don't
  know how something behaves, say so and check it (read the code, run it,
  or ask) rather than guessing and presenting the guess as certain.

## Before presenting code as finished

1. **Self-review it** against
   [`docs/ai-review-checklist.md`](../docs/ai-review-checklist.md) —
   correctness, type safety, security, accessibility, performance,
   maintainability, testing, edge cases, error handling, documentation.
2. **Provide verification steps.** State the exact command(s) you ran (or
   the user should run) and what the output showed — a passing test count, a
   clean typecheck, a successful build. "Should work" is never a substitute
   for a command's actual output. If you did not run something, say so
   plainly instead of implying you did.
3. **Explicitly identify unverified assumptions.** If part of the change
   rests on something you could not verify (an external API's exact
   behavior, a value only known at runtime, a requirement the user hasn't
   confirmed), list it separately from what you did verify.
4. Follow `AGENTS.md`'s Task Completion Protocol: a task-specific
   verification checklist and a one-line Conventional Commits message.

## Edge cases and error handling

Treat "what happens when this input is empty / huge / malformed / absent /
concurrent / offline?" as a required question for every change that accepts
input, not an optional nice-to-have. State which edge cases you considered
and how each is handled (or explicitly why it can't occur here).

## Planning and implementation are separate activities

Do not blend "let me think about the approach" with "let me start editing
files" in the same breath. Finish the plan, get it confirmed for anything
non-trivial, and only then implement. If new information during
implementation invalidates the plan, stop, say so, and re-plan rather than
silently improvising around it.
