---
name: feature-push
description: Workflow for committing and pushing a NEW FEATURE on BD Property Hub — branch, verify (typecheck/lint/test/build), conventional commit, push, open a PR. Use when shipping a new capability, endpoint, screen, or component.
---

# Feature Push

Disciplined path for getting a **new feature** from local work onto the remote
without leaking secrets or breaking `main`.

## When to use

A new capability: an API endpoint/module, a UI screen or component, a worker
job, a schema change. For fixing broken behavior, use the **bugfix-push** skill.

## Steps

1. **Branch** off the latest default branch:
   ```bash
   git switch main && git pull --ff-only
   git switch -c feat/<kebab-summary>
   ```
2. **Build it test-first** (TDD): write the failing test, implement, refactor.
   Keep functions < 50 lines and files < 800; comment only complexity and
   framework-specific wiring.
3. **Verify — all four must pass** (run from the `app/` root):
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
   Scope with `--filter @bdph/<pkg>` while iterating, but run the full set
   before pushing.
4. **Stage intentionally** — never blanket `git add .`:
   - Review `git status` and `git diff`.
   - Confirm secrets stay out: `git check-ignore .env` must print `.env`.
   - Add only this feature's files.
5. **Commit** with a Conventional Commit:
   ```
   feat: <imperative summary>

   <what changed and why; reference the directive/doc it implements>
   ```
   Other types if appropriate: `feat`, `refactor`, `perf`, `test`, `docs`.
6. **Push:**
   ```bash
   git push -u origin feat/<kebab-summary>
   ```
7. **Open a PR** with a summary + a test plan (checkbox list). Link the
   architecture doc or directive the feature implements.

## Guardrails

- **Secrets never get pushed.** `.env`, `*.pem`, `*.key`, `credentials.json`,
  `token.json` are gitignored — verify before every push.
- Don't commit `node_modules/`, `.next/`, `dist/`, `.turbo/`.
- CI must be green before requesting review; resolve conflicts by rebasing on
  the latest default branch.
- One feature per branch/PR — keep diffs reviewable.

> Repo note: the initial commit intentionally contains only `README.md`. The
> first time you ship code, this skill is what stages and pushes the source.
