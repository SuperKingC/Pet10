# Tarot Standard Table Cut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tarot cut-stage CSS exchange with a smooth, centered standard-table-cut animation in which two visible piles continuously exchange top and bottom positions.

**Architecture:** Put all deterministic motion math in a pure `tarotCutMotion` module. `TarotCutStage` owns one `requestAnimationFrame` lifecycle, applies the calculated transform/filter/opacity values to the two existing pile spans and calls the existing flow completion callback at the configured duration. CSS retains card thickness, perspective, static rest poses, and reduced-motion styling only.

**Tech Stack:** React 19, TypeScript, CSS 3D transforms, Vitest, Vite.

## Global Constraints

- Use one request-animation-frame clock for both piles and the deck shadow.
- Animate only `transform`, `filter`, `opacity`, and stacking order.
- Use a centered 1350ms cut duration; mobile horizontal travel is shorter.
- The moving pile must end near `Y = -5px` and behind the new top pile in Z depth.
- The stationary lower pile must visibly rise to approximately `Y = -13px`.
- Keep existing tarot-flow tokens, cut lockout, and reduced-motion completion behavior.
- Do not change shuffle, fan selection, reveal, card data, or reading behavior.

---

### Task 1: Add Testable Cut-Trajectory Math

**Files:**
- Create: `src/games/tarot/tarotCutMotion.ts`
- Create: `src/games/tarot/tarotCutMotion.test.ts`

**Interfaces:**
- Produces `getTarotCutFrame(progress: number, compact: boolean): TarotCutFrame`.
- `TarotCutFrame` contains upper/lower pile transform primitives and shadow primitives consumed by `TarotCutStage`.
- Exposes `TAROT_CUT_DURATION_MS = 1350`.

- [ ] **Step 1: Write the failing trajectory tests**

Add tests for:

```ts
expect(getTarotCutFrame(0, false).upper).toMatchObject({ x: 0, y: 0, z: 0 })
expect(getTarotCutFrame(1, false).upper.y).toBeCloseTo(-5)
expect(getTarotCutFrame(1, false).upper.z).toBeLessThan(0)
expect(getTarotCutFrame(1, false).lower.y).toBeCloseTo(-13)
expect(getTarotCutFrame(1, false).lower.z).toBeGreaterThan(0)
expect(getTarotCutFrame(.5, false).upper.x).toBeGreaterThan(80)
expect(getTarotCutFrame(.5, true).upper.x).toBeLessThan(getTarotCutFrame(.5, false).upper.x)
```

Add a continuity test that samples the full interval in small increments and verifies that upper/lower coordinates do not jump more than a bounded per-step distance.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/tarotCutMotion.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal pure trajectory module**

Implement:

- A clamped progress helper.
- A quintic smoother-step helper.
- Independent continuous outward and inward curves for upper-pile horizontal travel.
- A sine-based lift curve and a smooth landing curve for upper-pile Y/Z/rotation.
- A delayed smoother-step curve for the lower pile to rise into the new top position.
- A derived shadow position, scale, and opacity.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/tarotCutMotion.test.ts
```

Expected: PASS.

### Task 2: Drive the Cut Stage From One Frame Clock

**Files:**
- Modify: `src/games/tarot/TarotCutStage.tsx`
- Modify: `src/games/tarot/TarotStages.test.tsx`

**Interfaces:**
- Consumes `TAROT_CUT_DURATION_MS` and `getTarotCutFrame`.
- Continues consuming `cutting`, `swapped`, `onStartCut`, `onFinishCut`, and `onContinue`.
- Produces exactly one completion callback for each active cut.

- [ ] **Step 1: Write the failing stage test**

Add a source/render test that requires:

- Two pile elements with stable refs.
- A shadow element.
- A request-animation-frame lifecycle that calls `getTarotCutFrame`.
- Cleanup that cancels an active frame.
- Completion through `onFinishCut` with the current upper-pile animation name.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/TarotStages.test.tsx
```

Expected: FAIL because the stage still relies on `onAnimationEnd`.

- [ ] **Step 3: Implement the RAF lifecycle**

Replace CSS animation-end handling with:

- Refs for left pile, right pile, and shadow.
- An effect that starts only while `cutting` is true.
- A start timestamp and per-frame elapsed progress calculation.
- Style updates from the pure frame module.
- Completion once elapsed time reaches `TAROT_CUT_DURATION_MS`.
- Cleanup on re-render/unmount.

Keep `swapped` by assigning which DOM pile receives the upper/lower visual frame. Complete with `tarot-cut-upper` for normal order and `tarot-cut-upper-reverse` for swapped order.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/TarotStages.test.tsx
```

Expected: PASS.

### Task 3: Consolidate Static 3D Cut Styling

**Files:**
- Modify: `src/games/tarot/tarotRitual.css`
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`

**Interfaces:**
- CSS supplies baseline transforms and card-edge pseudo-elements.
- Runtime frame styles override only composited visual properties while cutting.

- [ ] **Step 1: Write the failing style assertions**

Require:

- Centered cut-deck perspective and `preserve-3d`.
- Explicit `tarot-cut-deck__shadow` styling.
- Visible `::before` and `::after` pile thickness layers.
- Static swapped/rest positions matching the motion module’s final visual relationship.
- No active `tarot-cut-upper`, `tarot-cut-upper-reverse`, or `tarot-cut-lower` keyframe rules.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts
```

Expected: FAIL because the legacy CSS keyframes remain.

- [ ] **Step 3: Replace legacy cut animation rules**

- Remove cut-specific `animation` declarations and upper/lower keyframes.
- Retain the 3D deck/container and pseudo-element thickness styling.
- Add shadow styling and reset-safe static pile styles.
- Preserve reduced-motion transition suppression without relying on CSS cut animations.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts
```

Expected: PASS.

### Task 4: Verify End-to-End Behavior

**Files:**
- Verify: `src/games/tarot/tarotCutMotion.test.ts`
- Verify: `src/games/tarot/TarotStages.test.tsx`
- Verify: `src/games/tarot/tarotRitualStyles.test.ts`
- Verify: `src/games/tarot/tarotFlow.test.ts`

- [ ] **Step 1: Run tarot-focused tests**

Run:

```powershell
node_modules/.bin/vitest.cmd --run src/games/tarot
```

Expected: PASS.

- [ ] **Step 2: Run all frontend tests and production build**

Run:

```powershell
node_modules/.bin/vitest.cmd --run
node_modules/.bin/tsc.cmd -b
node_modules/.bin/vite.cmd build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Inspect the local browser result**

Run the local development server, reach the tarot cut stage, and inspect a normal and alternating cut at desktop and mobile widths. Confirm centered composition, a continuous path, the lower pile’s visible upward move, and the upper pile’s higher final location.

- [ ] **Step 4: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and only the planned tarot files plus the approved docs change.
