# Tarot Motion Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved B「紫雾回响」motion system so shuffle is wider and mystical, cut is a single clear upper-pile transfer, and three-card drawing is sequential from a visible lower deck anchor.

**Architecture:** Keep the existing React stage state and card selection model. Add only the interaction hooks and anchor markup needed by `TarotGame.tsx`; consolidate the active tarot motion rules into one final CSS block, using transform-only keyframes and a reduced-motion fallback. Extend the existing source-inspection style test to lock the behavior contract.

**Tech Stack:** React 19, TypeScript, CSS transforms/keyframes, Vitest, Vite.

---

### Task 1: Lock the motion contract with failing tests

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`

- [ ] **Step 1: Add failing assertions for B-style shuffle motion**

Add one test that requires the active rules to expose a `tarot-shuffle-mist` pseudo-element, a 2.15s loop, and wide pile transforms reaching at least `65px` while ending at zero.

```ts
  it('uses the purple-mist shuffle language with a wide, smooth loop', () => {
    expect(css).toContain('tarot-shuffle-deck:active::before')
    expect(css).toMatch(/animation:tarot-shuffle-mist \\.2\.15s|animation: tarot-shuffle-mist 2\.15s/)
    expect(css).toContain('@keyframes tarot-shuffle-mist')
    expect(css).toMatch(/@keyframes tarot-shuffle-pile-left[\\s\\S]*?translate3d\\(-?6[5-9]px/)
    expect(css).toMatch(/@keyframes tarot-shuffle-pile-right[\\s\\S]*?translate3d\\(\+?6[5-9]px/)
  })
```

- [ ] **Step 2: Add failing assertions for vertical cut transfer**

Add a test that requires the cut keyframes to be 0.9s, include the lift/over/land stages, and keep horizontal travel under 5px.

```ts
  it('moves the upper cut pile over the lower pile on one smooth vertical arc', () => {
    expect(css).toContain('animation:tarot-cut-upper .9s')
    expect(css).toContain('animation:tarot-cut-lower .9s')
    expect(css).toMatch(/@keyframes tarot-cut-upper[\\s\\S]*?translate3d\\(0,-36px/)
    expect(css).toMatch(/@keyframes tarot-cut-upper[\\s\\S]*?translate3d\\(4px,-24px/)
    expect(css).not.toMatch(/@keyframes tarot-cut-upper[\\s\\S]*?translate3d\\([5-9][0-9]px/)
  })
```

- [ ] **Step 3: Add failing assertions for the lower draw anchor and sequential draw**

Require a named lower anchor in JSX, `pointercancel` cleanup, and the longer vertical flight plus visibly wider three-card gap.

```ts
  it('draws each selected card upward from a visible lower deck anchor', () => {
    expect(game).toContain('tarot-fan__deck-anchor')
    expect(game).toContain('onPointerCancel={handleShuffleUp}')
    expect(css).toContain('@keyframes tarot-pick-from-deck')
    expect(css).toMatch(/animation:tarot-pick-from-deck \.55s/)
    expect(css).toMatch(/\.tarot-picked-row\\s*\\{[^}]*gap:clamp\\(18px,6vw,34px\\)/s)
  })
```

- [ ] **Step 4: Run the focused test and verify it fails for missing contract**

Run `node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts` (or the bundled Node executable if the shell does not expose `node`). Expected result: the new tests fail because the named mist/anchor/keyframe rules do not yet exist.

### Task 2: Implement the React interaction hooks and anchor

**Files:**
- Modify: `src/games/tarot/TarotGame.tsx`

- [ ] **Step 1: Add pointer cancellation to the shuffle button**

Add `onPointerCancel={handleShuffleUp}` beside the existing pointer-up and pointer-leave handlers so a cancelled touch cannot leave the interval running.

- [ ] **Step 2: Add the lower deck anchor inside the fan stage**

Insert the anchor immediately before `.tarot-fan` so it is visually below the selectable fan and can be styled as the source deck.

```tsx
          <div className="tarot-fan__deck-anchor" aria-hidden="true">
            <span className="tarot-fan__deck-anchor-card" />
          </div>
          <div className="tarot-fan">
```

- [ ] **Step 3: Keep the existing sequential lock**

Preserve `if (flyingCard !== null || picked.includes(index) || picked.length >= needCount) return`, `disabled={... flyingCard !== null}`, and `onAnimationEnd={() => finishPick(index)}`. Do not add a second selection queue; one completed animation must remain the gate for the next card.

### Task 3: Replace the active CSS motion rules

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the active shuffle block**

In the active block after the legacy `@supports` section, define the ten slots as the wide resting fan, then animate the card children in two groups. Use a 2.15s loop and a separate mist keyframe.

```css
.tarot-shuffle-deck:active::before { animation:tarot-shuffle-mist 2.15s ease-in-out infinite; }
.tarot-shuffle-deck:active .tarot-shuffle-deck__slot:nth-child(-n+5) .tarot-shuffle-deck__card { animation:tarot-shuffle-pile-left 2.15s cubic-bezier(.32,.02,.22,1) infinite; }
.tarot-shuffle-deck:active .tarot-shuffle-deck__slot:nth-child(n+6) .tarot-shuffle-deck__card { animation:tarot-shuffle-pile-right 2.15s cubic-bezier(.32,.02,.22,1) infinite; }
@keyframes tarot-shuffle-pile-left { 0%,100% { transform:translate3d(0,0,0); } 42% { transform:translate3d(68px,-20px,22px) rotate(-10deg); filter:drop-shadow(0 0 10px rgba(158,87,230,.5)); } 72% { transform:translate3d(12px,-2px,8px) rotate(2deg); } }
@keyframes tarot-shuffle-pile-right { 0%,100% { transform:translate3d(0,0,0); } 42% { transform:translate3d(-68px,-20px,22px) rotate(10deg); filter:drop-shadow(0 0 10px rgba(158,87,230,.5)); } 72% { transform:translate3d(-12px,-2px,8px) rotate(-2deg); } }
@keyframes tarot-shuffle-mist { 0%,100% { opacity:.38; transform:scale(.86); } 50% { opacity:.9; transform:scale(1.08); } }
```

- [ ] **Step 2: Replace the active cut block**

Keep both piles stacked at rest. Use 0.9s rules with only 4px horizontal curve and no z-index changes inside keyframes.

```css
.tarot-cut-deck--cutting:not(.tarot-cut-deck--swapped) .tarot-cut-deck__left,
.tarot-cut-deck--cutting.tarot-cut-deck--swapped .tarot-cut-deck__right { animation:tarot-cut-upper .9s cubic-bezier(.28,.72,.22,1) both; }
.tarot-cut-deck--cutting:not(.tarot-cut-deck--swapped) .tarot-cut-deck__right,
.tarot-cut-deck--cutting.tarot-cut-deck--swapped .tarot-cut-deck__left { animation:tarot-cut-lower .9s cubic-bezier(.28,.72,.22,1) both; }
@keyframes tarot-cut-upper { 0% { transform:translate3d(0,0,0); } 28% { transform:translate3d(0,-36px,18px); } 58% { transform:translate3d(4px,-24px,22px); } 82% { transform:translate3d(2px,8px,8px); } 100% { transform:translate3d(0,8px,2px); } }
@keyframes tarot-cut-upper-reverse { 0% { transform:translate3d(0,0,0); } 28% { transform:translate3d(0,-36px,18px); } 58% { transform:translate3d(-4px,-24px,22px); } 82% { transform:translate3d(-2px,8px,8px); } 100% { transform:translate3d(0,8px,2px); } }
@keyframes tarot-cut-lower { 0%,58% { transform:translate3d(0,8px,0); } 82% { transform:translate3d(0,3px,8px); } 100% { transform:translate3d(0,0,12px); } }
```

- [ ] **Step 3: Add the visible lower draw anchor and replace flight animation**

Style the anchor as a centered card stack below the fan, then animate `.tarot-fan__visual` through the anchor before rising to the picked row.

```css
.tarot-fan__deck-anchor { position:relative; z-index:2; width:86px; height:30px; margin:-18px auto 0; }
.tarot-fan__deck-anchor-card { position:absolute; inset:0 8px; border:1px solid rgba(218,184,105,.58); border-radius:8px; background:url('/tarot/ui/card-back.jpg') center/cover; box-shadow:0 8px 15px rgba(0,0,0,.38),0 0 12px rgba(158,87,230,.2); }
.tarot-fan__deck-anchor-card::before,.tarot-fan__deck-anchor-card::after { content:''; position:absolute; inset:3px -4px -3px 4px; border:1px solid rgba(218,184,105,.32); border-radius:7px; background:inherit; z-index:-1; }
.tarot-fan__card--flying .tarot-fan__visual { animation:tarot-pick-from-deck .55s cubic-bezier(.24,.78,.18,1) both; }
@keyframes tarot-pick-from-deck { 0% { transform:translate3d(0,0,0) scale(1); opacity:1; } 20% { transform:translate3d(0,48px,24px) scale(.96); opacity:1; } 52% { transform:translate3d(0,-54px,34px) scale(1.05); opacity:1; filter:drop-shadow(0 0 12px rgba(158,87,230,.58)); } 78% { transform:translate3d(0,-156px,20px) scale(1.08); opacity:.9; } 100% { transform:translate3d(0,-210px,0) scale(1.04); opacity:.12; filter:none; } }
```

- [ ] **Step 4: Increase the three-card spacing and add reduced-motion rules**

Use `gap:clamp(18px,6vw,34px)` for the picked row, lower it only to 14px below 380px, and set all new loops to `.01ms` with no repeated iteration under reduced motion.

### Task 4: Verify and review

**Files:**
- Verify: `src/games/tarot/TarotGame.tsx`
- Verify: `src/styles.css`
- Verify: `src/games/tarot/tarotRitualStyles.test.ts`

- [ ] **Step 1: Run the focused style test**

Run `node_modules/.bin/vitest.cmd --run src/games/tarot/tarotRitualStyles.test.ts`. Expected: all ritual assertions pass.

- [ ] **Step 2: Run the full frontend test suite**

Run `node_modules/.bin/vitest.cmd --run`. Expected: zero failed tests.

- [ ] **Step 3: Run TypeScript and Vite builds**

Run `node_modules/.bin/tsc.cmd -b` and `node_modules/.bin/vite.cmd build`. Expected: both exit with code 0.

- [ ] **Step 4: Inspect the final diff and report any runtime limitation**

Run `git diff --check` and `git status --short`. Confirm only the approved motion files changed beyond existing user files. If Node remains unavailable, report the exact command failure instead of claiming tests passed.
