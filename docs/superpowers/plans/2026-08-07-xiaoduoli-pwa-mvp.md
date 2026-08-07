# 小多利 PWA 首版实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可在 iPhone Safari 中添加到主屏幕的 PWA 原型，先跑通固定好友、统一三方聊天室、AI 小多利回复和基础宠物养成闭环。

**Architecture:** 使用 React + TypeScript + Vite 构建前端，业务状态通过独立 store 管理，AI 与实时聊天通过可替换的 API 适配层接入；在阿里云后端完成前端接入前，使用本地 mock 数据保持完整可演示。占位小狗使用内联 SVG 与 CSS 局部动画，真实小多利素材后续只替换资源层。

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS, Web App Manifest, Service Worker

## Global Constraints

- 首版只提供一只默认共享宠物，名称固定为“小多利”。
- 每个账号首版最多绑定一位好友，但数据接口不阻止未来多好友、多宠物。
- 聊天室统一展示用户 A、用户 B 和共享 AI 宠物。
- 完整聊天记录、近期上下文、摘要和长期记忆必须有独立边界。
- API Key 不得进入前端代码；前端只调用后端适配接口。
- 图片消息首版支持选择、预览和发送 mock 图片；真实 OSS 上传留在适配层。
- 宠物养成数值由业务规则计算，不能由 AI 回复直接决定。
- 先保证移动端 390px 宽度体验，并适配安全区域。

### Task 1: Create the Vite PWA shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/icons/icon.svg`
- Create: `tsconfig.json`
- Create: `vite.config.ts`

- [ ] Define scripts for `dev`, `build`, `test`, and `preview`.
- [ ] Add the app entry and register the service worker in production.
- [ ] Add mobile viewport metadata and PWA manifest.
- [ ] Add a warm mobile-first visual system with safe-area padding.
- [ ] Run `npm install` and `npm run build`.

### Task 2: Add domain models and deterministic mock store

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/petRules.ts`
- Create: `src/domain/petRules.test.ts`
- Create: `src/state/mockStore.ts`

- [ ] Define users, relationship, room, messages, pet state, and memories.
- [ ] Test feeding, playing, sleeping, daily caps, and stat clamping before implementation.
- [ ] Implement deterministic state transitions independent from UI.
- [ ] Seed a two-person room with 小多利 and representative messages.
- [ ] Run the focused Vitest suite.

### Task 3: Build the chat and pet UI

**Files:**
- Create: `src/components/PetAvatar.tsx`
- Create: `src/components/MessageBubble.tsx`
- Create: `src/components/PetStatusCard.tsx`
- Create: `src/components/PetActionBar.tsx`
- Create: `src/components/ChatScreen.tsx`
- Modify: `src/main.tsx`

- [ ] Render a unified three-party chat with distinct user and pet bubbles.
- [ ] Add text sending, `@小多利`, call-pet, image preview, and mock AI response.
- [ ] Add pet status, level, experience, and four care actions.
- [ ] Add pet state-dependent expression and simple local animation.
- [ ] Keep UI labels in Chinese and make the phone layout thumb-friendly.

### Task 4: Add memory and backend adapter boundaries

**Files:**
- Create: `src/services/chatApi.ts`
- Create: `src/services/memoryService.ts`
- Create: `src/components/MemoryPanel.tsx`
- Modify: `src/state/mockStore.ts`
- Modify: `src/components/ChatScreen.tsx`

- [ ] Expose API-shaped methods for messages, AI replies, image upload, and memory operations.
- [ ] Keep mock behavior behind the same interface intended for an Aliyun Node.js backend.
- [ ] Show shared pet memories and allow deleting a memory in the prototype.
- [ ] Ensure image analysis is explicit and not automatic.

### Task 5: Verify the prototype

**Files:**
- Modify: `README.md`

- [ ] Document local startup and iPhone “Add to Home Screen” testing.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Start the dev server and inspect the responsive UI in a browser.
- [ ] Confirm the later asset swap only requires replacing the avatar asset component.
