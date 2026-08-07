# Pet10 腾讯云测试部署

本方案用于没有域名时，通过 `http://43.156.174.77` 测试 Pet10。

## 部署

```bash
cd /opt
git clone https://github.com/SuperKingC/Pet10.git pet10
cd /opt/pet10

cp .env.production.example .env.production
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
sed -i "s|replace-with-a-strong-database-password|$POSTGRES_PASSWORD|" .env.production
sed -i "s|replace-with-a-long-random-string|$JWT_SECRET|" .env.production

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

腾讯云防火墙只需放行：

- TCP `22`：SSH
- TCP `80`：Pet10 测试网页

不要向公网放行 PostgreSQL `5432`、Redis `6379` 或 API `8787`。

## 验证

```bash
curl -i http://127.0.0.1/healthz
curl -i http://127.0.0.1/api/session
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100
```

`/api/session` 未携带登录令牌时返回 `401` 属于正常现象。

## 更新

```bash
cd /opt/pet10
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 停止

```bash
cd /opt/pet10
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

不要执行 `down -v`，否则会删除 PostgreSQL 和 Redis 数据卷。

