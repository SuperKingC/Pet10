# Tarot Card Image Sharpness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一塔罗正反面卡牌在静态与变换场景中的图像渲染策略，减少旋转和缩放时的软化感。

**Architecture:** 保持塔罗状态机和动画模型不变，只在 `tarotRitual.css` 建立卡牌图像质量契约。通过去除扇形静态内层的预合成提示、量化可控位移，以及将规则覆盖到牌阵预览、牌背背景与正面图片，实现跨阶段一致性。

**Tech Stack:** React 19、TypeScript、CSS、Vitest。

## Global Constraints

- 仅处理塔罗图像清晰度；不得改变状态机、网络资源、动画时长或交互契约。
- CSS 继续集中在 `src/games/tarot/tarotRitual.css`。
- 更新视觉基线与功能文档，并以 `fan` 直接验收页复核。

---

### Task 1: Lock the rendering contract with tests

**Files:**
- Modify: `src/games/tarot/tarotRitualStyles.test.ts`

**Interfaces:**
- Consumes: `src/games/tarot/tarotRitual.css`
- Produces: CSS regression assertions for all card-back and card-art selectors.

- [ ] **Step 1: Write failing style assertions**
- [ ] **Step 2: Run `npm test -- --run src/games/tarot/tarotRitualStyles.test.ts` and verify failure**
- [ ] **Step 3: Commit**

### Task 2: Apply unified rendering and stable fan positioning

**Files:**
- Modify: `src/games/tarot/TarotFanStage.tsx`
- Modify: `src/games/tarot/tarotRitual.css`

**Interfaces:**
- Consumes: the existing CSS variable contract `--fan-x`, `--fan-angle`, and `--fan-drop`.
- Produces: integer-pixel fan offsets and common visual rendering rules without changing the `TarotFanFlight` API.

- [ ] **Step 1: Update fan offset calculation and shared CSS selectors**
- [ ] **Step 2: Run the focused style and stage tests**
- [ ] **Step 3: Commit**

### Task 3: Update visual acceptance documentation

**Files:**
- Modify: `docs/features/tarot.md`
- Modify: `docs/visual-baselines/tarot/acceptance-criteria.md`

**Interfaces:**
- Consumes: the unified card image quality contract.
- Produces: explicit clarity acceptance criteria for all card rendering stages.

- [ ] **Step 1: Update feature behavior and visual acceptance criteria**
- [ ] **Step 2: Run `npm run check:docs` and `npm run check:assets`**
- [ ] **Step 3: Commit**

### Task 4: Verify the visual change

**Files:**
- No code changes expected.

**Interfaces:**
- Consumes: the review server and `/dev/tarot?stage=fan`.
- Produces: mobile and desktop visual review results.

- [ ] **Step 1: Run focused tests and `npm run build`**
- [ ] **Step 2: Start `npm run review`**
- [ ] **Step 3: Check `fan`, `cut`, `shuffle`, `reveal`, and `reading` at required viewports**
- [ ] **Step 4: Check reduced motion, rapid input, and console errors**
