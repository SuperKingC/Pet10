# Pet10 AI Maintenance Rules

## Before changing code

1. Read `AI_RULES.md`.
2. Read the feature document under `docs/features/` and the relevant rule under `.agents/rules/`.
3. Confirm the current worktree, branch, base commit, and uncommitted changes.
4. State one specific goal and an explicit non-goal list before editing.
5. Start from the latest `main`; do not continue work from an old feature worktree.

## Architecture boundaries

- UI components render and handle user interaction; they do not own complex domain algorithms.
- Domain code is deterministic and does not access HTTP, browser storage, or React.
- Services own network, storage, browser APIs, and external integrations.
- Feature folders own feature-specific state, components, styles, and tests.
- Server HTTP handlers map requests and responses; server services coordinate use cases; repositories own persistence.
- Do not add a cross-layer import to make a local change convenient.

## Change protocol

- Make the smallest change that solves the stated goal.
- Add or update a focused test before changing behavior.
- Do not combine visual changes with unrelated business or infrastructure changes.
- Miniapp changes must follow `.agents/rules/miniapp-change.md`: all changes stay in `miniapp/`, and after each change clear caches and recompile so the latest build is always previewed.
- Image changes must follow the image budgets in `docs/features/assets-and-performance.md`.

## Verification

- Use the fastest relevant check during development.
- UI or interaction changes must be previewed in WeChat DevTools with a freshly built `miniapp/dist`.
- Do not claim completion without reporting commands, results, unverified areas, and the preview entry.
- Run `npm run verify:full` before merging or deploying.
- Visual changes require user acceptance before merging to `main` or deploying production.

## Task commit hygiene

- As soon as a task with code changes reaches its goal and passes the fastest relevant check, commit that task's changes immediately (commit message in Chinese).
- Stage only the file paths the task explicitly touched; never use `git add -A` or `git add .`.
- If the worktree contains uncommitted changes unrelated to the task: do not revert, commit, or mix them in; list them in the report instead.
- This does not change the acceptance gates: visual changes still require user acceptance before merging to `main` or deploying.

## Git and deployment

- Write Git commit messages in Chinese.
- Do not commit secrets, `.env.production`, or generated local process state.
- Do not edit production files directly on the server.
- Production deployment uses the approved GitHub workflow and repository deployment scripts.
- Keep `main` as the only stable baseline.
