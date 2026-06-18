---
name: bugfix-push
description: Workflow for committing and pushing a BUG FIX on BD Property Hub — reproduce with a failing regression test, fix, verify, conventional fix commit, push, open a PR. Use when correcting broken behavior.
---

# Bugfix Push

Disciplined path for shipping a **bug fix** so the bug is proven fixed and
cannot silently return.

## When to use

Correcting incorrect behavior: a wrong result, a crash, a regression, a
security or data-integrity defect. For new capabilities, use the
**feature-push** skill.

## Steps

1. **Branch** off the latest default branch:
   ```bash
   git switch main && git pull --ff-only
   git switch -c fix/<kebab-summary>
   ```
2. **Reproduce first.** Write a **failing** test that captures the bug (the
   regression guard). It must fail before the fix.
3. **Fix the root cause** — the smallest change that makes the test pass. Avoid
   opportunistic refactors; keep the diff tight and reviewable.
4. **Verify — all four must pass** (from the `app/` root):
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
   Confirm the new regression test now passes and nothing else broke.
5. **Stage intentionally** — review `git status` / `git diff`; never stage
   `.env` or other secrets (`git check-ignore .env` must print `.env`).
6. **Commit** with a Conventional Commit:
   ```
   fix: <imperative summary of the corrected behavior>

   Root cause: <why it happened>
   Fix: <what changed>
   Regression test: <which test now guards it>
   ```
7. **Push** and **open a PR**:
   ```bash
   git push -u origin fix/<kebab-summary>
   ```
   In the PR, state how to reproduce the original bug and how the test proves
   the fix.

## Guardrails

- A bug fix without a regression test is incomplete — add the test.
- Don't widen scope: resist bundling unrelated cleanup into a fix PR.
- Secrets and build artifacts never get pushed (see the gitignore).
- If the fix touches money, ownership, or auth invariants, call it out in the
  PR and request a security review.

> Self-annealing (MorseGrid): after fixing, update the relevant directive/doc
> with the new learning so the system gets stronger.
