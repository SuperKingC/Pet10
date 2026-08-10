# Tarot Ritual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved moon-gate celestial sanctuary tarot flow with illustrated assets, ritual interactions, readable reversals, and detailed structured readings.

**Architecture:** Keep drawing and reading rules as pure functions in `tarotDeck.ts`, isolate card and spread rendering into focused React components, and let `TarotGame.tsx` orchestrate stages. Extend the existing asset manifest and preloader with a generated background and card back.

**Tech Stack:** React 19, TypeScript, CSS 3D transforms, Vitest, Vite, OpenAI-compatible image generation proxy.

---

### Task 1: Structured reading model

**Files:**
- Modify: `src/games/tarot/tarotDeck.ts`
- Modify: `src/games/tarot/tarotDeck.test.ts`

- [ ] Write failing tests for category-free questions, seven-part card analysis, 24-hour action, seven-day signal, and misreading cautions.
- [ ] Run the focused test and confirm it fails for missing fields.
- [ ] Implement deterministic reading builders from question, spread, position, orientation, keywords, and meanings.
- [ ] Run focused tests and confirm they pass.

### Task 2: Card and spread components

**Files:**
- Create: `src/games/tarot/TarotCard.tsx`
- Create: `src/games/tarot/TarotSpreadPicker.tsx`
- Create: `src/games/tarot/TarotCard.test.tsx`
- Modify: `src/games/tarot/TarotGame.tsx`

- [ ] Write a failing rendering test proving reversed artwork rotates while labels remain upright.
- [ ] Run the focused test and confirm it fails before the component exists.
- [ ] Implement the card component and altar-style single/triple spread picker.
- [ ] Remove question-category controls and integrate the components.
- [ ] Run focused component tests.

### Task 3: Sanctuary assets

**Files:**
- Modify: `src/games/tarot/tarotAssets.ts`
- Modify: `src/games/tarot/tarotAssets.test.ts`
- Create: `public/tarot/ui/sanctuary-background.jpg`
- Create: `public/tarot/ui/card-back.jpg`

- [ ] Extend the asset test to require background and card back.
- [ ] Run it and confirm failure.
- [ ] Generate hand-painted source assets with the selected image model and save optimized JPEGs.
- [ ] Add both assets to the manifest and preloader.
- [ ] Run the asset tests.

### Task 4: Ritual styling and motion

**Files:**
- Modify: `src/styles.css`

- [ ] Apply the sanctuary background and altar surfaces.
- [ ] Use the illustrated card back for shuffle, cut, fan, and unrevealed cards.
- [ ] Add deck arrival, interleaving shuffle, cut lift/drop, staggered fan, card selection, reveal light, and reduced-motion rules.
- [ ] Keep all overlays readable at 360px width.

### Task 5: Verification

**Files:**
- Verify all modified files and generated resources.

- [ ] Run all frontend tests.
- [ ] Run TypeScript project compilation.
- [ ] Run the Vite production build.
- [ ] Confirm all 22 card images plus background and card back are present and non-empty.
- [ ] Inspect the local browser flow and fix visible regressions.

