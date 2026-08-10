# 部署与服务器更新

## 当前架构

腾讯云 Lighthouse 运行 Docker Compose：

- `caddy`：HTTPS 和入口。
- `web`：Nginx 静态前端。
- `api`：Node API。
- `postgres`：业务数据。
- `redis`：缓存和临时状态。

## 推荐发布流程

```mermaid
flowchart LR
  A["本地验收"] --> B["合并 main"]
  B --> C["GitHub CI"]
  C --> D["手动批准 production"]
  D --> E["服务器固定脚本"]
  E --> F["健康检查"]
  F --> G["线上验收"]
```

## 更新类型

- `web`：React、CSS、塔罗动画和前端图片。
- `api`：服务端路由和业务服务。
- `all`：Compose、环境变量或前后端共同变化。

## 安全规则

- 生产只部署已提交的 `main`。
- 不在服务器手工编辑业务代码。
- 不使用 `docker compose down -v`。
- 数据库迁移必须单独确认。

详细配置见后续的 `docs/operations/lighthouse-deployment.md`。
