# 移除 Web/PWA 仅保留小程序与服务端 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 web 前端与部署，仓库只保留 miniapp/ 与 server/；小程序塔罗资源直连 COS。

**Architecture:** 保留 COS 上传管道但源目录从 vite dist 改为 `public/`（仅 `tarot/`）；小程序构建强制要求 `TARO_TAROT_ASSET_BASE_URL`；Caddy 只保留 `api.pet10kk.com → api:8787` 反代；部署脚本去掉全部静态资源重定向/版本写回逻辑。

**Tech Stack:** Taro/React 小程序、Node/Express 服务端、Docker Compose + Caddy、GitHub Actions、腾讯云 COS。

**Spec:** `docs/superpowers/specs/2026-08-26-remove-web-keep-miniapp-design.md`

---

## 前置事项

- [ ] **Step 0: 处理工作区已有的未提交 miniapp 改动**

当前 `main` 上有一批未提交的 `miniapp/` 改动（含 `tarotAssets.ts`、`tarotAssets.test.ts`、`project.config.json` 等）。本计划会修改其中部分文件。开工前先与用户确认：先单独提交这批改动（推荐），还是 stash。未确认前不得开始 Task 1。

---

### Task 1: COS 上传管道收窄为塔罗资源

**Files:**
- Modify: `scripts/lib/static-assets.mjs`
- Modify: `scripts/upload-static-to-cos.mjs`
- Modify: `scripts/check-assets.mjs`
- Modify: `docs/assets/asset-manifest.json`
- Test: `scripts/static-assets.test.mjs`、`scripts/check-assets.test.mjs`

- [ ] **Step 1: 修改 `scripts/lib/static-assets.mjs`**

`RUNTIME_ROOTS` 收窄：

```js
const RUNTIME_ROOTS = [
  'tarot/cards',
  'tarot/ui'
]
```

- [ ] **Step 2: 修改 `scripts/upload-static-to-cos.mjs`**

默认源目录从 `dist` 改为 `public`：

```js
const distRoot = resolve(process.env.STATIC_ASSET_DIST_DIR || 'public')
```

- [ ] **Step 3: 修改 `scripts/check-assets.mjs`**

```js
const runtimeDirectories = ['public/tarot/cards', 'public/tarot/ui']
```

`categoryFor` 简化（删除 icons/pet 分支）：

```js
function categoryFor(path) {
  const repoPath = toRepoPath(path)
  if (sourceOnlyDirectories.some((directory) => repoPath.startsWith(`${directory}/`))) return 'source-only'
  return 'runtime-feature'
}
```

`budgetFor` 删除 `public/pet/xiaoduoli.png` 分支，其余保留。若 `scripts/check-assets.test.mjs` 中被删分支有断言，同步删除。

- [ ] **Step 4: 收窄 `docs/assets/asset-manifest.json`**

只保留 `public/tarot/cards/*`、`public/tarot/ui/*` 与 `design-assets/tarot/concepts/*` 条目；`budgets` 删除 `startupWarning`，保留 runtime 与 tarot 预算。同步更新 `docs/assets/asset-manifest.md` 中涉及 icons/pet/navigation/nest/me 的描述。

- [ ] **Step 5: 更新并运行测试**

`scripts/static-assets.test.mjs`：涉及 `assets/`、`pet/`、`nest/`、`icons/`、`navigation/`、`me/` 的用例删除或改为仅断言 `tarot/cards`、`tarot/ui`。运行：

```powershell
npm test -- --run scripts/static-assets.test.mjs scripts/check-assets.test.mjs; node scripts/check-assets.mjs
```

预期：全部 PASS，check-assets 输出 `Assets: 24` 左右且无 ERROR。

- [ ] **Step 6: 提交**

```powershell
git add scripts docs/assets
git commit -m "重构: COS 上传管道收窄为塔罗资源并改为从 public 目录上传"
```

---

### Task 2: 小程序塔罗资源基址改为构建必填

**Files:**
- Modify: `miniapp/config/index.ts`
- Test: `miniapp/src/config/apiBaseUrl.test.ts`
- Test: `miniapp/src/features/tarot/tarotAssets.test.ts`

- [ ] **Step 1: 先改测试 `miniapp/src/config/apiBaseUrl.test.ts`**

将 "defines a production tarot asset base URL" 用例替换为：

```ts
it('requires a tarot asset base URL at build time', () => {
  const configSource = readFileSync(resolve(miniappRoot(), 'config/index.ts'), 'utf8')

  expect(configSource).toContain('process.env.TARO_TAROT_ASSET_BASE_URL')
  expect(configSource).toContain('TARO_TAROT_ASSET_BASE_URL is required')
  expect(configSource).not.toContain("'https://pet10kk.com'")
  expect(configSource).toContain('TARO_TAROT_ASSET_BASE_URL:')
})
```

运行 `npm test --prefix miniapp -- --run src/config/apiBaseUrl.test.ts`，预期 FAIL。

- [ ] **Step 2: 修改 `miniapp/config/index.ts`**

```ts
const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'https://api.pet10kk.com'
const tarotAssetBaseUrl = process.env.TARO_TAROT_ASSET_BASE_URL?.trim()
if (!tarotAssetBaseUrl) {
  throw new Error(
    'TARO_TAROT_ASSET_BASE_URL is required, e.g. https://<bucket>.cos.<region>.myqcloud.com/pet10-web/<commitSHA>'
  )
}
```

- [ ] **Step 3: 更新 `miniapp/src/features/tarot/tarotAssets.test.ts`**

用例名 "uses the configured production base for the PWA tarot resources" 改为 "uses the build-time COS base for tarot resources"，断言不变。

- [ ] **Step 4: 运行测试并验证构建**

```powershell
npm test --prefix miniapp -- --run src/config/apiBaseUrl.test.ts src/features/tarot/tarotAssets.test.ts
```

预期 PASS。再验证缺失变量时构建报错、提供变量时构建通过：

```powershell
npm run build:weapp --prefix miniapp   # 预期抛 TARO_TAROT_ASSET_BASE_URL is required
$env:TARO_TAROT_ASSET_BASE_URL = "https://example.cos.ap-guangzhou.myqcloud.com/pet10-web/test"; npm run build:weapp --prefix miniapp; Remove-Item Env:TARO_TAROT_ASSET_BASE_URL
```

- [ ] **Step 5: 提交**

```powershell
git add miniapp/config miniapp/src/config miniapp/src/features/tarot
git commit -m "重构: 小程序塔罗资源基址改为构建时必填的 COS 地址"
```

---

### Task 3: 部署层改造（Caddy/Compose/脚本）

**Files:**
- Modify: `deploy/Caddyfile`
- Modify: `docker-compose.prod.yml`
- Modify: `deploy/lib/deploy-common.sh`、`deploy/update-all.sh`、`deploy/rollback.sh`、`deploy/verify.sh`
- Delete: `deploy/update-web.sh`、`deploy/nginx.conf`
- Test: `deploy/deploy-scripts.test.mjs`

- [ ] **Step 1: 重写 `deploy/Caddyfile`**

```
api.pet10kk.com {
    encode zstd gzip
    reverse_proxy api:8787
}
```

- [ ] **Step 2: 修改 `docker-compose.prod.yml`**

删除整个 `web` 服务；`caddy` 服务删除 `environment` 中两个 `STATIC_ASSET_*` 变量，`depends_on` 改为：

```yaml
    depends_on:
      api:
        condition: service_healthy
```

- [ ] **Step 3: 精简 `deploy/lib/deploy-common.sh`**

删除：`STATIC_ASSET_BASE_URL`/`STATIC_ASSET_VERSION` 变量初始化、`assert_static_asset_config()`、`persist_static_asset_config()`、`restart_static_delivery()`、`verify_static_asset_redirect()`；`prepare_deploy` 中删除 `STATIC_ASSET_VERSION="$TARGET_COMMIT"` 及 export；`save_deploy_state` 删除 `STATIC_ASSET_BASE_URL` 行；`verify_public_endpoints` 只保留 `wait_for_url "$base/health"`（`/healthz` 属于已删除的 web nginx）；`print_success` 的 Rollback 提示改为：

```bash
log "Rollback: DEPLOY_PUBLIC_URL='$PUBLIC_URL' ./deploy/rollback.sh"
```

- [ ] **Step 4: 精简 `deploy/update-all.sh`**

```bash
prepare_deploy "${1:-origin/main}" all
save_deploy_state
compose up -d --build
verify_public_endpoints
print_success
```

- [ ] **Step 5: 精简 `deploy/rollback.sh`**

删除 `STATIC_ASSET_VERSION`/`export` 两行；case 删除 `web` 分支，`all` 分支改为：

```bash
  all)
    compose up -d --build
    ;;
```

删除文件末尾 `verify_static_asset_redirect`、`persist_static_asset_config` 相关判断，只保留 `verify_public_endpoints` 与完成日志。

- [ ] **Step 6: 删除 `deploy/update-web.sh`、`deploy/nginx.conf`**

- [ ] **Step 7: 重写 `deploy/deploy-scripts.test.mjs`**

`scripts` 数组去掉 `deploy/update-web.sh`。删除以下用例：`keeps source-only tarot concepts out of Docker builds`（.dockerignore 断言移到保留列表见 Step 8）、`updates frontend and backend independently` 中 web 断言（改为只断言 api）、`keeps production tarot URLs on the versioned static delivery path`、`caches immutable assets...`、`redirects only production runtime assets...`、`passes the deployed commit version into Caddy...`、`builds and uploads the approved web revision...`、`passes the public static origin...`、`preserves the public static origin...`、`normalizes the public static origin...`、`persists the verified COS origin...`、`validates static delivery configuration...`。新增用例：

```js
it('routes the API domain directly to the api service', async () => {
  const caddy = await readFile(resolve(root, 'deploy/Caddyfile'), 'utf8')
  expect(caddy).toContain('api.pet10kk.com {')
  expect(caddy).toContain('reverse_proxy api:8787')
  expect(caddy).not.toContain('pet10kk.com api.pet10kk.com')
  expect(caddy).not.toContain('redir')
})

it('has no web service in the production compose file', async () => {
  const compose = await readFile(resolve(root, 'docker-compose.prod.yml'), 'utf8')
  expect(compose).not.toMatch(/^\s{2}web:/m)
  expect(compose).not.toContain('STATIC_ASSET_BASE_URL')
})
```

`records the rollback point` 用例的列表去掉 `deploy/update-web.sh`。

- [ ] **Step 8: `.dockerignore` 去掉 `public/tarot/concepts` 行**

（concepts 目录不属于保留资源，且 web 镜像已删除；server 镜像构建上下文不需要该排除项。若保留 `docs`、`dist` 行不变。）

- [ ] **Step 9: 运行测试**

```powershell
npm test -- --run deploy/deploy-scripts.test.mjs
```

预期 PASS。

- [ ] **Step 10: 提交**

```powershell
git add deploy docker-compose.prod.yml .dockerignore
git commit -m "重构: 部署层移除 web 站点，Caddy 直连 api 服务"
```

---

### Task 4: CI 工作流改造

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy-production.yml`
- Test: `scripts/workflows.test.mjs`

- [ ] **Step 1: 修改 `.github/workflows/ci.yml`**

步骤保留：`npm ci`、`npm run test:all`、`npm run build:all`、`npm run check:docs`、`npm run check:assets`、`npm test -- --run deploy/deploy-scripts.test.mjs`。删除 `npx tsc -b` 与 `npm run check:architecture`。

- [ ] **Step 2: 修改 `.github/workflows/deploy-production.yml`**

- `service` choices 改为 `assets`、`api`、`all`（default: `api`），删除 `web`。
- deploy job 中所有 `if: ${{ inputs.service != 'api' }}` 条件保留（覆盖 assets/all）。
- 删除 "Build static assets" 步骤（含 VITE_* 环境变量），"Upload static assets to COS" 步骤的 run 改为：

```yaml
        run: |
          npm ci
          npm run upload:static
```

- "Verify public COS asset" 的 `for asset_path in pet/xiaoduoli.png nest/action-feed.png; do` 改为 `for asset_path in tarot/ui/card-back.jpg tarot/cards/the-fool.jpg; do`。
- "Deploy approved revision" 的 remote_command 去掉 `STATIC_ASSET_BASE_URL=%q` 及其参数：

```yaml
          printf -v remote_command \
            'cd -- %q && DEPLOY_PUBLIC_URL=%q ./deploy/update-%q.sh %q' \
            "$DEPLOY_PATH" "$DEPLOY_URL" "$SERVICE" "$REVISION"
```

同时删除该步骤 env 中的 `STATIC_ASSET_BASE_URL`。
- "Deployment summary" 中 `Health: $DEPLOY_URL/healthz` 改为 `$DEPLOY_URL/health`。
- 注意：`update-assets.sh` 不存在。当 `service=assets` 时 SSH 步骤会调用 `./deploy/update-assets.sh` 失败，因此 SSH 部署步骤需加条件 `if: ${{ inputs.service != 'assets' }}`（纯资源发布只上传 COS，不触碰服务器）。

- [ ] **Step 3: 更新 `scripts/workflows.test.mjs`**

CI 用例：删除 `check:architecture` 断言，其余保留。deploy 用例保留通用断言；删除/调整与 web 构建、`STATIC_ASSET_BASE_URL=%q` 相关的断言；新增：

```js
expect(workflow).toContain('tarot/ui/card-back.jpg')
expect(workflow).not.toContain('npm run build\n')
expect(workflow).toContain("if: ${{ inputs.service != 'assets' }}")
```

- [ ] **Step 4: 运行测试**

```powershell
npm test -- --run scripts/workflows.test.mjs
```

预期 PASS。

- [ ] **Step 5: 提交**

```powershell
git add .github scripts/workflows.test.mjs
git commit -m "重构: CI 与生产发布流程移除 web 构建，仅保留 api 与 COS 塔罗资源"
```

---

### Task 5: 根目录工程配置瘦身

**Files:**
- Modify: `package.json`
- Delete: `vite.config.ts`、`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`
- Modify: `scripts/verify-quick.mjs`、`scripts/verify-full.mjs`、`scripts/checks.test.mjs`
- Delete: `scripts/check-architecture.mjs`、`scripts/review.mjs`、`scripts/review-stop.mjs`、`scripts/review.test.mjs`（若存在）

- [ ] **Step 1: 修改根 `package.json`**

- `"name"` 改为 `"pet10"`。
- scripts：删除 `dev`、`build`、`preview`、`review`、`review:stop`、`check:architecture`；`"build:all"` 改为 `"npm run server:build"`。其余（test、server:*、test:all、check:assets、check:docs、upload:static、verify:*）保留。
- dependencies：删除 `react`、`react-dom`、`socket.io-client`。若 `server` workspace 使用 socket.io，其自身 package.json 已有依赖，不受影响（先确认 `server/package.json` 再删）。
- devDependencies：删除 `@types/react`、`@types/react-dom`、`@vitejs/plugin-react`、`vite`、`jsdom`；保留 `vitest`、`typescript`、`cos-nodejs-sdk-v5`。

- [ ] **Step 2: 删除 `vite.config.ts`、`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`**

- [ ] **Step 3: 精简验证脚本**

`scripts/verify-full.mjs` 命令列表改为：

```js
const commands = [
  ['npm', ['run', 'test:all']],
  ['npm', ['run', 'build:all']],
  ['npm', ['run', 'check:docs']],
  ['npm', ['run', 'check:assets']],
]
```

`scripts/verify-quick.mjs` scopes 改为：

```js
const commands = {
  miniapp: [
    ['npm', ['test', '--prefix', 'miniapp', '--', '--run']],
    ['npm', ['run', 'build:weapp', '--prefix', 'miniapp']],
  ],
  server: [
    ['npm', ['run', 'server:test']],
    ['npm', ['run', 'server:build']],
  ],
}
```

Usage 提示改为 `--scope=miniapp|server`。

- [ ] **Step 4: 删除 `scripts/check-architecture.mjs`，更新 `scripts/checks.test.mjs`**

checks.test.mjs 删除 architecture 用例及其 import，只保留 docs 用例。

- [ ] **Step 5: 删除 review 脚本**

删除 `scripts/review.mjs`、`scripts/review-stop.mjs` 及其测试文件（如 `scripts/review.test.mjs`）；`package.json` 的 `review`/`review:stop` 脚本已在 Step 1 删除。

- [ ] **Step 6: 更新依赖并运行测试**

```powershell
npm install
npm test -- --run
```

预期：根 vitest 全部 PASS（此时 src/ 尚未删除，若 src 测试因依赖被移除而失败，允许在 Task 6 删除 src/ 后一并转绿；若阻塞，先执行 Task 6 删除再回来跑）。

- [ ] **Step 7: 提交**

```powershell
git add -A; git commit -m "重构: 根工程配置移除 Vite/React 前端构建链路"
```

---

### Task 6: 删除 web 前端源码与资源

**Files:**
- Delete: `src/`、`index.html`、`Dockerfile`（根）、`public/icons/`、`public/me/`、`public/navigation/`、`public/pet/`、`public/nest/`、`public/sw.js`、`public/manifest.webmanifest`
- Delete: `docs/visual-baselines/` 与 web 专属 feature 文档

- [ ] **Step 1: 删除 web 前端文件**

删除：`src/`（整个目录）、`index.html`、根 `Dockerfile`、`public/icons/`、`public/me/`、`public/navigation/`、`public/pet/`、`public/nest/`、`public/sw.js`、`public/manifest.webmanifest`。完成后 `public/` 只剩 `tarot/`。

- [ ] **Step 2: 删除 web 文档**

删除 `docs/visual-baselines/`，以及 `docs/features/` 下：`app-navigation.md`、`chat.md`、`daily-fortune.md`、`gobang.md`、`image-generation.md`、`pet-system.md`、`social-and-session.md`、`tarot.md`、`wechat-auth-and-multi-room.md`、`miniapp-wechat-launch.md`。保留 `README.md`、`miniapp.md`、`deployment.md`、`assets-and-performance.md`（后两者在 Task 7 重写）。

- [ ] **Step 3: 全局搜索残留引用**

```powershell
npx rg -i "pet10kk\.com(?!/)" --glob "!node_modules" --glob "!docs/superpowers"
npx rg "sw\.js|manifest\.webmanifest|serviceWorker" --glob "!node_modules" --glob "!docs/superpowers" --glob "!miniapp"
```

（rg 不可用时用 Grep 工具。）对命中的非历史文档文件逐个清理；`docs/superpowers/` 历史记录不处理。

- [ ] **Step 4: 运行全量测试**

```powershell
npm run test:all
```

预期 PASS。

- [ ] **Step 5: 提交**

```powershell
git add -A; git commit -m "删除: 移除 web PWA 前端源码、资源与文档"
```

---

### Task 7: 规则与文档同步

**Files:**
- Modify: `scripts/check-docs.mjs`、`docs/features/README.md`、`docs/features/deployment.md`、`docs/features/assets-and-performance.md`、`docs/features/miniapp.md`、`docs/operations/lighthouse-deployment.md`、`AGENTS.md`、`AI_RULES.md`、`README.md`、`.agents/rules/*`

- [ ] **Step 1: 更新 `scripts/check-docs.mjs`**

```js
const requiredFeatures = [
  'README.md',
  'miniapp.md',
  'assets-and-performance.md',
  'deployment.md',
]
```

删除 `baselineFiles` 及 `docs/visual-baselines/tarot` 检查段。路径正则中 `(?:src|server\/src|docs|deploy|public)` 改为 `(?:miniapp\/src|server\/src|docs|deploy|public)`。

- [ ] **Step 2: 重写文档**

- `docs/features/deployment.md`：改为「COS 塔罗资源上传 + api 部署」流程；服务选项为 `assets`/`api`/`all`；删除 web 镜像、Caddy 重定向、`STATIC_ASSET_VERSION` 写回等描述。
- `docs/features/assets-and-performance.md`：只保留 COS 塔罗资源管道与小程序本地图片预算（180 KB 安全线）内容；删除 PWA/Service Worker/启动资源段落；验收清单同步精简。
- `docs/features/miniapp.md`：删除「PWA 运行时资源复制」表述中 PWA 字样（改为「仓库静态资源」）；新增一段：塔罗资源通过 `TARO_TAROT_ASSET_BASE_URL`（构建必填，指向 COS 版本目录）直连 COS，COS 域名需加入 downloadFile 合法域名。
- `docs/features/README.md`：功能文档列表改为保留的四个文档。
- `docs/operations/lighthouse-deployment.md`：删除 web/nginx/Caddy 重定向章节，保留服务器基础、api 部署与 COS 密钥管理说明。
- `README.md`（根）：项目介绍改为「微信小程序 + 服务端」，删除 PWA 描述与 web 启动命令。

- [ ] **Step 3: 更新 `AGENTS.md` 与 `AI_RULES.md`**

- `AGENTS.md`：删除 "Tarot animation changes must follow..." 一行；"UI or animation changes must provide a local review URL" 改为小程序预览要求（开发者工具预览）。
- `AI_RULES.md`：分层图删除 `src/*` 五行，增加 `miniapp/src/*` 分层；删除「塔罗动画特别规则」整节；验收方式改为微信开发者工具预览；「服务器更新」的服务选项改为 `assets/api/all`。

- [ ] **Step 4: 清理 `.agents/rules/` 与 `.agents/skills/`**

先逐个阅读 `.agents/rules/` 下各文件：删除 `tarot-animation.md`；`deployment.md` 中 "Prefer `web` for frontend-only changes" 改为 "Prefer `assets` for tarot image changes"；`architecture.md`、`ui-presentation.md`、`typography.md`、`change-protocol.md`、`testing-and-review.md`、`documentation.md` 中引用 `src/`、PWA、vite、review URL 的条目删除或改写为小程序语境。`.agents/skills/` 下 `visual-animation-change`、`react-refactor` 若仅服务 web 则保留说明改写为小程序语境（不删目录，避免破坏技能引用）。

- [ ] **Step 5: 运行文档与全量检查**

```powershell
node scripts/check-docs.mjs; npm test -- --run scripts/checks.test.mjs
```

预期 PASS。

- [ ] **Step 6: 提交**

```powershell
git add -A; git commit -m "文档: 规则与功能文档同步为小程序+服务端架构"
```

---

### Task 8: 全量验证

- [ ] **Step 1: 运行完整验证**

```powershell
npm run verify:full
```

预期：test:all、build:all、check:docs、check:assets 全部通过。

- [ ] **Step 2: 小程序完整构建验证**

```powershell
$env:TARO_TAROT_ASSET_BASE_URL = "https://example.cos.ap-guangzhou.myqcloud.com/pet10-web/test"; npm run build:weapp --prefix miniapp; Remove-Item Env:TARO_TAROT_ASSET_BASE_URL
```

预期构建成功（清缓存重编译，遵循 miniapp-change 规则）。

- [ ] **Step 3: 汇报**

按 AI_RULES 验收格式汇报：修改文件、行为变化、自动验证命令与结果、未验证内容（生产部署切换、微信后台域名配置需用户执行）、回滚方式（`git revert` 对应提交）。

**用户后续运维事项（不在代码范围内）：**
1. 微信公众平台「服务器域名 → downloadFile 合法域名」添加 COS 域名。
2. 下次小程序构建使用真实 `STATIC_ASSET_BASE_URL/{当前commitSHA}` 作为 `TARO_TAROT_ASSET_BASE_URL`。
3. 通过 GitHub 工作流以 `service=all` 部署生产（Caddy 配置切换会导致 pet10kk.com 站点下线）。
4. DNS/证书：pet10kk.com 不再使用后可自行处置。

