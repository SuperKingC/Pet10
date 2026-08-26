# 移除 Web/PWA，仅保留小程序与服务端 — 设计文档

日期：2026-08-26
状态：已确认（用户选择方案 A：小程序直连 COS）

## 背景

Pet10 仓库当前包含三块：Web PWA 前端（根目录 `src/` + Vite 构建）、微信小程序（`miniapp/`）、后端（`server/`）。用户决定只保留微信小程序，删除全部 PWA/Web 相关模块与部署。

小程序塔罗资源现状：图片源文件在 `public/tarot/`，CI 通过 `npm run upload:static` 上传到 COS 版本目录 `{STATIC_ASSET_BASE_URL}/{完整commitSHA}/`；小程序默认从 `https://pet10kk.com/tarot/...` 下载，由 Caddy 302 重定向到 COS。删除 web 后该重定向层消失，小程序需直连 COS。

隐藏依赖：`api.pet10kk.com` 的流量目前经 Caddy → web 容器 nginx → api:8787，删除 web 容器必须同步改 Caddy 直连 api，否则小程序后端连接中断。

## 目标 / 非目标

- 目标：删除 web 前端及其部署；仓库只保留 `miniapp/` 与 `server/` 两条产品线；小程序塔罗资源直连 COS。
- 非目标：不改小程序业务功能；不改 server API 行为；不清理 COS 桶内已有版本目录。

## 1. 删除的文件/目录

- `src/`、`index.html`、`vite.config.ts`、`tsconfig.app.json`、`tsconfig.node.json`、根 `tsconfig.json`（只引用 web 配置）
- 根 `Dockerfile`（web 镜像）、`deploy/nginx.conf`、`deploy/update-web.sh`
- `public/` 中 web 专属部分：`icons/`（PWA 安装图标）、`me/`、`navigation/`、`pet/`、`nest/`（小程序均已本地打包副本）
- `docs/visual-baselines/`（PWA 塔罗视觉基线）与 web 专属 feature 文档（chat、pet-system、tarot、gobang、image-generation、daily-fortune、app-navigation、social-and-session、wechat-auth-and-multi-room、miniapp-wechat-launch 等）

## 2. 保留并改造的 COS 上传管道

- 保留 `public/tarot/`（`cards/` + `ui/`）作为 COS 上传源目录。
- `scripts/lib/static-assets.mjs`：`RUNTIME_ROOTS` 收窄为 `['tarot/cards', 'tarot/ui']`。
- `scripts/upload-static-to-cos.mjs`：默认源目录从 `dist` 改为 `public`。
- `docs/assets/asset-manifest.json` 收窄为仅塔罗条目；`check:assets` 保留，继续管理 COS 资源体积预算。

## 3. 小程序改动

- `miniapp/config/index.ts`：移除 `https://pet10kk.com` 默认值；`TARO_TAROT_ASSET_BASE_URL` 构建时必填，缺失时给出明确报错。值为 COS 基址 + 版本目录，例如 `https://<bucket>.cos.<region>.myqcloud.com/pet10-web/<commitSHA>`。
- 同步更新 `miniapp/src/config/apiBaseUrl.test.ts`、`miniapp/src/features/tarot/tarotAssets.test.ts` 断言。
- 运维事项（用户手动）：在微信公众平台把 COS 域名加入「服务器域名 → downloadFile 合法域名」。
- 已发布小程序版本指向旧版本目录，COS 不删旧版本目录，因此不受影响。

## 4. 部署改造

- `deploy/Caddyfile`：删除 `pet10kk.com` 站点与静态资源重定向；`api.pet10kk.com` 直接 `reverse_proxy api:8787`（承接 `/api/`、`/socket.io/`、`/health`）。
- `docker-compose.prod.yml`：删除 `web` 服务；caddy 去掉对 web 的依赖及 `STATIC_ASSET_*` 环境变量。
- CI：`ci.yml` 去掉 web 构建；`deploy-production.yml` 去掉 web 构建/部署步骤，保留「上传 COS 塔罗资源 + 部署 api」；COS 上传源改为 `public/`，不再需要先 `npm run build`。
- `STATIC_ASSET_VERSION` 不再写回服务器 `.env.production`（无重定向层消费它）；`deploy/lib/deploy-common.sh`、`update-all.sh`、`verify.sh`、`rollback.sh` 与 `deploy/deploy-scripts.test.mjs` 同步精简。

## 5. 根 package.json

- 移除 `dev`、`build`（vite）、`preview` 脚本；`build:all` 改为仅 server 构建。
- 移除依赖：react、react-dom、@types/react、@types/react-dom、@vitejs/plugin-react、vite、jsdom、socket.io-client。
- 保留：vitest（运行 miniapp + scripts + deploy 测试）、typescript、cos-nodejs-sdk-v5。

## 6. 规则与文档同步

- `AGENTS.md`、`AI_RULES.md` 去掉 web/PWA 相关条款（含 tarot-animation 规则引用）。
- 重写 `docs/features/deployment.md`、`docs/features/assets-and-performance.md`、`docs/features/miniapp.md` 中涉及 web 的段落。
- `scripts/check-docs.mjs` 的必要文档清单同步更新。

## 验证方式

- `npm run test:all`、`npm run check:assets`、`npm run check:docs`、`npm run check:architecture`、`npm test -- --run deploy/deploy-scripts.test.mjs` 全部通过。
- 小程序以 COS 基址构建通过（`npm run build:weapp --prefix miniapp`）。
- 生产部署切换由用户在确认后通过 GitHub 工作流执行。
