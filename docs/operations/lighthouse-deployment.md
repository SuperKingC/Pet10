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
| `web` | React、CSS、塔罗动画、前端图片 | `web` |
| `api` | 后端 API 和业务服务 | `api` |
| `all` | Compose、环境变量或共同契约 | 受影响服务 |

## 一次性服务器准备

1. 创建专用部署用户。
2. 为部署用户配置单独 SSH 公钥。
3. 允许该用户访问项目目录和 Docker。
4. 在服务器项目目录保存 `.env.production`。
5. 不把 `.env.production`、私钥或数据库密码提交到 GitHub。

## GitHub Secrets

生产 Environment 需要：

```text
DEPLOY_HOST
DEPLOY_PORT
DEPLOY_USER
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_PATH
DEPLOY_URL
```

## 日常发布

```text
确认本地验收
→ 合并并推送 main
→ GitHub CI 通过
→ 打开 deploy-production workflow
→ 选择 web/api/all
→ 批准 production
→ 等待健康检查
→ 打开线上验收链接
```

## 健康检查

- 前端：`/healthz`
- API：`/health`

## 回滚

部署脚本会记录上一稳定提交。回滚只处理应用代码和容器，不自动回滚数据库结构。涉及数据库迁移时必须单独制定兼容和恢复方案。

## 安全限制

- 禁止 `docker compose down -v`。
- 禁止在生产服务器编辑源码。
- 禁止部署未提交或不属于远端 `main` 的版本。
- 禁止在日志中输出生产环境变量。
