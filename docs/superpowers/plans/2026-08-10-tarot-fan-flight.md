# Tarot Fan Card Flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fan-stage selected-card CSS flight with a measured, layered ritual animation that lands smoothly in the correct picked slot without a brightness discontinuity.

**Architecture:** `TarotFanStage` owns interaction and DOM measurement while a focused deterministic helper builds the flight geometry and keyframes. The reducer remains the only source of selected-card state, and CSS only styles the stable fan, target slots, and overlay visual.

**Tech Stack:** React, TypeScript, Web Animations API, Vitest, Testing Library, CSS.

## Global Constraints

- Change only the `fan` stage selected-card flight.
- Keep the reducer, pick limits, interaction lock, and reduced-motion behavior unchanged.
- Do not add dependencies or image assets.
- Use a `900ms` card-only timeline that completes most displacement early and eases slowly into the target without particles or secondary effects.
- Shift the selected-card row down slightly by redistributing its vertical margins without changing its total footprint.
- Match the overlay terminal border, shadow, filter, position, and size to the picked card exactly.
- Validate `390x844`, `1280x800`, rapid input, reduced motion, and console errors.

---

### Task 1: Flight Geometry Contract

**Files:**
- Create: `src/games/tarot/tarotFanFlight.ts`
- Create: `src/games/tarot/tarotFanFlight.test.ts`

**Interfaces:**
- Produces: `createTarotFanFlight(sourceRect, targetRect, sourceAngle)` returning overlay bounds and animation keyframes.

- [ ] Write a failing test proving the first frame preserves the source rect and angle while the last frame matches the target center, size, and zero rotation.
- [ ] Run `npm test -- --run src/games/tarot/tarotFanFlight.test.ts` and confirm the missing helper failure.
- [ ] Implement the smallest deterministic geometry helper.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Overlay Flight Lifecycle

**Files:**
- Modify: `src/games/tarot/TarotFanStage.tsx`
- Modify: `src/games/tarot/TarotStages.test.tsx`

**Interfaces:**
- Consumes: `createTarotFanFlight`.
- Produces: one fixed overlay per active flight and one completion callback after a successful animation.

- [ ] Write failing component tests for measured source/target geometry, single completion, and cleanup after unmount.
- [ ] Run `npm test -- --run src/games/tarot/TarotStages.test.tsx` and confirm the new assertions fail.
- [ ] Add refs for fan cards and picked slots, create the overlay animation in an effect, and keep the original card layout stable.
- [ ] Re-run the component test and confirm it passes.

### Task 3: Layered Ritual Styling And Contract

**Files:**
- Modify: `src/games/tarot/tarotRitual.css`
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Modify: `docs/visual-baselines/tarot/timeline.md`
- Modify: `docs/visual-baselines/tarot/checkpoints.md`
- Modify: `docs/features/tarot.md`

**Interfaces:**
- Consumes: `.tarot-fan-flight` and `.tarot-fan__card--departing`.
- Produces: a card-only, fast-then-slow measured flight, documented `900ms` duration, and a slightly lower selected-card row.

- [ ] Write failing style-contract assertions for all effect layers, exact terminal card styling, and removal of `tarot-pick-smooth`.
- [ ] Run `npm test -- --run src/games/tarot/tarotRitualStyles.test.ts` and confirm the assertions fail.
- [ ] Implement the layered effect styles, exact terminal visual matching, and update the timeline, checkpoints, and feature flow.
- [ ] Run the three focused test files and confirm they pass.

### Task 4: Browser Acceptance

**Files:**
- No production files.

- [ ] Run the focused tests and TypeScript build.
- [ ] Start `npm run review`.
- [ ] Inspect `/dev/tarot?stage=fan` at `390x844` and `1280x800`.
- [ ] Check rapid input, reduced motion, and browser console errors.
- [ ] Provide the direct review URL and leave merge/deployment blocked pending user acceptance.

### Task 5: Responsive Picked And Fan Card Sizing

**Files:**
- Modify: `src/games/tarot/TarotFanStage.tsx`
- Modify: `src/games/tarot/tarotRitual.css`
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Modify: `docs/features/tarot.md`
- Modify: `docs/visual-baselines/tarot/checkpoints.md`

**Interfaces:**
- Consumes: `needCount` and the existing measured flight geometry.
- Produces: larger picked cards, smaller fan cards, and a five-card narrow-screen layout that stays inside the picked row.

- [ ] Add failing style and markup assertions for the picked-row count modifier, larger picked slots, smaller fan cards, and five-card narrow-screen overlap.
- [ ] Run `npm test -- --run src/games/tarot/tarotRitualStyles.test.ts` and confirm the new assertions fail.
- [ ] Add the count modifier and minimal responsive CSS without changing animation timing or state behavior.
- [ ] Re-run the focused tests and confirm they pass.
- [ ] Verify three-card and five-card layouts at narrow and desktop widths, then update the feature and checkpoint documentation.
