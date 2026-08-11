# Tarot Download Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tarot preload progress advance continuously from received bytes and reduce first-load time with six concurrent downloads.

**Architecture:** Keep network streaming and image decoding in `imageResourceLoader`. Keep aggregate progress and concurrency policy in `tarotAssets`, using known response totals plus a conservative estimate for resources whose totals are not available yet; report final completion only after every image decodes.

**Tech Stack:** React, TypeScript, Fetch streams, Vitest, Vite.

## Global Constraints

- Do not modify tarot gameplay, stage transitions, animation timing, image content, or deployment topology.
- Do not load `public/tarot/concepts`.
- Do not fake progress or enter tarot before all resources decode.
- Default concurrency is exactly 6.
- Ten seconds is a normal-network acceptance target, not an unconditional guarantee.

---

### Task 1: Aggregate Progress

**Files:**
- Modify: `src/games/tarot/tarotAssets.test.ts`
- Modify: `src/games/tarot/tarotAssets.ts`

**Interfaces:**
- Consumes: loader callbacks shaped as `(loaded: number, total?: number) => void`.
- Produces: monotonic aggregate progress values from 0 through 1.

- [ ] Add a failing test where only the first active resources expose totals and verify progress uses their received bytes instead of completed-file steps.
- [ ] Run the focused test and confirm the old implementation fails.
- [ ] Add estimated totals for not-yet-started or unknown-size resources while preserving exact totals when available.
- [ ] Ensure progress never decreases, never reaches 1 before all resources decode, and ends at exactly 1.
- [ ] Run the focused test and confirm it passes.

### Task 2: Six-Way Concurrency

**Files:**
- Modify: `src/games/tarot/tarotAssets.test.ts`
- Modify: `src/games/tarot/tarotAssets.ts`

**Interfaces:**
- Consumes: optional `{ concurrency?: number }`.
- Produces: six workers by default while preserving explicit overrides.

- [ ] Add a failing test that starts at least seven resources and expects six active loaders by default.
- [ ] Run the focused test and confirm the old default of three fails.
- [ ] Change the default concurrency from 3 to 6.
- [ ] Run concurrency tests and confirm default and explicit limits pass.

### Task 3: Documentation and Verification

**Files:**
- Modify: `docs/features/tarot.md`

**Interfaces:**
- Documents the user-visible preload behavior and performance target.

- [ ] Document byte-based estimated progress, six concurrent downloads, and the conditional ten-second target.
- [ ] Run focused tarot tests.
- [ ] Run `npm run build`.
- [ ] Run `npm run check:docs` and `npm run check:assets`.
- [ ] Start `npm run review`, inspect the tarot entry, browser console, and request waterfall, then report the review URL and unverified network conditions.
