# Pet10 腾讯云测试部署

本方案使用 `sslip.io` 提供的免费解析地址，通过
`https://43-156-174-77.sslip.io` 测试 Pet10，无需提前购买域名。

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
- TCP `80`：HTTPS 证书签发及 HTTP 跳转
- TCP `443`：Pet10 HTTPS 网页
- UDP `443`：HTTP/3，可选但建议放行

不要向公网放行 PostgreSQL `5432`、Redis `6379` 或 API `8787`。

## 验证

```bash
curl -i https://43-156-174-77.sslip.io/healthz
curl -i https://43-156-174-77.sslip.io/api/session
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
