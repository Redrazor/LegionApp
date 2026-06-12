---
name: workflow
description: >
  Displays the mandatory feature development workflow for LegionApp. Use when
  the user invokes /workflow, or when a reminder of the required steps is needed
  before starting any feature work. This workflow is MANDATORY — always follow it.
version: 1.0.0
---

# Feature Development Workflow (MANDATORY)

**Follow this for every feature. Never skip or reorder steps.**

---

## Step 1 — Present the feature for approval
Before writing any code, present to the user:
- Feature name and number (from `docs/future_features.md` if present; create it if not)
- Key design points and implementation plan
- Any decisions or unknowns that need input

**Wait for explicit user approval before proceeding.**

---

## Step 2 — Create a feature branch from main
```bash
git checkout main
git pull origin main
git checkout -b feature/<short-name>
```
Never start work on `main` or a stale branch. (If the repo isn't initialised yet,
`git init` and make a baseline commit on `main` first.)

---

## Step 3 — Implement the feature
Build the feature as approved. Follow all project patterns (see `CLAUDE.md`):
Vue 3 + TS + Pinia + Tailwind v4 front end, Express/SQLite/Drizzle back end, pure
logic in `src/utils/` with specs, data pipeline in `scraper/`.

---

## Step 4 — List acceptance criteria
Present a clear numbered list (AC1, AC2, AC3…), grouped by section, for the user to
manually validate in the browser. **Wait for the user to confirm all criteria pass.**

---

## Step 5 — Run tests until green
```bash
npm test
```
Fix any failures before proceeding. Do not move on with red tests.

---

## Step 6 — Run coverage until threshold met
```bash
npm run test:coverage
```
Coverage threshold is the value in `vitest.config.ts` (currently 50%). Add tests if
below it — pure logic (`utils/`, `scraper/normalise.ts`, `server/routes/`) carries it.
Do not move on until the threshold is met.

---

## Step 7 — Commit, PR, and merge
```bash
git add <relevant files>
git commit -m "feat: ..."
git push origin feature/<short-name>
gh pr create ...
# After the user approves the PR:
gh pr merge --squash
```

---

## Step 8 — Changelog + version bump on main

**MANDATORY before every bump:** add a new entry at the top of the `entries` array in
`src/components/ChangelogModal.vue` (version, date, user-facing `changes[]`) and update
`APP_VERSION` in `src/App.vue` to match. These three must always agree: package.json
version, `APP_VERSION`, and the top changelog entry. Do this in the feature branch/PR so
the release ships with its own changelog entry.

After merge, switch to main, pull, then bump:
- **Patch** — bug fix / small tweak: `npm version patch`
- **Minor** — new feature: `npm version minor`
- **Major** — breaking change / big milestone: `npm version major`
- **If unsure — ask the user.**

Commit and push to main (with tags).
