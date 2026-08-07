# 小多利 PWA

一个面向固定好友内部测试的共享 AI 宠物聊天原型。当前版本使用本地 mock API，重点验证统一三方聊天室、图片消息、AI 宠物回复、共同记忆和基础养成体验。

## 本地运行

```powershell
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 测试与构建

```powershell
npm test -- --run
npm run build
npm run preview
```

## iPhone PWA 测试

1. 将构建结果部署到支持 HTTPS 的域名。
2. 用 iPhone Safari 打开网站。
3. 点击分享按钮。
4. 选择“添加到主屏幕”。
5. 从桌面图标重新打开。

本地局域网测试可临时使用 Vite 的局域网地址，但 Service Worker 和完整 PWA 安装体验建议使用 HTTPS。

## 后续接入点

- `src/services/chatApi.ts`：替换为阿里云 Node.js API、WebSocket 和 OSS 上传。
- `src/services/memoryService.ts`：替换为数据库长期记忆接口。
- `src/components/PetAvatar.tsx`：替换为正式小多利 PNG、WebP 或分层动画资源。
- `src/state/mockStore.ts`：替换为登录后从后端加载的好友关系、聊天室和宠物数据。

AI API Key 必须保存在服务端环境变量中，不得加入 PWA 源码或浏览器存储。
