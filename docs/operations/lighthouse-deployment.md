# 腾讯云 Lighthouse 部署

## 目标

GitHub 自动测试通过后，由维护者手动批准生产部署。服务器只运行仓库中的固定脚本，不直接手工修改业务代码。

## 现有服务

`docker-compose.prod.yml` 包含：

- `caddy`
- `api`
- `postgres`
- `redis`

`deploy/Caddyfile` 只配置 `api.pet10kk.com` 反代到 `api:8787`。仓库不再托管网页站点，`pet10kk.com` 主域名没有对应服务。

## 更新类型

| 类型 | 使用场景 | 动作 |
| --- | --- | --- |
| `assets` | 塔罗图片 | 上传 COS 版本目录，不连接服务器 |
| `api` | 后端 API 和业务服务 | 重建 `api` |
| `all` | Compose、环境变量或共同契约 | 上传 COS 并重建受影响服务 |

## 一次性服务器准备

1. 创建专用部署用户。
2. 为部署用户配置单独 SSH 公钥。
3. 允许该用户访问项目目录和 Docker。
4. 在服务器项目目录保存 `.env.production`。
5. 不把 `.env.production`、私钥或数据库密码提交到 GitHub。
6. 将 `api.pet10kk.com` 解析到 Lighthouse 公网 IP；生产 Caddy 配置由仓库中的 `deploy/Caddyfile` 管理，不在服务器直接修改。

## GitHub Secrets

生产 Environment 需要：

```text
DEPLOY_HOST
DEPLOY_PORT
DEPLOY_USER
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_SSH_KNOWN_HOSTS
DEPLOY_PATH
DEPLOY_URL
COS_SECRET_ID
COS_SECRET_KEY
COS_BUCKET
COS_REGION
STATIC_ASSET_BASE_URL
```

`DEPLOY_SSH_KNOWN_HOSTS` 必须保存服务器的固定 SSH 主机公钥行（`known_hosts` 格式）。不要在 GitHub Actions 中临时使用 `ssh-keyscan` 获取该值，以免首次连接遭受中间人攻击。

`STATIC_ASSET_BASE_URL` 是 COS 公共读目录，例如 `https://<bucket>.cos.<region>.myqcloud.com/pet10-web`。末尾可带 `/`，工作流和上传脚本会在拼接版本路径前统一去除。URL pathname 会同时作为 COS Object Key 前缀；该示例会上传到 `pet10-web/{完整提交 SHA}/...`。小程序构建的 `TARO_ASSET_BASE_URL` 必须指向同一版本目录（GitHub secret 沿用旧名 `TARO_TAROT_ASSET_BASE_URL` 注入）。COS 密钥只提供给 GitHub 上传步骤，不传给 SSH 部署命令。

## COS Bucket

- 公共读取对象，禁止目录写入权限暴露给浏览器。
- CORS 允许小程序请求来源执行 `GET`、`HEAD`。
- 允许请求头 `*`。
- 暴露 `Content-Length`、`ETag`。
- 对象键格式为 `{STATIC_ASSET_BASE_URL pathname}/{完整提交 SHA}/tarot/...`；pathname 为空时直接从完整提交 SHA 开始。
- 上传对象使用 `Cache-Control: public, max-age=31536000, immutable`。
- `design-assets/` 概念图不得上传。
- COS 域名必须加入微信小程序后台的 downloadFile 合法域名。

## 日常发布

```text
确认本地验收
→ 合并并推送 main
→ GitHub CI 通过
→ 打开 deploy-production workflow
→ 选择 assets/api/all
→ 批准 production
→ assets/all 上传 COS 版本目录
→ api/all 等待健康检查
→ 打开线上验收链接
```

## 健康检查

- API：`/health`
- 塔罗资源：抽查 COS 版本目录中的 `tarot/ui/card-back.jpg` 与 `tarot/cards/the-fool.jpg` 可公共读取。

## 回滚

部署脚本记录上一稳定 commit。API 回滚重建旧版本镜像；塔罗资源回滚通过重新构建指向旧 COS 版本目录的小程序完成，旧目录不可变，不需要重新上传。回滚只处理应用代码和容器，不自动回滚数据库结构。涉及数据库迁移时必须单独制定兼容和恢复方案。

## 安全限制

- 禁止 `docker compose down -v`。
- 禁止在生产服务器编辑源码。
- 禁止部署未提交或不属于远端 `main` 的版本。
- 禁止在日志中输出生产环境变量。
- 禁止把 COS SecretId、SecretKey 写入服务器 `.env.production`、远程命令或部署摘要。
