# Tarot Cut Depth Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tarot cut action read as one continuous three-dimensional pile transfer instead of a one-frame vertical position exchange.

**Architecture:** Keep `TarotGame`'s existing `cutting` and `cutCount` state sequence. Lock the visual contract in the existing source-inspection test, then consolidate the final cut CSS into one 1.15-second transform-only animation with layered pile edges and a subdued receiving motion on the lower half.

**Tech Stack:** React 19, TypeScript, CSS transforms and keyframes, Vitest, Vite.

---

### Task 1: Lock the Continuous Cut Contract

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Test: `src/games/tarot/tarotRitualStyles.test.ts`

- [ ] **Step 1: Write the failing regression assertions**

Require the active cut block to use a 1.15-second upper transfer, layered half-pile pseudo-elements, four staged transforms, no horizontal displacement beyond 4px, and an exact final/static coordinate match.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts`.

Expected: the new test fails because the active animation is `.9s`, the halves do not expose stack-edge pseudo-elements, and the lower pile currently moves through most of the same positional exchange.

### Task 2: Implement the Depth Transfer

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Give each half-pile visible thickness**

Add `transform-style: preserve-3d`, controlled backface visibility, and `::before`/`::after` card-edge layers with small vertical and depth offsets.

- [ ] **Step 2: Replace the active upper-pile keyframes**

Use a continuous sequence with rest, lift, forward-depth crossing, landing, and settle phases. Keep x travel within `-4px` to `4px`, and make the last transform equal the lower static rest transform.

- [ ] **Step 3: Reduce the lower-pile motion**

Keep the lower pile near its resting coordinate until the moving pile has crossed. Use only a small `translateZ`, tilt, brightness, and shadow response before ending at the upper static rest transform.

- [ ] **Step 4: Preserve alternate cuts and reduced motion**

Mirror only the small x/rotation curve for the swapped state. Keep the existing animation-end names or update `finishCut` and its test together. Under `prefers-reduced-motion`, complete both animations in `.01ms` with one iteration.

- [ ] **Step 5: Remove obsolete cut rules**

Delete the old `tarot-cut-top-half`, `tarot-cut-top-curve`, `tarot-cut-loop`, and associated active selectors so the stylesheet contains one authoritative cut-motion implementation.

### Task 3: Verify Behavior

**Files:**
- Verify: `src/games/tarot/TarotGame.tsx`
- Verify: `src/styles.css`
- Verify: `src/games/tarot/tarotRitualStyles.test.ts`

- [ ] **Step 1: Run the focused motion test**

Run `node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts`.

Expected: all tarot ritual interaction tests pass.

- [ ] **Step 2: Run the full frontend tests**

Run `node_modules/.bin/vitest.cmd --run`.

Expected: zero failed tests.

- [ ] **Step 3: Run type checking and production build**

Run `node_modules/.bin/tsc.cmd -b` and `node_modules/.bin/vite.cmd build`.

Expected: both commands exit with code 0.

- [ ] **Step 4: Inspect the browser result**

Start the Vite development server, enter the tarot cut stage, and inspect one cut plus a second alternating cut at desktop and mobile widths. Confirm the moving pile remains continuous and no snap appears at `animationend`.

- [ ] **Step 5: Inspect the final diff**

Run `git diff --check` and `git status --short`. Confirm the change remains limited to the focused tarot animation files plus the design and plan documents.
