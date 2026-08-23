# 客户端网络性能优化设计

## 背景

当前客户端有三类可避免的等待与竞态：

1. 小程序 `apiRequest` 未设置超时，弱网请求可能长时间占用页面状态。
2. 消息页与好友五子棋使用固定 `setInterval`，前一次请求未完成时仍会启动下一次请求；页面、房间或模式切换后，旧响应还可能覆盖新状态。
3. PWA 关键图片只在模块首次执行且当时已有 token 时预载；用户从登录页完成登录后不会补跑主应用图片准备。

## 目标

- 小程序 API 默认在 15 秒超时，并允许长任务显式覆盖超时。
- 消息和五子棋轮询始终保持单请求在途，下一次轮询从前一次 settle 后计时。
- 轮询停止后，旧请求不得再提交成功或失败状态。
- PWA 在初始已有会话和登录后首次会话刷新成功时都启动同一份关键图片预载。

## 非目标

- 不改变服务端接口或轮询频率。
- 不把小程序轮询升级为 Socket.IO。
- 不修改消息、五子棋或登录页面视觉样式。
- 不处理 Tarot 概念图迁移、邀请文案、图片生成架构或 Vite 分包警告。

## 方案

### 请求超时

`miniapp/src/services/apiClient.ts` 增加 `DEFAULT_REQUEST_TIMEOUT_MS = 15_000`，并支持 `timeoutMs` 选项。所有现有调用自动获得默认超时；确实需要更长等待的调用可显式覆盖，不修改服务端合同。

### 单请求轮询

新增纯调度器 `startSingleFlightPolling(task, intervalMs)`：

- 创建后立即执行一次任务。
- 任务完成或失败后才安排下一次 `setTimeout`。
- `stop()` 清除待执行 timer，并让传给任务的 `isCurrent()` 返回 false。
- 调度器吸收任务 rejection 后继续调度；页面任务负责呈现业务错误。

消息页和五子棋好友模式使用该调度器。异步结果只在 `isCurrent()` 为 true 时写入状态，因此房间切换、模式退出和组件卸载都会拒绝迟到结果。

### PWA 登录后图片准备

新增 `src/startupAssets.ts` 作为关键图片 URL 的单一清单，并提供 `preloadAppShellImages()`。入口在以下两个时机调用：

1. 模块加载时已经是 Mock 模式或已有 token。
2. `sessionApi.getHome()` 成功返回后，包括用户刚完成登录的刷新。

预载仍是非阻塞的，不延长会话成功路径，也不改变现有加载页。

## 测试

- `apiClient.test.ts` 验证默认与覆盖超时传给 Taro。
- `singleFlightPolling.test.ts` 使用 fake timers 证明请求不重叠、settle 后再调度、stop 后 `isCurrent()` 失效。
- `miniappPolling.test.ts` 验证两个轮询入口不再使用 `setInterval` 并消费 `isCurrent()`。
- `startupAssets.test.ts` 验证集中清单完整，且入口在初始路径与会话成功路径都调用预载 helper。

## 风险与验收

- 15 秒可能不足以覆盖少数长任务，因此保留单请求覆盖入口。
- 单请求轮询会把网络耗时加到轮询周期上，这是避免堆积请求的预期行为。
- 真机弱网、微信开发者工具切换前后台和登录后首帧图片仍需人工验收。
