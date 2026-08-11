# Tarot COS Direct Delivery and PWA Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all tarot runtime images from a configurable Tencent COS public base URL while keeping the installed PWA responsive during deployments and slow API responses.

**Architecture:** The frontend resolves tarot-relative paths through a public runtime build setting and downloads every tarot asset before opening the game, without decoding all 24 images into memory. Production build arguments expose only the public COS base URL; COS credentials remain outside the application. The service worker owns app-shell/static caching, while the session request owns a bounded startup timeout.

**Tech Stack:** React 19, TypeScript, Vite, Fetch streams, Service Worker Cache API, Vitest, Docker Compose, Nginx.

## Global Constraints

- Start from `main` commit `a08266884cba633e1f31254b64ad74c8490de788`.
- Keep the canonical tarot flow and all animation timings unchanged.
- Keep the existing 768 × 1152 tarot artwork and visual quality unchanged.
- Require every tarot runtime image byte to finish downloading before opening the tarot overlay.
- Do not expose Tencent COS credentials to Vite, browser code, Git, or generated frontend assets.
- Keep same-origin `/tarot/...` URLs as the development and rollback fallback.
- Do not change the existing Aliyun OSS chat-image upload path.

---

### Task 1: Configurable Tarot Asset Origin

**Files:**
- Modify: `src/services/runtimeConfig.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/games/tarot/tarotAssets.ts`
- Modify: `src/games/tarot/tarotAssets.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: optional `VITE_TAROT_ASSET_BASE_URL`.
- Produces: `resolveTarotAssetUrl(path: string): string` and a manifest whose URLs use the configured public origin.

- [ ] Add failing URL-resolution tests for empty, trailing-slash, and COS base URL inputs.
- [ ] Run `npm test -- --run src/games/tarot/tarotAssets.test.ts` and confirm failure.
- [ ] Add the typed runtime setting and URL resolver without embedding credentials.
- [ ] Run the focused test and confirm it passes.

### Task 2: Download Without Full-Deck Decode

**Files:**
- Modify: `src/services/imageResourceLoader.ts`
- Create: `src/services/imageResourceLoader.test.ts`
- Modify: `src/games/tarot/tarotAssets.ts`
- Modify: `src/games/tarot/tarotAssets.test.ts`

**Interfaces:**
- Consumes: CORS-readable image responses with optional `Content-Length`.
- Produces: byte progress and completion after the response body is fully consumed, without constructing or decoding 24 image elements.

- [ ] Add failing tests proving the loader consumes bytes and never creates an `Image`.
- [ ] Add a focused test proving tarot opens only after all loaders resolve.
- [ ] Run the focused tests and confirm failure.
- [ ] Replace preload-time image decoding with download-only streaming.
- [ ] Preserve monotonic aggregate progress and six-way concurrency.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Production Build and Static Caching

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.prod.yml`
- Modify: `.env.production.example`
- Modify: `deploy/nginx.conf`
- Modify: `deploy/deploy-scripts.test.mjs`

**Interfaces:**
- Consumes: `TAROT_ASSET_BASE_URL` from the server deployment environment.
- Produces: `VITE_TAROT_ASSET_BASE_URL` at build time plus immutable local-fallback image caching.

- [ ] Add failing deployment/config assertions for the build argument and cache headers.
- [ ] Run `node --test deploy/deploy-scripts.test.mjs` and confirm failure.
- [ ] Pass the public base URL into the Vite build.
- [ ] Add immutable caching for versioned assets and tarot fallback files; keep HTML and `sw.js` revalidating.
- [ ] Run deployment/config tests and confirm they pass.

### Task 4: Installed PWA Startup Recovery

**Files:**
- Modify: `public/sw.js`
- Modify: `src/services/sessionApi.ts`
- Create: `src/services/sessionApi.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/startupAssets.test.ts`

**Interfaces:**
- Consumes: cached app shell and an abortable session request.
- Produces: bounded navigation/session waits with a visible retry path instead of an indefinitely blocked splash.

- [ ] Add failing assertions for navigation timeout fallback, versioned static caching, and session abort support.
- [ ] Run the focused tests and confirm failure.
- [ ] Split navigation, static, image, and API service-worker strategies.
- [ ] Add an eight-second startup session timeout without changing other API timeouts.
- [ ] Keep login/session retry behavior intact.
- [ ] Run the focused tests and confirm they pass.

### Task 5: Documentation and Review

**Files:**
- Modify: `docs/features/tarot.md`
- Modify: `docs/features/assets-and-performance.md`
- Modify: `docs/features/app-navigation.md`
- Modify: `docs/features/deployment.md`

**Interfaces:**
- Documents: COS object layout, CORS requirements, cache headers, environment configuration, ten-second conditional target, fallback, and rollback.

- [ ] Document the required COS paths `tarot/cards/*` and `tarot/ui/*`.
- [ ] Document COS CORS `GET`/`HEAD`, allowed site origin, and exposed `Content-Length`/`ETag`.
- [ ] Document that ten seconds depends on the user network and COS route, with an explicit timeout/error state.
- [ ] Run focused tests, `npm run build`, `npm run check:docs`, and `npm run check:assets`.
- [ ] Start `npm run review`, inspect mobile startup and tarot download UI, and report the local review URL.
