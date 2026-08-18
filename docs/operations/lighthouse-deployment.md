# 腾讯云 Lighthouse 部署

## 目标

GitHub 自动测试通过后，由维护者手动批准生产部署。服务器只运行仓库中的固定脚本，不直接手工修改业务代码。

## 现有服务

`docker-compose.prod.yml` 包含：

- `caddy`
- `web`
- `api`
- `postgres`
- `redis`

## 更新类型

| 类型 | 使用场景 | 重建服务 |
| --- | --- | --- |
| `web` | React、CSS、塔罗动画、前端图片 | 上传 COS，重建 `web`，重建 `caddy` |
| `api` | 后端 API 和业务服务 | `api` |
| `all` | Compose、环境变量或共同契约 | 受影响服务 |

## 一次性服务器准备

1. 创建专用部署用户。
2. 为部署用户配置单独 SSH 公钥。
3. 允许该用户访问项目目录和 Docker。
4. 在服务器项目目录保存 `.env.production`。
5. 设置公开的 `STATIC_ASSET_BASE_URL` 和当前完整提交 SHA `STATIC_ASSET_VERSION`。
6. 不把 `.env.production`、私钥或数据库密码提交到 GitHub。

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

`STATIC_ASSET_BASE_URL` 是 COS 公共读目录，例如 `https://<bucket>.cos.<region>.myqcloud.com/pet10-web`。末尾可带 `/`，工作流和部署脚本会在拼接版本路径前统一去除。URL pathname 会同时作为 COS Object Key 前缀；该示例会上传到 `pet10-web/{完整提交 SHA}/...`。COS 密钥只提供给 GitHub 上传步骤，不传给 SSH 部署命令。

## COS Bucket

- 公共读取对象，禁止目录写入权限暴露给浏览器。
- CORS 允许生产站点来源和本地验收来源执行 `GET`、`HEAD`。
- 允许请求头 `*`。
- 暴露 `Content-Length`、`ETag`。
- 对象键格式为 `{STATIC_ASSET_BASE_URL pathname}/{完整提交 SHA}/{运行时路径}`；运行时路径包含 `nest/`，pathname 为空时直接从完整提交 SHA 开始。
- 上传对象使用 `Cache-Control: public, max-age=31536000, immutable`。
- `tarot/concepts/` 不得上传。

## 日常发布

```text
确认本地验收
→ 合并并推送 main
→ GitHub CI 通过
→ 打开 deploy-production workflow
→ 选择 web/api/all
→ 批准 production
→ web/all 构建并上传 COS 版本目录
→ 等待健康检查
→ 打开线上验收链接
```

## 健康检查

- 前端：`/healthz`
- API：`/health`
- 静态资源：`/pet/xiaoduoli.png` 返回指向当前提交 SHA 目录的 `302`

## 回滚

部署脚本会记录上一稳定提交和公开 COS 基址。Web 回滚会让 Caddy 切换到旧提交 SHA 目录；版本资源不可变，因此不需要重新上传。回滚只处理应用代码和容器，不自动回滚数据库结构。涉及数据库迁移时必须单独制定兼容和恢复方案。

## 安全限制

- 禁止 `docker compose down -v`。
- 禁止在生产服务器编辑源码。
- 禁止部署未提交或不属于远端 `main` 的版本。
- 禁止在日志中输出生产环境变量。
- 禁止把 COS SecretId、SecretKey 写入服务器 `.env.production`、远程命令或部署摘要。
