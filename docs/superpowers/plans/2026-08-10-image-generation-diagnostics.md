# 图片生成诊断与参考图输入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让图片生成接口暴露安全的上游诊断与耗时信息，并让图片描述框支持粘贴参考图、参考图区支持拖拽添加。

**Architecture:** 服务端在图片生成服务边界识别上游嵌套错误并抛出结构化诊断错误，路由负责计时、状态映射和脱敏日志。前端复用现有参考图压缩/校验流程，把粘贴和拖拽统一接入同一个文件添加入口，并在结果区渲染诊断信息。

**Tech Stack:** TypeScript, Express, React 19, Vitest, jsdom, CSS.

## Global Constraints

- 不替换图片模型、上游供应商、邀请码或限流规则。
- 不改变每张 2 MB、最多两张参考图的限制。
- 不添加自动重试。
- 不向浏览器或日志公开 API Key、提示词原文、参考图片数据或完整上游响应。
- 修改行为前先增加聚焦测试。
- UI 改动完成后运行 `npm run review` 并提供本地验收地址。
- 合并或部署前运行 `npm run verify:full`。

---

### Task 1: Add structured upstream diagnostics

**Files:**
- Modify: `server/src/services/imageGenerationService.ts`
- Test: `server/src/services/imageGenerationService.test.ts`

**Interfaces:**
- Produces `ImageGenerationError` with `code`, optional `upstreamCode`, and optional `requestId`.
- Service success result remains `{ data: [{ url?: string; b64_json?: string }] }`.

- [x] **Step 1: Write failing tests**
  - Add a test for HTTP 200 JSON containing `error.code = 502` and a request ID.
  - Add a test for non-2xx upstream response carrying a JSON error.
  - Assert the thrown error preserves only the numeric code and request ID, not the full message.
  - Add a test that a normal image response remains unchanged.

- [x] **Step 2: Run focused tests to verify failure**
  - Run `npm run server:test -- --run src/services/imageGenerationService.test.ts`.
  - Expected: new diagnostic tests fail because the current service only checks `choices`.

- [x] **Step 3: Implement the smallest service change**
  - Add a typed error class or equivalent structured error.
  - Parse the response body once.
  - Detect top-level `error` before normalizing the image result.
  - Map network failures and malformed results to stable service error codes without leaking upstream text.

- [x] **Step 4: Run focused tests**
  - Run the same service test command.
  - Expected: all service tests pass.

### Task 2: Add route timing, safe response fields, and logs

**Files:**
- Modify: `server/src/http/imageRoutes.ts`
- Test: `server/src/http/imageRoutes.test.ts`

**Interfaces:**
- Success response includes `durationMs`.
- Failure response includes `durationMs`, stable `error`, optional `upstreamCode`, and optional `requestId`.

- [x] **Step 1: Write failing route tests**
  - Add a route test with a fake config/upstream response for a success result and assert numeric `durationMs`.
  - Add a route test for HTTP 200 embedded upstream error and assert HTTP 503 plus `upstreamCode` and `requestId`.
  - Add a route test that logs contain diagnostic fields but not prompt or API key.

- [x] **Step 2: Run focused route tests**
  - Run `npm run server:test -- --run src/http/imageRoutes.test.ts`.
  - Expected: tests fail because the route currently has no timing, structured fields, or logging.

- [x] **Step 3: Implement route timing and mapping**
  - Start a monotonic timer at request entry.
  - Add `durationMs` to success and failure JSON responses.
  - Map structured upstream 4xx-style errors to 502 and upstream 5xx/network/invalid response errors to 503.
  - Emit one structured `console.error` record with status, stable error, upstream code, request ID, and duration only.

- [x] **Step 4: Run focused route tests**
  - Run `npm run server:test -- --run src/http/imageRoutes.test.ts`.
  - Expected: route tests pass.

### Task 3: Add frontend diagnostics and image input interactions

**Files:**
- Modify: `src/components/ImageGenerationRoom.tsx`
- Modify: `src/components/ImageGenerationRoom.css`
- Test: `src/components/ImageGenerationRoom.test.tsx`

**Interfaces:**
- Component accepts image files through the existing file picker, paste event, and drag/drop event.
- UI displays success/failure duration in seconds and safe upstream diagnostic information.

- [x] **Step 1: Write failing component tests**
  - Add a test that renders a failed generation response and shows error code and elapsed time.
  - Add a test that pasting an image into the prompt adds a reference and prevents text insertion.
  - Add a test that pasting plain text continues to work.
  - Add a test that dragging image files over and into the reference area adds the reference and toggles the active visual state.

- [x] **Step 2: Run focused component tests**
  - Run `npm test -- --run src/components/ImageGenerationRoom.test.tsx`.
  - Expected: tests fail because the component lacks diagnostics and paste/drop handlers.

- [x] **Step 3: Implement frontend behavior**
  - Track `durationMs`, `upstreamCode`, and `requestId` in the response type.
  - Measure client elapsed time around the fetch as a fallback and prefer server `durationMs`.
  - Render safe success/failure diagnostic text.
  - Factor file-list processing so picker, paste, and drop use the same validation/compression path.
  - Add prompt `onPaste` handling for image clipboard items and reference-area drag enter/leave/over/drop handlers.
  - Add an active drag class and concise helper text without changing existing limits.

- [x] **Step 4: Run focused component tests**
  - Run the same component test command.
  - Expected: all component tests pass.

### Task 4: Sync documentation and verify

**Files:**
- Modify: `docs/features/image-generation.md`

- [x] **Step 1: Update feature documentation**
  - Document embedded upstream errors, visible duration/error code, server log safety, paste, and drag/drop acceptance behavior.

- [x] **Step 2: Run focused verification**
  - Run `npm run test:all`.
  - Run `npm run build:all`.
  - Run `npm run check:docs`.

- [x] **Step 3: Start local review**
  - Run `npm run review`.
  - Open the reported `/image` URL and verify success/failure messaging, paste, drag/drop, and browser console.

- [x] **Step 4: Run full verification**
  - Run `npm run verify:full`.
  - Report commands, results, unverified areas, review URL, and rollback path.
