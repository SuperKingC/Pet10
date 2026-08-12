# 生产静态资源 COS/CDN 接入设计

## 目标

将生产环境的版本化前端静态资源和运行时图片直接交付给腾讯 COS/CDN，减少 Lighthouse 公网链路对首次启动速度的影响，同时保留 HTML、Service Worker、Manifest、API 和 Socket.IO 的同源入口。

## 非目标

- 不迁移 `/api/`、`/socket.io/`、PostgreSQL、Redis 或服务端业务。
- 不改变用户上传头像和聊天图片现有 OSS 流程。
- 不上传 `public/tarot/concepts/` 原始概念素材。
- 不修改图片画质、尺寸、视觉样式或塔罗动画。
- 不在代码或工作流中保存 COS SecretId、SecretKey。
- 不自动修改 COS Bucket CORS；部署前由运维确认配置。

## 方案

### 资源分层

继续由 Lighthouse 同源提供：

- `/`
- `/index.html`
- `/sw.js`
- `/manifest.webmanifest`
- `/healthz`
- `/health`
- `/api/`
- `/socket.io/`

上传到 COS 的版本目录：

- `/assets/`
- `/pet/`
- `/icons/`
- `/navigation/`
- `/me/`
- `/tarot/cards/`
- `/tarot/ui/`

明确排除：

- `/tarot/concepts/`
- `index.html`
- `sw.js`
- `manifest.webmanifest`

### URL 路由

生产 Caddy 根据 `STATIC_ASSET_BASE_URL` 和 `STATIC_ASSET_VERSION` 将静态路径以 `302` 重定向到：

```text
{STATIC_ASSET_BASE_URL}/{STATIC_ASSET_VERSION}{原始路径}
```

例如：

```text
/pet/xiaoduoli-startup.png
→ https://<bucket>.cos.<region>.myqcloud.com/pet10-web/cc30798.../pet/xiaoduoli-startup.png
```

浏览器直接从 COS 下载文件，Lighthouse 只返回小体积重定向响应，不代理静态文件字节。

### 发布流程

Web 或 all 部署时：

1. GitHub Actions 检出已经批准的 `main` 提交。
2. 执行完整验证。
3. 使用生产构建参数生成 `dist/`。
4. 上传允许的静态目录到以完整提交 SHA 命名的 COS 版本目录。
5. 通过 SSH 部署同一提交。
6. 把相同的 SHA 作为 `STATIC_ASSET_VERSION` 传给 Docker Compose。
7. 重建 Web，并重建 Caddy 使新版本目录立即生效。
8. 验证 `/healthz`、`/health` 和启动图重定向。

API-only 部署不构建、不上传、不切换静态版本。

### 回滚

COS 版本目录不可变且不覆盖。回滚到旧提交时，部署脚本使用回滚提交 SHA 重新构建 Web，并让 Caddy 切换回对应 COS 目录。旧版本资源不需要重新上传。

## 缓存策略

- `/assets/` 文件名带内容哈希，COS 设置 `Cache-Control: public, max-age=31536000, immutable`。
- 图片和图标位于提交 SHA 版本目录，同样设置 `Cache-Control: public, max-age=31536000, immutable`。
- `index.html`、`sw.js`、`manifest.webmanifest` 继续同源并保持 `no-cache`。
- COS 必须允许生产站点来源和本地验收来源执行 `GET`、`HEAD`，并暴露 `Content-Length`、`ETag`。

## 安全

GitHub Production Environment 新增：

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `STATIC_ASSET_BASE_URL`

Secret 只作为上传步骤环境变量使用，不进入构建产物、Docker 镜像、日志或服务器仓库。`STATIC_ASSET_BASE_URL` 是公开读地址，不是秘密。

## 失败处理

- 上传失败：停止部署，不切换线上版本。
- COS 文件缺失：部署验证失败，不报告成功。
- Caddy 重启失败：部署失败，可执行现有回滚脚本。
- COS 故障：通过把静态基址切换到备用 COS/CDN 地址并重新部署恢复；同源文件仍保留在 Web 镜像中，便于紧急关闭 Caddy 静态重定向。

## 验收

- 线上 `/assets/*`、`/pet/*`、`/icons/*`、`/navigation/*`、`/me/*` 返回到当前提交 SHA 目录的重定向。
- `/tarot/concepts/*` 不上传且不配置重定向。
- `/index.html`、`/sw.js`、`/manifest.webmanifest` 继续由 Lighthouse 同源返回。
- `/api/session` 与 `/socket.io/` 不发生 COS 重定向。
- 启动图、主 JS 和主 CSS 可以直接从 COS 下载。
- `npm run verify:full` 通过。
- 本地开发和 Mock 模式不依赖 COS。
