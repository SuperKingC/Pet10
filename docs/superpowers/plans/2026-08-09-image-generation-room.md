# Shared Invite Image Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shareable `/image` web page backed by a server-side, invite-protected image-generation proxy.

**Architecture:** React renders the same-origin image room and calls `POST /api/images/generations`. The existing Node/TypeScript server authenticates one shared invite code, applies IP-based minute/day limits, validates a small request allowlist, and forwards only to the configured upstream image endpoint with a server-only API key.

**Tech Stack:** Vite, React, TypeScript, existing Node HTTP framework, Vitest/Jest project tests, environment-based configuration.

---

### Task 1: Map existing app/server seams

**Files:**
- Inspect: `src/main.tsx`, `src/components/AppShell.tsx`, `src/styles.css`
- Inspect: `server/src/app.ts`, `server/src/index.ts`, `server/src/config.ts`, existing `server/src/http/*` tests

- [ ] Identify the app routing/navigation pattern and server route registration pattern.
- [ ] Identify the project test commands from `package.json` and `server/package.json`.
- [ ] Record the exact existing request/response helper conventions before editing.

### Task 2: Add server configuration and image proxy service tests

**Files:**
- Modify: `server/src/config.ts`
- Create: `server/src/services/imageGenerationService.ts`
- Create: `server/src/services/imageGenerationService.test.ts`
- Modify: `.env.example`, `.env.production.example`

- [ ] Add typed configuration for `IMAGE_INVITE_CODE`, `IMAGE_UPSTREAM_BASE_URL`, `IMAGE_UPSTREAM_API_KEY`, `IMAGE_RATE_LIMIT_PER_MINUTE`, `IMAGE_DAILY_LIMIT`, and `IMAGE_MAX_PROMPT_LENGTH` with numeric defaults 3, 30, and 4000.
- [ ] Write failing tests for valid/invalid invite, prompt/model/size/n validation, and upstream error mapping.
- [ ] Implement a focused service accepting `{inviteCode, ip, prompt, model, size, n}` and an injected `fetch` function; keep the upstream URL fixed from configuration and never accept a client URL or Authorization header.
- [ ] Run the service test file and confirm it passes.

### Task 3: Implement IP rate limiting

**Files:**
- Create: `server/src/services/imageRateLimiter.ts`
- Create: `server/src/services/imageRateLimiter.test.ts`

- [ ] Write tests proving the fourth request in one minute is rejected, a different IP has an independent minute bucket, and the daily limit is rejected.
- [ ] Implement a bounded in-process counter keyed by IP and UTC date/minute, with periodic stale-entry cleanup and configurable limits.
- [ ] Document in code/config that multi-instance deployments need a shared store for strict global limits.
- [ ] Run the focused limiter tests.

### Task 4: Add HTTP route and server wiring

**Files:**
- Create: `server/src/http/imageRoutes.ts`
- Modify: `server/src/app.ts` or the project’s route registration file
- Create/modify: `server/src/http/imageRoutes.test.ts`

- [ ] Add `POST /api/images/generations` using existing JSON parsing and response helpers.
- [ ] Read `Authorization: Bearer <shared-code>`, derive the trusted client IP according to existing deployment conventions, call the service, and return OpenAI-compatible JSON.
- [ ] Return 401 for auth failure, 400 for validation failure, 429 for limits, 502/504 for upstream failures, with generic messages that exclude secrets and stack traces.
- [ ] Add request body size protection and reject unsupported methods/paths.
- [ ] Run route tests, including a mock upstream fetch that asserts the real API key is injected only server-side.

### Task 5: Build the `/image` frontend experience

**Files:**
- Create: `src/components/ImageGenerationRoom.tsx`
- Modify: `src/main.tsx` or existing route shell
- Modify: `src/styles.css`
- Create: `src/components/ImageGenerationRoom.test.tsx`

- [ ] Write failing tests for invite/prompt required validation, loading state, successful image rendering, download control, and server error display.
- [ ] Implement a mobile-first tool screen with invite input, prompt textarea, model/size controls, generate button, loading state, result preview, and download action.
- [ ] Store invite code only in component/session state; never include it in URL, static config, or client logs.
- [ ] Support both URL and base64 image data in the compatible response shape.
- [ ] Run the focused frontend tests.

### Task 6: Integrate navigation and environment documentation

**Files:**
- Modify: `src/components/AppShell.tsx` or current navigation entry point
- Modify: `README.md`
- Modify: `deploy/README.md`

- [ ] Add a clearly reachable `/image` entry without disrupting existing routes.
- [ ] Document server-only environment variables, deployment requirements, invite rotation, HTTPS, upstream spend limits, and the multi-instance limiter caveat.
- [ ] Verify no real key appears in frontend bundles or repository files.

### Task 7: Full verification

**Files:**
- No new files unless fixes are required.

- [ ] Run frontend typecheck/tests/build using the commands from `package.json`.
- [ ] Run server typecheck/tests/build using the commands from `server/package.json`.
- [ ] Use a local mocked upstream to exercise a successful generation and auth/limit failures end to end.
- [ ] Inspect `git diff` and search for `IMAGE_UPSTREAM_API_KEY` to ensure it is referenced only in server-side configuration/service code and examples.

### Task 8: Commit changes

- [ ] Stage only the image-room implementation, tests, configuration examples, docs, and plan/spec files.
- [ ] Commit with `feat: add shared invite image generation room` once verification passes.

