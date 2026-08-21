# 小程序个人资料改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让小程序用户通过测试获得性格类型、主动采用微信昵称和头像、编辑姓名与性别，并获得更清晰易用的“我的”和头像编辑界面。

**Architecture:** 性别和 MBTI 结果作为共享用户资料字段，由服务端资料接口和仓储持久化；MBTI 题目与计分放在小程序纯领域模块，页面只管理答题流程。微信资料采集使用小程序允许的主动头像选择和昵称输入能力，登录服务仅在用户明确提交资料时接收字段。

**Tech Stack:** React 18、Taro 4、TypeScript、Vitest、Express、Zod、PostgreSQL。

**Spec:** `docs/features/miniapp.md`

## Global Constraints

- 从 `origin/main` 的提交 `63a7eaa7468f37d55afc80a35fb4df893d320df7` 开始。
- 不修改塔罗、底部导航、宠物业务和部署配置。
- 用户姓名继续使用现有资料接口，服务端保留 2–12 字符业务校验。
- 性别值仅允许 `female`、`male`、`private`，默认 `private`。
- MBTI 必须通过测试计算，不提供手动类型选择器。
- 微信昵称和头像只能由用户主动选择或填写，不尝试静默读取。
- 视觉修改完成后必须提供 `npm run review` 本地验收地址。

---

### Task 1: Shared Profile Contract

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/services/socialApi.ts`
- Modify: `src/components/AppShell.tsx`
- Modify: `server/src/domain/models.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/services/sessionService.ts`
- Modify: `server/src/http/sessionRoutes.ts`
- Modify: `server/src/db/migrations.ts`
- Test: `server/src/services/sessionService.test.ts`
- Test: `server/src/db/migrations.test.ts`

**Interfaces:**
- Produces: `Gender = 'female' | 'male' | 'private'`
- Produces: `User.gender?: Gender`
- Produces: `updateProfile({ gender })`

- [ ] **Step 1: Write failing profile tests**

Add assertions that a user profile can save and return `gender: 'female'`, rejects unsupported values at the HTTP schema boundary, and runtime migrations add a defaulted `users.gender` column.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run server:test -- --run src/services/sessionService.test.ts src/db/migrations.test.ts`

Expected: FAIL because `gender` is absent from contracts, persistence, and migration SQL.

- [ ] **Step 3: Implement minimal shared contract**

Add the gender union, propagate it through frontend/server profile types, repository patches, session responses, route validation, and `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'private'`.

- [ ] **Step 4: Run tests to verify passing**

Run: `npm run server:test -- --run src/services/sessionService.test.ts src/db/migrations.test.ts`

Expected: PASS.

### Task 2: MBTI Domain Test

**Files:**
- Create: `miniapp/src/domain/mbtiTest.ts`
- Create: `miniapp/src/domain/mbtiTest.test.ts`
- Create: `miniapp/src/features/main/MiniappMbtiTest.tsx`
- Create: `miniapp/src/features/main/MiniappMbtiTest.scss`
- Modify: `miniapp/src/features/main/MiniappMeView.tsx`

**Interfaces:**
- Produces: `MBTI_QUESTIONS`
- Produces: `calculateMbti(answers: boolean[]): string`
- Produces: `MiniappMbtiTest({ onComplete, onClose })`

- [ ] **Step 1: Write failing scoring tests**

Cover all-first answers, all-second answers, balanced thresholds, and invalid answer counts.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/domain/mbtiTest.test.ts` from `miniapp`.

Expected: FAIL because the MBTI module does not exist.

- [ ] **Step 3: Implement pure MBTI rules**

Move the existing PWA question wording and four-dimension threshold calculation into a framework-free miniapp domain module.

- [ ] **Step 4: Run test to verify passing**

Run: `npm test -- --run src/domain/mbtiTest.test.ts` from `miniapp`.

Expected: PASS.

- [ ] **Step 5: Add the test screen**

Render one question at a time, show progress, calculate after 28 answers, save the result through `socialApi.updateProfile`, and expose only “开始测试/重新测试” from the profile page.

### Task 3: WeChat Profile Collection

**Files:**
- Modify: `miniapp/src/services/authApi.ts`
- Modify: `miniapp/src/pages/index/index.tsx`
- Modify: `miniapp/src/pages/index/index.scss`
- Create: `miniapp/src/domain/wechatProfile.ts`
- Create: `miniapp/src/domain/wechatProfile.test.ts`

**Interfaces:**
- Produces: `normalizeWechatProfile({ displayName, avatarUrl })`
- Consumes: `authApi.loginWithWechat(profile)`

- [ ] **Step 1: Write failing normalization tests**

Cover trimmed nicknames, empty nicknames, selected avatar URLs, and omission of unselected fields.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/domain/wechatProfile.test.ts` from `miniapp`.

Expected: FAIL because normalization does not exist.

- [ ] **Step 3: Implement explicit collection**

Add a lightweight login card with an `open-type="chooseAvatar"` button and `type="nickname"` input. Submit only user-confirmed values to the existing auth API and allow login without optional profile fields.

- [ ] **Step 4: Run focused miniapp tests**

Run: `npm test -- --run src/domain/wechatProfile.test.ts src/features/main/miniappViewModel.test.ts` from `miniapp`.

Expected: PASS.

### Task 4: Editable Name and Gender

**Files:**
- Modify: `miniapp/src/services/socialApi.ts`
- Modify: `miniapp/src/features/main/MiniappMeView.tsx`
- Modify: `miniapp/src/features/main/MiniappMeView.scss`
- Modify: `miniapp/src/features/main/miniappViewModel.ts`
- Modify: `miniapp/src/features/main/miniappViewModel.test.ts`

**Interfaces:**
- Consumes: `MiniappProfile.gender`
- Produces: readable labels `女`、`男`、`保密`

- [ ] **Step 1: Write failing presentation tests**

Assert gender labels, default private presentation, and right-side profile value formatting.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/features/main/miniappViewModel.test.ts` from `miniapp`.

Expected: FAIL because gender presentation helpers are absent.

- [ ] **Step 3: Implement profile editing**

Replace the broad edit block with separate tappable rows for name, gender, birthday, and personality. Use a modal/sheet for name, a picker for gender, and preserve the existing birthday update.

- [ ] **Step 4: Increase value readability**

Increase right-side text size, weight, spacing, and minimum tap height without changing unrelated global styles.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/features/main/miniappViewModel.test.ts` from `miniapp`.

Expected: PASS.

### Task 5: Avatar Editor Redesign

**Files:**
- Modify: `miniapp/src/features/main/MiniappAvatarEditor.tsx`
- Modify: `miniapp/src/features/main/MiniappAvatarEditor.scss`
- Create: `miniapp/src/features/main/avatarEditorOptions.ts`
- Create: `miniapp/src/features/main/avatarEditorOptions.test.ts`

**Interfaces:**
- Produces: Chinese labels for avatar option IDs.
- Consumes: existing `MiniappAvatarConfig`.

- [ ] **Step 1: Write failing option tests**

Assert every hair and eye option has a non-empty Chinese label and color lists preserve existing values.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/features/main/avatarEditorOptions.test.ts` from `miniapp`.

Expected: FAIL because option metadata does not exist.

- [ ] **Step 3: Implement larger editor layout**

Use a taller full-width sheet, larger preview, 40–48px color swatches, readable Chinese choice chips, stronger selected states, scrollable content, and a sticky action footer.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/features/main/avatarEditorOptions.test.ts src/domain/avatarConfig.test.ts` from `miniapp`.

Expected: PASS.

### Task 6: Verification and Documentation

**Files:**
- Modify: `docs/features/miniapp.md`
- Modify: `docs/features/wechat-auth-and-multi-room.md`

**Interfaces:**
- Documents: login profile collection, tested MBTI, editable gender, and avatar editor acceptance.

- [ ] **Step 1: Run focused suites**

Run server profile/migration tests and all new miniapp domain/view-model tests.

- [ ] **Step 2: Run package verification**

Run: `npm test -- --run` from `miniapp`.

Run: `npm run build:weapp` from `miniapp`.

Run: `npm run verify:quick` from repository root.

- [ ] **Step 3: Update feature documents**

Describe the user flow, privacy limitation, profile fields, failure states, code entry points, risks, and acceptance checklist.

- [ ] **Step 4: Run documentation checks**

Run: `npm run check:docs`

Run: `npm run check:assets`

- [ ] **Step 5: Start local review**

Run: `npm run review`

Report the emitted local URL, checked viewport, console state, unverified WeChat-native interactions, and rollback paths.
