# Personal Daily Fortune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shared pet-linked fortune with a compact, personal daily horoscope entry and an editorial full-screen detail view.

**Architecture:** A pure deterministic server module creates validated fortune content from user, local date, and zodiac. A user-scoped repository/API stores one result per user per day; the React calendar tab owns the compact entry and opens a dedicated detail subview while pet behavior no longer reads fortune data.

**Tech Stack:** React 19, TypeScript, Express 5, PostgreSQL, Vitest, React server rendering tests, Vite.

---

### Task 1: Deterministic Personal Fortune Domain

**Files:**
- Create: `server/src/services/dailyFortune.ts`
- Create: `server/src/services/dailyFortune.test.ts`
- Modify: `server/src/domain/models.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing tests for zodiac boundaries and deterministic personal content**

Test `zodiacFromBirthday` at sign boundaries and `createDailyFortune({ userId, birthday, day })` for stable same-day output, valid 1-5 ratings, controlled colors, and changed output across seeds.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run server:test -- dailyFortune.test.ts`

Expected: FAIL because `dailyFortune.ts` and the personal content shape do not exist.

- [ ] **Step 3: Implement the pure generator and shared type shape**

Export a birthday-to-zodiac function and a deterministic template selector. Return `zodiac`, five rated sections, controlled `luckyColor`, `luckyNumber`, and `dailyTip`; throw `birthday_required` for an empty birthday.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run server:test -- dailyFortune.test.ts`

Expected: all daily fortune tests pass.

### Task 2: User-Scoped Persistence And API

**Files:**
- Create: `server/sql/004_personal_fortunes.sql`
- Create: `server/src/services/socialService.test.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/services/socialService.ts`
- Modify: `server/src/http/socialRoutes.ts`
- Modify: `src/services/socialApi.ts`

- [ ] **Step 1: Write failing service tests for personal scoping**

Create two users with birthdays. Assert repeated calls for one user return one stable record, a second user gets their own record, and a user without birthday receives `birthday_required` without needing a room or pet.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run server:test -- socialService.test.ts`

Expected: FAIL because the service and repository are still room-scoped.

- [ ] **Step 3: Add migration, repository contract, and user endpoint**

Create `personal_fortunes(user_id, day, content)` with a unique user/day key. Replace fortune repository methods with `findByUserAndDay` and `createForUser`; add `GET /social/fortune/today`; have the client call it without a room ID.

- [ ] **Step 4: Replace AI/room generation with the pure generator**

Have `getTodayFortune(userId)` read only the authenticated user and use `createDailyFortune`. Remove owner, mood, and pet access from this code path.

- [ ] **Step 5: Run service tests and TypeScript build**

Run: `npm run server:test -- socialService.test.ts && npm run server:build`

Expected: focused tests pass and the server compiles.

### Task 3: Remove Pet And AI Coupling

**Files:**
- Modify: `server/src/services/petService.test.ts`
- Modify: `server/src/services/petService.ts`
- Modify: `server/src/services/aiService.ts`
- Modify: AI stubs in existing server tests if the interface changes

- [ ] **Step 1: Write a failing pet test proving no fortune bonus exists**

Seed a legacy matching fortune if the memory repository still exposes it during migration, perform the pet action, and assert only the standard intimacy change applies and the event has no lucky bonus.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run server:test -- petService.test.ts`

Expected: FAIL because the current service adds five intimacy points.

- [ ] **Step 3: Remove fortune reads and the AI fortune interface**

Delete the pet bonus branch and fortune prompt/method. Update remaining test doubles to implement only `reply` and `extractMemory`.

- [ ] **Step 4: Run the complete server suite**

Run: `npm run server:test`

Expected: all server tests pass.

### Task 4: Compact Daily Entry And Detail View

**Files:**
- Create: `src/components/FortuneDetail.tsx`
- Create: `src/components/CalendarTab.test.tsx`
- Create: `src/components/FortuneDetail.test.tsx`
- Modify: `src/components/CalendarTab.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/NestTab.tsx`
- Modify: `src/components/MeTab.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing render tests for entry, detail, and labels**

Assert the calendar renders one compact `今日运势` button instead of the shared card; the detail renders all five categories and lucky metadata; labels read `日常`, `一起玩`, and `生日` without the explanatory suffix.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run: `npm test -- --run src/components/CalendarTab.test.tsx src/components/FortuneDetail.test.tsx`

Expected: FAIL because the personal entry and detail component do not exist.

- [ ] **Step 3: Implement loading, success, error, and birthday-required entry states**

Move fortune fetching into `CalendarTab`, call the user endpoint, render a fixed-height summary row, retry network failures, and route missing birthday to the profile tab.

- [ ] **Step 4: Implement the full-screen editorial detail view**

Add a safe-area-aware subview with back button, date/zodiac header, overall score, ruled category sections, controlled color swatch, number, and daily tip. Preserve the calendar component state while the detail is open.

- [ ] **Step 5: Remove legacy UI coupling and update copy**

Delete `AppShell` fortune state and the `NestTab.luckyAction` prop/hint. Rename visible labels and replace legacy gradient fortune styles with restrained entry/detail styles.

- [ ] **Step 6: Run focused tests and frontend build**

Run: `npm test -- --run src/components/CalendarTab.test.tsx src/components/FortuneDetail.test.tsx && npm run build`

Expected: focused tests pass and the frontend compiles.

### Task 5: Regression And Visual Verification

**Files:**
- Modify tests only if a real regression is discovered and first reproduced by a failing test

- [ ] **Step 1: Run complete automated verification**

Run: `npm run test:all && npm run build:all`

Expected: all frontend/server tests and both production builds pass.

- [ ] **Step 2: Scan for forbidden legacy coupling**

Run: `rg -n "今日共养运势|用于星座运势|今日幸运互动|luckyAction|fortune-card|正在翻星盘" src server/src`

Expected: no fortune-related legacy UI or behavior remains.

- [ ] **Step 3: Verify the running app at mobile and desktop widths**

Open `http://127.0.0.1:5173/`, inspect the compact entry and detail at representative mobile and desktop viewports, confirm safe-area coverage, readable text, no overlap, and that the calendar remains prominent.

- [ ] **Step 4: Review the final diff without disturbing unrelated work**

Run: `git status --short` and `git diff --check`.

Expected: no whitespace errors; prior unrelated changes remain intact.
