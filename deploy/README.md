# Pet10 腾讯云 Lighthouse 部署

## 推荐流程

```text
本地验收 → 合并 main → CI 通过 → 手动运行 Deploy Production
→ GitHub Environment 批准 → Lighthouse 固定脚本 → 健康检查
```

## 一次性服务器准备

```bash
cd /opt
git clone https://github.com/SuperKingC/Pet10.git pet10
cd /opt/pet10
cp .env.production.example .env.production
chmod +x deploy/*.sh deploy/lib/*.sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

生产 `.env.production` 只保存在服务器。不要提交真实密码、JWT Secret 或 AI Key。

## GitHub Environment

创建名为 `production` 的 Environment，并启用 required reviewer。配置：

```text
DEPLOY_HOST
DEPLOY_PORT
DEPLOY_USER
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_SSH_KNOWN_HOSTS
DEPLOY_PATH
DEPLOY_URL
```

建议使用专用部署用户和独立 SSH Key，不使用 root 密码。

`DEPLOY_SSH_KNOWN_HOSTS` 需要填入服务器的 SSH 主机公钥行，而不是服务器密码。首次在可信网络中从本地电脑运行 `ssh-keyscan -p <端口> <服务器地址>` 获取并人工确认后，再保存到 GitHub 的 `production` Environment Secret。

## 更新类型

```bash
DEPLOY_PUBLIC_URL=https://your-domain.example ./deploy/update-web.sh <commit>
DEPLOY_PUBLIC_URL=https://your-domain.example ./deploy/update-api.sh <commit>
DEPLOY_PUBLIC_URL=https://your-domain.example ./deploy/update-all.sh <commit>
```

- `web`：React、CSS、塔罗动画和前端图片。
- `api`：服务端 API。
- `all`：Compose、环境变量或前后端共同变化。

脚本只接受属于远端 `main` 的提交，要求服务器工作区干净，并使用 detached HEAD 部署准确版本。

## 验证与回滚

```bash
DEPLOY_PUBLIC_URL=https://your-domain.example ./deploy/verify.sh
DEPLOY_PUBLIC_URL=https://your-domain.example ./deploy/rollback.sh
```

- `/healthz`：前端 Nginx。
- `/health`：API 代理。

回滚不处理数据库 schema。数据库迁移必须单独设计兼容和恢复方案。

## 腾讯云防火墙

只开放：

- TCP `22`
- TCP `80`
- TCP `443`
- UDP `443`（可选）

不要公开 PostgreSQL `5432`、Redis `6379` 或 API `8787`。

## 图片与更新速度

`.dockerignore` 排除了 `public/tarot/concepts`。约 `202.9 MB` 的原始概念图不会进入 Docker 构建上下文，正式塔罗展示图仍保留高质量版本。
