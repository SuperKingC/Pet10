# Client Network Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bound miniapp request waits, prevent overlapping/stale polling, and prepare PWA shell images after login.

**Architecture:** Add a configurable timeout at the miniapp API boundary, a framework-independent recursive polling scheduler with lifecycle invalidation, and a shared PWA startup asset helper called from both initial and post-login session paths.

**Tech Stack:** TypeScript, React, Taro, Vitest fake timers, Vite.

---

### Task 1: Add miniapp request timeouts

**Files:**
- Create: `miniapp/src/services/apiClient.test.ts`
- Modify: `miniapp/src/services/apiClient.ts`

- [ ] Write tests that call `apiRequest` with no timeout and with `timeoutMs: 30_000`, asserting Taro receives `15_000` and `30_000` respectively.
- [ ] Run `npm test --prefix miniapp -- src/services/apiClient.test.ts` and confirm RED because no timeout is passed.
- [ ] Export `DEFAULT_REQUEST_TIMEOUT_MS = 15_000`, add `timeoutMs?: number` to options, and pass `timeout: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS` to `Taro.request`.
- [ ] Rerun the focused test and confirm GREEN.

### Task 2: Add the single-flight polling scheduler

**Files:**
- Create: `miniapp/src/services/singleFlightPolling.ts`
- Create: `miniapp/src/services/singleFlightPolling.test.ts`

- [ ] Write fake-timer tests proving an unresolved task is never overlapped, the next task starts only one interval after settle, and `stop()` makes the captured `isCurrent()` false and prevents future tasks.
- [ ] Run the new suite and confirm RED because the scheduler is missing.
- [ ] Implement immediate execution, post-settle `setTimeout`, rejection absorption, and idempotent cleanup.
- [ ] Rerun the suite and confirm GREEN with no unhandled rejection.

### Task 3: Migrate messages and Gobang polling

**Files:**
- Create: `miniapp/src/config/miniappPolling.test.ts`
- Modify: `miniapp/src/features/main/MiniappMessagesView.tsx`
- Modify: `miniapp/src/features/main/MiniappGobangPanel.tsx`
- Modify docs: `docs/features/miniapp.md`, `docs/features/gobang.md`

- [ ] Write source-boundary tests that require both components to import `startSingleFlightPolling`, reject `setInterval`, and check `isCurrent()` before async state writes.
- [ ] Run the source-boundary suite and confirm RED on current `setInterval` usage.
- [ ] Replace the messages interval/cancelled flag with a scheduler task that commits messages or errors only while current.
- [ ] Let Gobang `refresh` accept an `isCurrent` predicate, guard both success and error writes, and schedule it only in friend mode.
- [ ] Run miniapp focused tests, clear the exact `miniapp/dist` directory, and run `npm run build:weapp --prefix miniapp`.
- [ ] Update docs to state that polling is single-flight and stale results are discarded.

### Task 4: Prepare PWA shell images after login

**Files:**
- Create: `src/startupAssets.ts`
- Modify: `src/startupAssets.test.ts`
- Modify: `src/main.tsx`
- Modify docs: `docs/features/app-navigation.md`, `docs/features/assets-and-performance.md`

- [ ] Extend the startup test to require the centralized helper and at least two calls in `main.tsx`, then confirm RED.
- [ ] Move the existing URL list into `APP_SHELL_IMAGE_URLS` and implement `preloadAppShellImages` with injectable loader defaulting to `preloadImage`.
- [ ] Call the helper during eligible module startup and immediately after a successful session response before committing the session.
- [ ] Run startup tests and `npx tsc -b`, then sync navigation/performance docs.

### Task 5: Verify and commit

**Files:**
- All files above; preserve unrelated user changes and use partial staging for overlapping documents if needed.

- [ ] Run all new focused tests and existing adjacent suites.
- [ ] Clear and rebuild `miniapp/dist`.
- [ ] Run `npm run check:docs`, `npm run check:assets`, and `npm run verify:full`.
- [ ] Run `npm run review` and report the URL.
- [ ] Commit with Chinese messages split between miniapp network polling and PWA startup assets.
