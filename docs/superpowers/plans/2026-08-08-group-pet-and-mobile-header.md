# Group Pet Replies And Mobile Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Xiaoduoli responsive and occasionally proactive in pair rooms while fixing mobile safe-area gaps and tinted pet avatars.

**Architecture:** Add process-local batching and activity timers to the existing server-side `petBrain`; continue delivering generated messages through the current repository and Socket paths. Apply focused CSS and class changes to the existing frontend surfaces.

**Tech Stack:** TypeScript, Node.js timers, Vitest fake timers, React, CSS safe-area environment variables.

---

### Task 1: Lock Pair-Room Behavior With Tests

**Files:**
- Create: `server/src/services/petBrain.test.ts`

- [ ] Add fake-timer tests proving that messages inside 1.5 seconds produce one reply, disabled proactive mode produces none, in-flight messages produce a later second reply, and active rooms receive a 10-20 minute proactive message.
- [ ] Run `npm run test --workspace server -- petBrain.test.ts` and verify the new tests fail because pair-room batching is not implemented.

### Task 2: Implement Pair-Room Scheduling

**Files:**
- Modify: `server/src/services/petBrain.ts`

- [ ] Add per-room debounce, in-flight, queued, activity, and chatter state.
- [ ] Re-read recent messages when a batch is flushed and use the existing `speak` path.
- [ ] Schedule randomized 10-20 minute chatter only while the room has activity in the last 45 minutes.
- [ ] Run the focused server tests and confirm they pass.

### Task 3: Fix Safe Areas And Pet Image Compositing

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/ChatView.tsx`
- Modify: `src/components/ConversationList.tsx`
- Modify: `src/components/FeedScreen.tsx`

- [ ] Remove multiply blending from transparent Xiaoduoli assets.
- [ ] Mark pet-specific avatar containers and give them transparent backgrounds plus contained image sizing.
- [ ] Make sticky and full-screen header surfaces opaque and ensure every top-level screen paints through `env(safe-area-inset-top)`.

### Task 4: Verify The Complete Change

**Files:**
- Verify all modified files.

- [ ] Run all frontend and server tests.
- [ ] Run frontend and server production builds.
- [ ] Inspect mobile-size local rendering for safe-area coverage and untinted avatars.
- [ ] Run `git diff --check` and review the final diff for unrelated changes.
