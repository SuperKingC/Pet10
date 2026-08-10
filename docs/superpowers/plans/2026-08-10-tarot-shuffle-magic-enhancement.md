# Tarot Shuffle Magic Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the tarot shuffle trajectory and add a layered ritual circle, stardust, and restrained gold trace without changing shuffle progress, card count, or later tarot stages.

**Architecture:** Keep the existing React shuffle state and ten-card slot structure. Add one fixed, aria-hidden aura subtree to `TarotGame.tsx`, then update only the final active shuffle CSS block so it wins over the legacy rules already present in `styles.css`; source-inspection tests lock the JSX structure, CSS variables, keyframes, narrow-screen fallback, and reduced-motion behavior.

**Tech Stack:** React 19, TypeScript, CSS transforms/keyframes, Vitest, Vite.

---

## File map

- `src/games/tarot/TarotGame.tsx`: renders the fixed, non-interactive aura layers inside the existing shuffle button. It does not gain new state or timers.
- `src/styles.css`: owns the final effective shuffle geometry, interleave path, orbit/stardust/gold animations, responsive variables, and reduced-motion overrides.
- `src/games/tarot/tarotRitualStyles.test.ts`: verifies the source-level motion contract without depending on screenshot timing.

### Task 1: Lock the expanded trajectory with a failing test

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Update the existing shuffle contract test**

In `starts as a neat stack and interleaves cards during the purple-mist shuffle`, keep the assertions for ten slots, the 360px movement container, the clean resting stack, odd/even groups, and staggered delay. Replace the old 68px/28px/24px assertions with:

```ts
expect(css).toMatch(/\.tarot-shuffle-deck\s*\{[^}]*--shuffle-x:\s*92px;[^}]*--shuffle-y:\s*-34px;[^}]*--shuffle-z:\s*28px;/s)
expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot:nth-child\(odd\)[^{]*\{[^}]*animation:tarot-shuffle-interleave-left 2\.4s/s)
expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot:nth-child\(even\)[^{]*\{[^}]*animation:tarot-shuffle-interleave-right 2\.4s/s)
expect(css).toMatch(/@keyframes tarot-shuffle-interleave-left[\s\S]*?translate3d\(calc\(var\(--shuffle-x\) \* -1\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
expect(css).toMatch(/@keyframes tarot-shuffle-interleave-right[\s\S]*?translate3d\(var\(--shuffle-x\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run `node_modules\.bin\vitest.cmd --run src\games\tarot\tarotRitualStyles.test.ts`.

Expected: the shuffle test fails because the final CSS still uses the 2.15s loop and literal 68px/28px/24px transforms and does not define the three trajectory variables.

- [ ] **Step 3: Add responsive trajectory variables to the final active shuffle block**

Update the last effective `.tarot-shuffle-deck` rule in `src/styles.css` so it starts with these properties while preserving its existing positioning, touch behavior, and entry animation:

```css
.tarot-shuffle-deck {
  --shuffle-x:92px;
  --shuffle-y:-34px;
  --shuffle-z:28px;
  position:relative;
  width:min(92vw,360px);
  height:280px;
  margin:8px 0 0;
  border:0;
  background:transparent;
  overflow:visible;
  touch-action:none;
  perspective:1000px;
  transform-style:preserve-3d;
  animation:tarot-deck-arrive .75s cubic-bezier(.2,.8,.2,1) both;
}
```

- [ ] **Step 4: Replace only the final interleave selectors and keyframes**

Keep the slot/card resting styles and negative delays. Change the two active selectors to a 2.4s loop and replace the final keyframes with:

```css
.tarot-shuffle-deck:active .tarot-shuffle-deck__slot:nth-child(odd) .tarot-shuffle-deck__card {
  animation:tarot-shuffle-interleave-left 2.4s cubic-bezier(.28,.72,.22,1) infinite;
}
.tarot-shuffle-deck:active .tarot-shuffle-deck__slot:nth-child(even) .tarot-shuffle-deck__card {
  animation:tarot-shuffle-interleave-right 2.4s cubic-bezier(.28,.72,.22,1) infinite;
}
@keyframes tarot-shuffle-interleave-left {
  0%,100% { transform:translate3d(0,0,0) rotate(0deg); }
  22% { transform:translate3d(-36px,-10px,14px) rotate(-5deg); }
  48% { transform:translate3d(calc(var(--shuffle-x) * -1),var(--shuffle-y),var(--shuffle-z)) rotate(-13deg); }
  74% { transform:translate3d(38px,16px,16px) rotate(7deg); }
}
@keyframes tarot-shuffle-interleave-right {
  0%,100% { transform:translate3d(0,0,0) rotate(0deg); }
  22% { transform:translate3d(36px,-10px,14px) rotate(5deg); }
  48% { transform:translate3d(var(--shuffle-x),var(--shuffle-y),var(--shuffle-z)) rotate(13deg); }
  74% { transform:translate3d(-38px,16px,16px) rotate(-7deg); }
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the same focused Vitest command. Expected: the expanded trajectory test passes.

### Task 2: Add the ritual-circle, stardust, and gold-trace layers

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Modify: `src/games/tarot/TarotGame.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write a failing structure-and-animation test**

Add after the shuffle contract test:

```ts
it('surrounds the shuffle with two ritual orbits, stardust, and one gold trace', () => {
  expect(game).toContain('<span className="tarot-shuffle-deck__aura" aria-hidden="true">')
  expect(game).toContain('tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--outer')
  expect(game).toContain('tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--inner')
  expect(game).toContain('tarot-shuffle-deck__stardust')
  expect(game).toContain('tarot-shuffle-deck__gold-trace')
  expect(css).toContain('@keyframes tarot-shuffle-orbit-outer')
  expect(css).toContain('@keyframes tarot-shuffle-orbit-inner')
  expect(css).toContain('@keyframes tarot-shuffle-stardust')
  expect(css).toContain('@keyframes tarot-shuffle-gold-trace')
  expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__orbit--outer\s*\{[^}]*animation:tarot-shuffle-orbit-outer 8s linear infinite/s)
  expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__orbit--inner\s*\{[^}]*animation:tarot-shuffle-orbit-inner 11s linear infinite/s)
  expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__gold-trace\s*\{[^}]*animation:tarot-shuffle-gold-trace 2\.4s/s)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the focused Vitest command. Expected: the new test fails because the aura JSX and four named keyframes do not exist.

- [ ] **Step 3: Add the fixed aria-hidden aura subtree**

Inside the existing `.tarot-shuffle-deck` button, immediately before `Array.from({ length: 10 }, ...)`, insert:

```tsx
<span className="tarot-shuffle-deck__aura" aria-hidden="true">
  <i className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--outer" />
  <i className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--inner" />
  <i className="tarot-shuffle-deck__stardust" />
  <i className="tarot-shuffle-deck__gold-trace" />
</span>
```

Do not add state, refs, event handlers, or dynamic particle creation.

- [ ] **Step 4: Add the static aura geometry after the final shuffle card rule**

Add these selectors to the final active shuffle block:

```css
.tarot-shuffle-deck__aura{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.5;transition:opacity .24s ease}
.tarot-shuffle-deck__orbit,.tarot-shuffle-deck__stardust,.tarot-shuffle-deck__gold-trace{position:absolute;left:50%;top:50%;display:block;pointer-events:none;will-change:transform,opacity}
.tarot-shuffle-deck__orbit{border-radius:50%}
.tarot-shuffle-deck__orbit--outer{width:276px;aspect-ratio:1;border:1px solid rgba(212,178,100,.48);background:repeating-conic-gradient(from 9deg,rgba(196,151,255,.32) 0 2deg,transparent 2deg 22.5deg);box-shadow:0 0 34px rgba(152,91,222,.2),inset 0 0 28px rgba(218,184,105,.12);transform:translate(-50%,-50%)}
.tarot-shuffle-deck__orbit--inner{width:198px;aspect-ratio:1;border:1px solid rgba(181,131,238,.4);background:repeating-conic-gradient(from 0deg,rgba(222,192,117,.28) 0 1.5deg,transparent 1.5deg 30deg);box-shadow:0 0 20px rgba(171,111,239,.2);transform:translate(-50%,-50%) rotate(15deg)}
.tarot-shuffle-deck__stardust{width:300px;height:220px;background:radial-gradient(circle at 10% 48%,rgba(235,211,142,.9) 0 1px,transparent 2px),radial-gradient(circle at 22% 18%,rgba(191,149,255,.85) 0 1.5px,transparent 2.5px),radial-gradient(circle at 36% 83%,rgba(235,211,142,.75) 0 1px,transparent 2px),radial-gradient(circle at 62% 12%,rgba(191,149,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 78% 78%,rgba(235,211,142,.85) 0 1.5px,transparent 2.5px),radial-gradient(circle at 91% 42%,rgba(191,149,255,.88) 0 1px,transparent 2px);transform:translate(-50%,-50%);opacity:.46}
.tarot-shuffle-deck__gold-trace{width:262px;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 210deg,transparent 0 72%,rgba(235,207,128,.72) 78%,transparent 84% 100%);mask:radial-gradient(circle,transparent 0 68%,#000 70% 72%,transparent 74%);-webkit-mask:radial-gradient(circle,transparent 0 68%,#000 70% 72%,transparent 74%);transform:translate(-50%,-50%) rotate(-42deg);opacity:0}
.tarot-shuffle-deck__slot{z-index:2}
.tarot-shuffle-deck:active .tarot-shuffle-deck__aura{opacity:1}
```

- [ ] **Step 5: Add transform-only active animations and keyframes**

Add:

```css
.tarot-shuffle-deck:active .tarot-shuffle-deck__orbit--outer{animation:tarot-shuffle-orbit-outer 8s linear infinite}
.tarot-shuffle-deck:active .tarot-shuffle-deck__orbit--inner{animation:tarot-shuffle-orbit-inner 11s linear infinite}
.tarot-shuffle-deck:active .tarot-shuffle-deck__stardust{animation:tarot-shuffle-stardust 2.4s ease-in-out infinite}
.tarot-shuffle-deck:active .tarot-shuffle-deck__gold-trace{animation:tarot-shuffle-gold-trace 2.4s cubic-bezier(.28,.72,.22,1) infinite}
@keyframes tarot-shuffle-orbit-outer{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes tarot-shuffle-orbit-inner{from{transform:translate(-50%,-50%) rotate(15deg)}to{transform:translate(-50%,-50%) rotate(-345deg)}}
@keyframes tarot-shuffle-stardust{0%,100%{opacity:.34;transform:translate(-50%,-50%) scale(.94)}48%{opacity:.9;transform:translate(-50%,-52%) scale(1.04)}}
@keyframes tarot-shuffle-gold-trace{0%,24%{opacity:0;transform:translate(-50%,-50%) rotate(-42deg) scale(.94)}46%{opacity:.82;transform:translate(-50%,-50%) rotate(8deg) scale(1.02)}68%,100%{opacity:0;transform:translate(-50%,-50%) rotate(62deg) scale(1.05)}}
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run the focused Vitest command. Expected: the expanded trajectory and aura-layer tests pass.

### Task 3: Lock narrow-screen and reduced-motion fallbacks

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing fallback test**

Add:

```ts
it('scales the shuffle path on narrow screens and freezes decoration for reduced motion', () => {
  expect(css).toMatch(/@media\(max-width:380px\)\{[\s\S]*?\.tarot-shuffle-deck\{--shuffle-x:72px;--shuffle-y:-28px;--shuffle-z:22px;\}/s)
  expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.tarot-shuffle-deck:active \.tarot-shuffle-deck__orbit,[\s\S]*?\.tarot-shuffle-deck:active \.tarot-shuffle-deck__stardust,[\s\S]*?\.tarot-shuffle-deck:active \.tarot-shuffle-deck__gold-trace\{animation:none!important;\}/s)
  expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.tarot-shuffle-deck:active \.tarot-shuffle-deck__card,[\s\S]*?animation:none!important;/s)
  expect(game).toContain('onPointerCancel={handleShuffleUp}')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the focused Vitest command. Expected: the test fails because the narrow-screen variables and explicit aura reduced-motion rule do not exist.

- [ ] **Step 3: Add the narrow-screen variables**

Extend the final `@media(max-width:380px)` block with:

```css
.tarot-shuffle-deck{--shuffle-x:72px;--shuffle-y:-28px;--shuffle-z:22px;}
```

Keep `width:min(92vw,360px)` so the container remains within a 320px viewport.

- [ ] **Step 4: Extend the final reduced-motion rule**

Inside the final `@media(prefers-reduced-motion:reduce)` block, preserve the existing cut, draw, and card fallbacks and use:

```css
.tarot-shuffle-deck:active .tarot-shuffle-deck__card,
.tarot-shuffle-deck:active .tarot-shuffle-deck__orbit,
.tarot-shuffle-deck:active .tarot-shuffle-deck__stardust,
.tarot-shuffle-deck:active .tarot-shuffle-deck__gold-trace{animation:none!important}
```

Leave the aura at its static opacity so long press still has a visible, non-moving ritual response.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the focused Vitest command. Expected: all tarot ritual style tests pass.

### Task 4: Verify behavior and repository boundaries

**Files:**
- Verify: `src/games/tarot/TarotGame.tsx`
- Verify: `src/styles.css`
- Verify: `src/games/tarot/tarotRitualStyles.test.ts`

- [ ] **Step 1: Run the full frontend test suite**

Run `npm test -- --run`.

Expected: zero failed tests.

- [ ] **Step 2: Run the TypeScript and Vite build**

Run `npm run build`.

Expected: `tsc -b` and `vite build` both exit with code 0.

- [ ] **Step 3: Check formatting and the exact diff**

Run `git diff --check`, then `git diff -- src/games/tarot/TarotGame.tsx src/styles.css src/games/tarot/tarotRitualStyles.test.ts`, then `git status --short`.

Expected: no whitespace errors; the task diff is limited to the aura JSX, final shuffle CSS, and shuffle-related tests. Existing unrelated user changes remain present and untouched.

- [ ] **Step 4: Inspect narrow and regular mobile layouts**

Run the app and inspect the shuffle stage at 320px and 390px viewport widths. Hold and release the deck once at each width and verify: no horizontal scrollbar, no overlap with title/progress/button, the card-back center remains readable, the aura does not receive focus, and release returns the deck to rest.

- [ ] **Step 5: Inspect reduced motion**

Emulate `prefers-reduced-motion: reduce`, long-press the deck, and verify progress still advances while cards, both orbits, stardust, and gold trace stay static.

- [ ] **Step 6: Create a focused implementation commit only if requested**

Stage only the three implementation files after checking the index with `git diff --cached --name-only`. Do not stage unrelated dirty files. Use:

```powershell
git add -- src/games/tarot/TarotGame.tsx src/styles.css src/games/tarot/tarotRitualStyles.test.ts
git commit -m "feat: enrich tarot shuffle ritual"
```
