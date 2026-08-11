# Tarot Shuffle Progress Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the tarot shuffle hold duration to 2000ms while preserving linear progress and existing interaction behavior.

**Architecture:** Keep the timing rule in the pure `tarotAnimation` domain module. The existing press-progress hook continues to supply elapsed frame time, while documentation records the user-visible duration.

**Tech Stack:** TypeScript, React 19, Vitest, Vite.

## Global Constraints

- Use exactly `2000ms` for a full 0-to-100 shuffle hold.
- Preserve linear progress, pause/resume behavior, and the 100% clamp.
- Do not change CSS, cut-stage behavior, or tarot state transitions.
- Do not create a Git commit unless the user explicitly requests one.

---

### Task 1: Update Shuffle Timing Contract

**Files:**
- Modify: `src/games/tarot/tarotAnimation.test.ts`
- Modify: `src/games/tarot/tarotAnimation.ts`
- Modify: `docs/features/tarot.md`
- Modify: `docs/visual-baselines/tarot/timeline.md`

**Interfaces:**
- Produces: `TAROT_SHUFFLE_HOLD_DURATION_MS = 2000`
- Preserves: `advancePressProgress(progress: number, elapsedMs: number): number`

- [ ] **Step 1: Write the failing duration test**

```ts
expect(TAROT_SHUFFLE_HOLD_DURATION_MS).toBe(2000)
expect(advancePressProgress(0, 1000)).toBe(50)
expect(advancePressProgress(0, 2000)).toBe(100)
```

- [ ] **Step 2: Verify the focused test fails**

Run: `node_modules/.bin/vitest.cmd --run src/games/tarot/tarotAnimation.test.ts`

Expected: FAIL because the duration constant is missing and the old rate completes too quickly.

- [ ] **Step 3: Implement the 2000ms linear rule**

```ts
export const TAROT_SHUFFLE_HOLD_DURATION_MS = 2000

export function advancePressProgress(progress: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return progress
  return Math.min(100, progress + elapsedMs / TAROT_SHUFFLE_HOLD_DURATION_MS * 100)
}
```

- [ ] **Step 4: Update user-visible documentation**

Record that continuous holding from 0% to 100% takes approximately 2 seconds.

- [ ] **Step 5: Run focused and tarot verification**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/tarotAnimation.test.ts src/dev/tarot/tarotDevEntry.test.tsx
npm run verify:quick -- --scope=tarot
npm run check:docs
```

Expected: all commands pass.
