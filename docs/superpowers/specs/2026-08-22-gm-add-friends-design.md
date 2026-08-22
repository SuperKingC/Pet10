# GM 入口：添加好友模拟（设计文档）

日期：2026-08-22
状态：已确认

## 目标

在小程序端提供隐藏的 GM 入口，可以为当前登录账号一键添加指定数量的假好友，快速模拟「一个好友」和「多个好友」两种场景，用于开发调试。

## 非目标

- 不做删除/清空假好友能力。
- 不做假好友昵称自定义、模拟发消息等扩展能力。
- 不做 GM 接口的密钥/权限防护（已确认仅靠小程序隐藏入口）。
- 不涉及 Web 端（src/）。

## 总体方案

服务端新增 GM 服务与路由，复用现有好友领域逻辑（`friendshipService`）：创建假用户 → 发起好友请求 → 自动接受。接受流程会自动生成好友关系、专属房间和宠物，与真实好友数据完全一致，会话列表、房间、聊天等现有功能无需任何适配。

小程序端在「我的」页关于弹窗中长按版本号文本，打开 GM 弹窗，选择数量后调用 GM 接口。

## 服务端设计

### gmService（新增 `server/src/services/gmService.ts`）

`createGmService(repositories, friendshipService)` 提供：

- `addFriends(userId: string, count: number): Promise<{ added: { userId, displayName }[] }>`
- 循环 `count` 次：
  1. `repositories.users.create` 创建假用户：用户名 `gm_friend_<随机8位>`，邮箱 `gm_friend_<随机8位>@gm.local`，昵称 `测试好友N`（N 递增，避免同账号重复生成时昵称混淆，附随机后缀）。
  2. `friendshipService.sendRequest(userId, 假用户username)` 发起好友请求。
  3. `friendshipService.acceptRequest(假用户.id, relationship.id)` 自动接受，自动创建房间与宠物。
- 单次上限 10；`count` 超出范围抛 `invalid_count`。

### gmRoutes（新增 `server/src/http/gmRoutes.ts`）

- `POST /api/gm/friends`：body 用 Zod 校验 `{ count: number (1-10) }`，调用 `gmService.addFriends`，返回 201 与新增好友摘要。
- 在 `app.ts` 中挂到 `authenticate` 之后：`app.use('/api/gm', authenticate, createGmRoutes(gmService))`。
- 遵循现有路由工厂函数模式与字符串错误码约定。

## 小程序端设计

### gmApi（新增 `miniapp/src/services/gmApi.ts`）

- `gmApi.addFriends(count: number)` → `apiRequest('/api/gm/friends', { method: 'POST', body: { count } })`。

### GM 入口与弹窗（修改 `MiniappMeView.tsx`）

- 关于弹窗中的版本号文本 `小多利 v2.0` 增加 `onLongPress`，打开 GM 弹窗。
- GM 弹窗复用通用 `MiniappModal`（居中弹窗视觉规范）：
  - 标题：GM 工具
  - 说明：为当前账号添加测试好友
  - 数量快捷按钮：1 / 3 / 5（选中态），确认按钮「添加好友」
  - loading 态：请求中禁用按钮
  - 结果：成功用 `Taro.showToast` 提示「已添加 N 个好友」，失败提示错误
- 样式写入 `MiniappMeView.scss`，遵循现有命名规范（`miniapp-gm__*`）。

## 数据流

```mermaid
flowchart LR
  A["长按版本号"] --> B["GM 弹窗选数量"]
  B --> C["POST /api/gm/friends"]
  C --> D["gmService.addFriends"]
  D --> E["创建假用户"]
  E --> F["friendshipService.sendRequest"]
  F --> G["friendshipService.acceptRequest"]
  G --> H["关系+房间+宠物"]
  H --> I["会话列表出现新好友"]
```

## 错误处理

- `count` 不在 1-10：服务端返回错误，前端 toast 提示。
- 网络/接口失败：前端 toast 提示「添加失败」，弹窗保留可重试。
- 假用户用户名冲突：生成随机后缀，冲突时重试一次。

## 测试计划

- `server/src/services/gmService.test.ts`：内存仓储下验证生成 N 个已接受好友关系、对应房间与宠物均存在，数量上限校验。
- `server/src/http/gmRoutes.test.ts`：supertest 验证 201 返回与参数校验。
- `miniapp/src/services/gmApi.test.ts`：验证请求路径与参数。
- `miniappPresentation` 相关测试如涉及 Me 视图结构则同步更新。

## 验收

- [ ] 小程序关于弹窗长按版本号可打开 GM 弹窗。
- [ ] 选择数量后成功添加对应数量的好友，会话列表出现新好友房间。
- [ ] 分别验证 1 个好友和多个好友场景。
- [ ] 相关测试通过。
