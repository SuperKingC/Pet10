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
- Tarot animation changes must follow `.agents/rules/tarot-animation.md`.
- Image changes must follow the image budgets in `docs/features/assets-and-performance.md`.

## Verification

- Use the fastest relevant check during development.
- UI or animation changes must provide a local review URL.
- Do not claim completion without reporting commands, results, unverified areas, and the review URL.
- Run `npm run verify:full` before merging or deploying.
- Visual changes require user acceptance before merging to `main` or deploying production.

## Git and deployment

- Do not commit secrets, `.env.production`, or generated local process state.
- Do not edit production files directly on the server.
- Production deployment uses the approved GitHub workflow and repository deployment scripts.
- Keep `main` as the only stable baseline.
