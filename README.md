# Pet10 · 小多利

Pet10 是面向固定好友的共享 AI 宠物项目：微信小程序 + 服务端。两位好友可以聊天、共同照顾小多利，并使用智能问答、每日运势、塔罗和五子棋等功能。真实后端模式下，小多利会对实时或专业问题自动检索并整理回答。

## 项目结构

```text
miniapp/              Taro + React 微信小程序
server/src/           Express + TypeScript API
public/tarot/         塔罗运行时资源（上传 COS）
docs/features/        面向非技术维护者的中文功能文档
.agents/              项目规则和 AI Skills
deploy/               腾讯云 Lighthouse 部署文件
```

## 常用命令

```powershell
npm install
npm test -- --run
npm test --prefix miniapp
npm run server:test
npm run build:all
npm run check:assets
npm run verify:full
```

小程序构建需要提供塔罗资源 COS 基址：

```powershell
$env:TARO_TAROT_ASSET_BASE_URL = "https://<bucket>.cos.<region>.myqcloud.com/pet10-web/<完整提交SHA>"
npm run build:weapp --prefix miniapp
```

## 文档入口

- 功能说明：`docs/features/README.md`
- 小程序：`docs/features/miniapp.md`
- AI 协作规则：`AI_RULES.md`
- 图片资源清单：`docs/assets/asset-manifest.md`

## 使用真实后端

复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

启动 PostgreSQL、Redis 和 API：

```powershell
docker compose up -d
npm run server:dev
```

API 健康检查：`http://127.0.0.1:8787/health`

小程序连接本机 API：

```powershell
$env:TARO_API_BASE_URL = "http://127.0.0.1:8787"
```

生产环境使用 `docker-compose.prod.yml`。生产密钥只保存在服务器的 `.env.production`，不能提交到 Git。
