# Pet10 · 小多利

Pet10 是面向固定好友的共享 AI 宠物 PWA。两位好友可以聊天、共同照顾小多利，并使用每日运势、塔罗、五子棋和图片生成等功能。

## 快速开始

```powershell
npm install
npm run dev
```

默认使用 Mock 数据，浏览器打开 `http://127.0.0.1:5173`。

## 常用命令

```powershell
npm test -- --run
npm run server:test
npm run build:all
npm run check:assets
```

后续护栏完成后还会提供：

```powershell
npm run review
npm run verify:quick -- --scope=tarot
npm run verify:full
```

## 项目结构

```text
src/                  React PWA
server/src/           Express + TypeScript API
public/               正式运行资源
docs/features/        面向非技术维护者的中文功能文档
docs/visual-baselines/视觉与动画验收标准
.agents/              项目规则和 AI Skills
deploy/               腾讯云 Lighthouse 部署文件
```

## 文档入口

- 功能说明：`docs/features/README.md`
- AI 协作规则：`AI_RULES.md`
- 图片资源清单：`docs/assets/asset-manifest.md`
- 塔罗视觉基线：`docs/visual-baselines/tarot/README.md`
- 实施计划：`docs/superpowers/plans/2026-08-10-ai-maintainability-implementation.md`

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

前端 `.env` 示例：

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8787
```

生产环境使用 `docker-compose.prod.yml`。生产密钥只保存在服务器的 `.env.production`，不能提交到 Git。
