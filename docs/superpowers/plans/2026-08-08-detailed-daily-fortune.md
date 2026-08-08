# Detailed Daily Fortune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the personal fortune detail page into a fully opened 700-900 character editorial reading with separate single and partnered relationship paragraphs.

**Architecture:** Keep the existing user-scoped endpoint, deterministic seed, compact calendar entry, and full-screen navigation. Version the content payload as schema 2, replace short category sentences with curated complete paragraph variants, regenerate legacy cached records, and render the detailed article without accordions.

**Tech Stack:** React 19, TypeScript, Express 5, PostgreSQL JSONB, Vitest, Vite.

---

### Task 1: Versioned Detailed Fortune Content

**Files:**
- Modify: `server/src/domain/models.ts`
- Modify: `src/domain/types.ts`
- Modify: `server/src/services/dailyFortune.test.ts`
- Modify: `server/src/services/dailyFortune.ts`

- [ ] **Step 1: Write failing schema and paragraph tests**

Assert generated content has `schemaVersion: 2`, a theme, overall summary and full paragraph, both `love.single` and `love.partnered`, separate study and work paragraphs, wealth, health, and `luckyPhrase`. Assert each paragraph meets the minimum useful length and total article text is at least 650 Chinese characters.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run server:test -- dailyFortune.test.ts`

Expected: FAIL because the current short-form payload has `workStudy`, one `love.text`, and `dailyTip`.

- [ ] **Step 3: Upgrade shared types and deterministic templates**

Replace the short schema with the version-2 structure. Add multiple complete editorial paragraph variants for overall, single love, partnered love, study, work, wealth, and health. Keep the compact `overall.summary` as one sentence for the calendar entry and select all copy from the stable user/day/zodiac seed.

- [ ] **Step 4: Strengthen server validation**

Validate schema version, every required paragraph, 1-5 ratings, 1-99 lucky number, approved color, and non-empty theme/lucky phrase. Reject the previous shape and incomplete version-2 records.

- [ ] **Step 5: Run focused tests and server build**

Run: `npm run server:test -- dailyFortune.test.ts && npm run server:build`

Expected: all generator tests pass and TypeScript compiles.

### Task 2: Legacy Cache Regeneration

**Files:**
- Modify: `server/src/services/socialService.test.ts`
- Modify only if required: `server/src/services/socialService.ts`
- Modify: `src/services/socialApi.ts`

- [ ] **Step 1: Update the invalid-cache test to seed a valid short-form legacy record**

Store a schema-1-style payload with valid old ratings/color but no `schemaVersion: 2`, call `getTodayFortune`, and assert it is replaced by a version-2 record containing both relationship paragraphs.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run server:test -- socialService.test.ts`

Expected: FAIL until the version-2 validator rejects all legacy payloads.

- [ ] **Step 3: Confirm upsert regeneration and update mock data**

Use the existing invalid-content replacement path to overwrite the same user/day record. Update the mock API response to the detailed schema so browser development exercises the real detail layout.

- [ ] **Step 4: Run service tests and both builds**

Run: `npm run server:test -- socialService.test.ts && npm run build:all`

Expected: cache replacement passes and both applications compile.

### Task 3: Fully Expanded Editorial Detail Page

**Files:**
- Modify: `src/components/FortuneDetail.test.tsx`
- Modify: `src/components/FortuneDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write a failing render test for the complete article**

Assert the detail shows `今日主题`, `综合运势`, `感情运势`, `单身`, `有伴`, `学习运势`, `工作运势`, `财运`, `健康`, `幸运色`, `幸运数字`, and `今日好运句`, with both relationship paragraphs present at the same time. Assert there are no disclosure/accordion controls.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/FortuneDetail.test.tsx`

Expected: FAIL because the current component only renders one short love paragraph and combines work/study.

- [ ] **Step 3: Render the long article hierarchy**

Add the theme block, full overall paragraph, two relationship subparagraphs, and separate study/work sections. Keep all sections expanded; retain rating, color swatch, number, back button, and safe-area-aware scroll container.

- [ ] **Step 4: Refine long-form editorial CSS**

Use comfortable paragraph line height, bold inline subheadings, thin blue-gray rules, and stable content width. Do not add nested cards, gradients, decorative orbs, accordions, or oversized type.

- [ ] **Step 5: Run focused tests and frontend build**

Run: `npm test -- --run src/components/FortuneDetail.test.tsx src/components/CalendarTab.test.tsx && npm run build`

Expected: detail and compact-entry tests pass and the frontend compiles.

### Task 4: Full Regression And Visual Verification

**Files:**
- Modify tests only if a newly discovered defect is first reproduced by a failing test

- [ ] **Step 1: Run the complete test and build suite**

Run: `npm run test:all && npm run build:all`

Expected: all frontend/server tests and both production builds pass.

- [ ] **Step 2: Scan for old short-form field usage**

Run: `rg -n "workStudy|dailyTip|love\.text|schemaVersion: 1" src server/src`

Expected: no runtime use of the old short-form fields remains.

- [ ] **Step 3: Inspect the 390x844 detail page in the running app**

Open `http://127.0.0.1:5173/`, enter `日常`, open `今日运势`, and capture the first viewport plus a lower scrolled viewport. Verify no horizontal overflow, readable long paragraphs, visible single/partnered headings, and correct safe-area coverage.

- [ ] **Step 4: Check the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and no accidental changes to unrelated existing work.
