# Static COS/CDN Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload production runtime static assets to a commit-versioned Tencent COS directory and redirect production static requests there without moving HTML, PWA control files, or APIs.

**Architecture:** A tested Node upload manifest selects only production runtime assets from `dist/`. GitHub Actions uploads those files before deployment. Caddy redirects selected paths to the COS version matching the deployed commit, while Nginx retains a complete local build for health checks and emergency fallback.

**Tech Stack:** Node.js 22, Vite, Vitest, Tencent COS Node SDK, Docker Compose, Caddy, GitHub Actions.

## Global Constraints

- Work from the latest `main` in an isolated worktree.
- Add focused failing tests before behavior changes.
- Never upload `public/tarot/concepts/`.
- Never commit COS credentials or production environment files.
- Keep `/api/`, `/socket.io/`, `index.html`, `sw.js`, and `manifest.webmanifest` on Lighthouse.
- Use the deployed full Git commit SHA as the immutable COS version directory.
- Do not change visual behavior, image quality, domain rules, or user upload storage.

---

### Task 1: Static Upload Manifest

**Files:**
- Create: `scripts/lib/static-assets.mjs`
- Create: `scripts/static-assets.test.mjs`
- Create: `scripts/upload-static-to-cos.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `collectStaticAssets(distRoot)` returning upload entries with local path, object key, content type, and cache control.
- Produces: `uploadStaticAssets(options)` accepting COS credentials, bucket, region, version, and dist directory.

- [ ] Write failing tests proving runtime directories are included.
- [ ] Write failing tests proving `tarot/concepts`, HTML, Service Worker, and Manifest are excluded.
- [ ] Run `node --test scripts/static-assets.test.mjs` and confirm the missing module failure.
- [ ] Implement the manifest collector and immutable cache metadata.
- [ ] Install `cos-nodejs-sdk-v5@3.0.0`.
- [ ] Implement the CLI uploader with required environment validation.
- [ ] Run the focused Node tests and confirm they pass.

### Task 2: Production Static Redirect

**Files:**
- Modify: `deploy/Caddyfile`
- Modify: `docker-compose.prod.yml`
- Modify: `deploy/lib/deploy-common.sh`
- Modify: `deploy/update-web.sh`
- Modify: `deploy/update-all.sh`
- Modify: `deploy/rollback.sh`
- Modify: `deploy/deploy-scripts.test.mjs`

**Interfaces:**
- Consumes: `STATIC_ASSET_BASE_URL` and `STATIC_ASSET_VERSION`.
- Produces: redirects for `/assets/*`, `/pet/*`, `/icons/*`, `/navigation/*`, `/me/*`, `/tarot/cards/*`, and `/tarot/ui/*`.

- [ ] Add failing deployment tests for allowed redirect paths, excluded concept/API paths, and commit-version propagation.
- [ ] Run `npm test -- deploy/deploy-scripts.test.mjs --run` and confirm the new assertions fail.
- [ ] Add Caddy path matching and versioned redirects.
- [ ] Pass public base URL and commit SHA into the Caddy container.
- [ ] Restart Caddy for web/all deploys and web/all rollbacks.
- [ ] Add public verification for the startup-image redirect target.
- [ ] Run focused deployment tests and confirm they pass.

### Task 3: GitHub COS Upload

**Files:**
- Modify: `.github/workflows/deploy-production.yml`
- Modify: `deploy/deploy-scripts.test.mjs`
- Modify: `.env.production.example`

**Interfaces:**
- Consumes GitHub Environment secrets: `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, `STATIC_ASSET_BASE_URL`.
- Produces a complete COS version directory before SSH deployment.

- [ ] Add failing workflow assertions for checkout, build, upload, conditional web/all execution, and secret environment wiring.
- [ ] Run focused deployment tests and confirm failure.
- [ ] Add approved-revision checkout and Node setup to the deploy job.
- [ ] Build and upload static assets only for `web` and `all`.
- [ ] Pass the public base URL and version SHA to the remote deployment command.
- [ ] Document public production variables in the environment example.
- [ ] Run focused tests and confirm they pass.

### Task 4: Documentation and Verification

**Files:**
- Modify: `docs/features/assets-and-performance.md`
- Modify: `docs/features/deployment.md`
- Modify: `docs/operations/lighthouse-deployment.md`
- Modify: `deploy/README.md`
- Modify: `docs/assets/asset-manifest.json` only if the checker requires deployment metadata changes.

**Interfaces:**
- Produces operator instructions for COS CORS, GitHub secrets, deployment, rollback, and verification.

- [ ] Update feature documentation with the static delivery boundary.
- [ ] Update deployment instructions and rollback behavior.
- [ ] Run `npm run check:docs`.
- [ ] Run `npm run check:assets`.
- [ ] Run focused tests.
- [ ] Run `npm run verify:quick`.
- [ ] Run `npm run verify:full`.
- [ ] Start `npm run review` and provide the local review URL.
- [ ] Verify local development remains same-origin without production environment values.
