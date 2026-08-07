# Pet10 · 小多利

面向固定好友内部使用的共享 AI 宠物 PWA。两位好友拥有一个统一三方聊天室，并共同照顾 AI 小狗“小多利”。

## 当前能力

- 可安装到 iPhone 主屏幕的 PWA
- 统一三方聊天室与图片消息预览
- `@小多利`、主动叫宠物和 AI 回复
- 喂食、玩耍、清洁、睡觉与成长数值
- 完整聊天、近期上下文、长期共同记忆的数据边界
- 邀请码 + 邮箱验证码后端服务
- 首版一人一位好友的绑定限制
- PostgreSQL 数据模型、Socket.IO 实时事件和 OpenAI-compatible AI 服务
- Mock/真实 API 双模式前端适配

## 项目结构

```text
src/                  React PWA
server/src/           Express + TypeScript API
server/sql/           PostgreSQL 初始化脚本
docker-compose.yml    PostgreSQL + Redis 本地环境
docs/superpowers/     设计和实施计划
```

## 快速启动：Mock 模式

```powershell
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。Mock 模式不需要数据库和 AI Key。

## 启动真实后端

1. 复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

2. 启动 PostgreSQL 和 Redis：

```powershell
docker compose up -d
```

3. 启动 API：

```powershell
npm run server:dev
```

API 健康检查：`http://localhost:8787/health`

开发环境 `MAIL_MODE=console` 时，邮箱验证码会打印在 API 控制台。初始化邀请码为 `PET10-DEMO`。

## 使用真实 API

在根目录 `.env` 设置：

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:8787
VITE_DEMO_ROOM_ID=<登录并绑定好友后获得的房间 ID>
```

当前 UI 默认直接展示原型聊天室。登录、加好友和选择房间的完整页面是下一阶段前端任务；认证 API 已可调用：

```text
POST /api/auth/request-code
POST /api/auth/verify-code
POST /api/friendships
POST /api/friendships/:id/accept
GET  /api/rooms/:roomId
POST /api/rooms/:roomId/messages
POST /api/rooms/:roomId/pet-replies
POST /api/rooms/:roomId/pet-actions
GET  /api/rooms/:roomId/memories
DELETE /api/rooms/:roomId/memories/:memoryId
```

## 配置 AI

服务端支持 OpenAI-compatible Chat Completions 接口：

```env
AI_API_KEY=你的服务端密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

也可以把 `AI_BASE_URL` 和 `AI_MODEL` 改为你的兼容服务。未配置 Key 时，小多利会返回友好的降级消息，普通聊天不会丢失。

## 验证

```powershell
npm run test:all
npm run build:all
docker compose config
```

## iPhone 安装测试

1. 将前端 `dist` 部署到 HTTPS 域名。
2. 用 iPhone Safari 打开网站。
3. 点击分享按钮。
4. 选择“添加到主屏幕”。
5. 从桌面图标重新打开。

## 阿里云部署建议

- ECS 或轻量应用服务器：Node.js API、Nginx、Socket.IO
- RDS PostgreSQL：业务数据
- Redis：验证码、在线状态和后续任务队列
- OSS：聊天图片与正式小多利素材
- HTTPS 域名：PWA 与 API
- AI API Key：仅保存在服务器环境变量或阿里云密钥管理服务

`src/components/PetAvatar.tsx` 是当前占位资源入口，后续替换正式 PNG、WebP 或分层动画资源不影响业务接口。
