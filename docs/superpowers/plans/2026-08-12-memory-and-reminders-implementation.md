# Memory and Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make important memories deterministic and add persistent natural-language reminder tasks that execute without confirmation.

**Architecture:** Memory classification remains in the AI/service layer while persistence stays in repositories. Reminder parsing is deterministic domain code, reminder coordination is a server service, and a database-backed scheduler emits chat messages, notifications, and push wakeups.

**Tech Stack:** TypeScript, Express, PostgreSQL, Socket.IO, Vitest.

## Global Constraints

- Reminder creation does not require confirmation.
- Reminder execution is limited to messages, notifications, and Web Push.
- Default timezone is `Asia/Shanghai`.
- No UI layout or visual changes.
- Use focused failing tests before behavior changes.

---

### Task 1: Extend memory contracts and persistence

**Files:**
- Modify: `server/src/domain/models.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/db/migrations.ts`
- Test: `server/src/db/migrations.test.ts`

- [ ] Write failing tests for memory metadata columns and repository update behavior.
- [ ] Run tests and confirm failure.
- [ ] Add category, importance, source, and updated time with safe defaults.
- [ ] Add create-or-update behavior for matching explicit memory categories.
- [ ] Run focused tests.

### Task 2: Make memory extraction deterministic

**Files:**
- Modify: `server/src/services/aiService.ts`
- Modify: `server/src/services/petBrain.ts`
- Modify: `server/src/services/petBrain.test.ts`
- Modify: `server/src/ai/persona.ts`

- [ ] Write failing tests for explicit memory, non-random automatic extraction, failed extraction retry, and 15-memory prompt limit.
- [ ] Run tests and confirm failure.
- [ ] Add explicit memory parsing and deterministic extraction coordination.
- [ ] Emit `memory.created` after persistence.
- [ ] Sort and limit injected memories.
- [ ] Run focused tests.

### Task 3: Synchronize created memories to frontend state

**Files:**
- Modify: `src/services/realtimeClient.ts`
- Modify: `src/state/useRoomRuntime.ts`
- Test: `src/state/useRoomRuntime.test.ts`

- [ ] Write a failing realtime state test.
- [ ] Run it and confirm failure.
- [ ] Handle `memory.created` with ID-based replacement.
- [ ] Run focused frontend tests.

### Task 4: Add reminder domain parsing

**Files:**
- Create: `server/src/domain/reminderRules.ts`
- Create: `server/src/domain/reminderRules.test.ts`

- [ ] Write failing tests for relative, tomorrow, daily, weekly, ambiguous, and past times.
- [ ] Run tests and confirm failure.
- [ ] Implement deterministic parsing with `Asia/Shanghai`.
- [ ] Run focused tests.

### Task 5: Add persistent reminder repositories

**Files:**
- Modify: `server/src/domain/models.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/db/migrations.ts`
- Test: `server/src/db/migrations.test.ts`

- [ ] Write failing tests for task table and repository lifecycle.
- [ ] Run tests and confirm failure.
- [ ] Add task model, table, indexes, and repository methods.
- [ ] Run focused tests.

### Task 6: Create and execute reminders

**Files:**
- Create: `server/src/services/reminderService.ts`
- Create: `server/src/services/reminderService.test.ts`
- Modify: `server/src/services/petBrain.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/index.ts`

- [ ] Write failing tests for immediate creation, ambiguous-time reply, due execution, recurring reschedule, and duplicate prevention.
- [ ] Run tests and confirm failure.
- [ ] Add reminder intent handling before normal AI reply.
- [ ] Add scheduler start/stop and due-task execution.
- [ ] Emit room message, user notification, and push wakeup.
- [ ] Run focused tests.

### Task 7: Document and verify

**Files:**
- Modify: `docs/features/chat.md`
- Modify: `.env.example`
- Modify: `.env.production.example`

- [ ] Document memory events, reminder phrases, scheduler behavior, limits, and timezone.
- [ ] Run focused server and frontend tests.
- [ ] Run `npm run verify:full`.
- [ ] Start `npm run review` and report the URL.

