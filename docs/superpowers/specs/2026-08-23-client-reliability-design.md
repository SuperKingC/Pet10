# 客户端可靠性优化设计

## 背景

当前 PWA 和微信小程序在三条数据加载链路上存在可靠性缺口：

1. PWA 启动请求遇到断网或服务端临时错误时会删除仍然有效的访问令牌。
2. 小程序启动上下文或当前宠物加载失败后，仍会把启动阶段推进到 `ready`。
3. PWA 房间 bootstrap 的 `loaded/loading` 判断只影响 React 状态，不会阻止重复请求；迟到的 bootstrap 响应还可能覆盖请求期间收到的 Socket 消息。

这些问题都发生在客户端状态协调层，不需要改变服务端接口或领域规则。

## 目标

确保客户端在临时失败、重复调用和异步响应乱序时保留有效会话与最新房间消息：

- PWA 仅在 `/api/session` 明确返回 `401` 或 `403` 时清理访问令牌。
- 断网、超时和 `5xx` 保留访问令牌，并继续显示现有重新连接状态。
- 小程序只有在首屏资源、启动上下文和当前房间宠物全部准备完成后进入 `ready`。
- 小程序启动失败时保留访问令牌，停留在现有启动页并允许重新准备。
- 同一房间的并发 bootstrap 调用复用同一个 Promise；成功加载过的房间不重复请求。
- bootstrap 返回时合并请求期间收到的消息，不允许旧快照删除实时消息。

## 非目标

- 不修改页面布局、文案、动画或样式。
- 不处理小程序轮询超时和轮询 single-flight。
- 不迁移 `public/tarot/concepts` 概念图。
- 不重构图片生成页面或处理现有架构警告。
- 不修改服务端 HTTP 合同、数据库、认证规则或部署配置。
- 不改变 Mock 模式的正常行为。

## 设计方案

### 1. PWA 会话错误分类

`src/services/httpClient.ts` 增加带 `status` 的 HTTP 错误类型。`apiRequest` 对非 2xx 响应继续保留现有错误消息，但同时携带响应状态码；网络层直接抛出的异常保持原样。

新增纯函数负责把会话启动异常分类为：

- `AbortError`：显示现有超时文案，不清理令牌。
- HTTP `401/403`：使用接口错误消息并清理令牌。
- HTTP `5xx`、网络 `TypeError` 或其他异常：显示可理解的错误消息，不清理令牌。

`src/main.tsx` 只消费分类结果，不再自行根据“是否抛错”决定清理令牌。正常启动、Mock 模式和登录回调保持不变。

### 2. 小程序启动失败传播

`miniapp/src/pages/index/index.tsx` 中的上下文加载函数不再吞掉异常。它完成以下工作：

1. 请求启动上下文。
2. 根据返回的 `activeRoomId` 请求当前宠物。
3. 全部成功后一次性提交 `context`、`roomId` 和 `pet` 状态。
4. 任一步失败都向调用者抛出异常。

首次启动由 `prepareLaunch` 捕获异常，设置 `launchError` 并保持 `launchPhase='preparing'`，因此现有 `MiniappLaunchLoading` 会显示重试按钮。切换房间等非启动调用在调用点捕获异常并写入现有反馈消息，避免未处理的 Promise rejection。

资源准备和上下文准备仍然并行执行。访问令牌、邀请 token 和当前小窝存储都不会因准备失败而清除。

### 3. 房间 bootstrap single-flight 与消息合并

`src/state/useRoomRuntime.ts` 使用两个 ref 管理请求生命周期：

- 已成功加载的房间集合，用于跳过后续重复 bootstrap。
- `roomId -> Promise<void>` 的在途请求表，用于让并发调用复用同一个请求。

请求成功时，bootstrap 消息快照与当前 React 状态中的消息按消息 ID 合并：

- 先保留服务端快照顺序。
- 再追加快照中不存在、但已通过 Socket 或本地发送进入当前状态的消息。
- 相同 ID 只保留一份。

请求失败时从在途表移除，不把房间标记为成功加载，以便后续调用重试。组件卸载后仍沿用现有 React 清理行为，不新增全局缓存。

## 文件边界

计划修改：

- `src/services/httpClient.ts`：HTTP 错误类型。
- `src/services/sessionStartup.ts`：会话启动错误分类纯函数。
- `src/services/sessionStartup.test.ts`：令牌清理和错误文案测试。
- `src/main.tsx`：消费分类结果。
- `src/state/useRoomRuntime.ts`：房间 single-flight、成功缓存和消息合并。
- `src/state/useRoomRuntime.test.tsx`：重复请求与 Socket/bootstrap 竞态测试。
- `miniapp/src/services/launchPreparation.ts`：可测试的启动数据准备协调器。
- `miniapp/src/services/launchPreparation.test.ts`：上下文和宠物失败传播测试。
- `miniapp/src/pages/index/index.tsx`：使用协调器并把启动异常交给现有错误页。
- `docs/features/app-navigation.md`、`docs/features/chat.md`、`docs/features/miniapp-wechat-launch.md`：同步可靠性行为。

不会修改 `server/`、CSS、图片资源或部署文件。

## 测试策略

所有行为修改遵循测试先行：

1. PWA 会话分类测试先证明 `500` 和网络错误当前无法被区分、`401` 应清理令牌。
2. 小程序启动协调测试先证明上下文或宠物请求失败必须 reject，不能返回可进入 `ready` 的结果。
3. 房间运行时测试先证明两个并发 `loadRoom` 只调用一次 bootstrap。
4. 房间运行时测试模拟 bootstrap 未完成时到达 Socket 消息，并证明请求完成后快照和实时消息都存在。

开发中运行最小测试：

```powershell
npx vitest --run src/services/sessionStartup.test.ts src/state/useRoomRuntime.test.tsx
npm test --prefix miniapp -- --run src/services/launchPreparation.test.ts
```

完成后运行：

```powershell
npx tsc -b
npm run build:weapp --prefix miniapp
npm run verify:full
npm run review
```

## 验收标准

- 已登录 PWA 在断网、请求超时或会话接口 `500` 时显示重新连接，刷新前后 token 保持不变。
- 会话接口明确返回 `401/403` 时 token 被清理并返回登录页。
- 小程序启动上下文或宠物加载失败时停留在启动页，显示错误和“重新准备”。
- 小程序重新准备成功后进入原本应进入的主界面。
- 会话列表预载后打开房间不会再次 bootstrap。
- bootstrap 期间收到的新消息在请求完成后仍可见，且相同消息不重复。
- PWA 和小程序正常启动、Mock 模式、房间切换与实时消息行为无回归。

## 未自动覆盖的验证

- 真实弱网环境下的 PWA 重连体验。
- 微信开发者工具中的断网与恢复。
- 两台真机同时发送消息时的视觉连续性。

这些场景需要在自动测试和构建通过后，通过本地验收地址与微信开发者工具继续确认。
