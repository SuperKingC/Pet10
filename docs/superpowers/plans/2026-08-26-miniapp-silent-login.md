# 小程序静默登录与资料补全 实施计划

**Goal:** 登录全程零点击静默完成；401 自动恢复不再卡死；微信头像/昵称在「我的」页按需补全；清理邮箱验证码死路径并为微信登录接口加限流。

**方案决定（已与用户确认）：** 方案 1 —— 登录静默，头像/昵称补全放「我的」页。

微信自 2022 年废弃 `wx.getUserProfile`，无法静默读取头像昵称。平台仅允许
`<Button open-type="chooseAvatar">`（用户点一次，弹系统选择器）与
`<Input type="nickname">`（键盘顶部快捷带出微信昵称，用户点一次确认）。
因此「一键同时拿到头像+昵称」不可实现，头像与昵称各需一次用户主动操作。
`Taro.login()` 本身不需要授权手势，所以登录可以做到零点击。

## 非目标

- 不改动头像 DIY 编辑器（`avatarConfig`）现有行为，微信头像与 DIY 头像并存，`avatarUrl` 优先。
- 不删除 `login_codes` / `invite_codes` 数据库表。按 AI_RULES「数据库迁移必须单独确认」，本次只删代码，表留待单独确认。
- 不改动塔罗、日记、消息、五子棋等其他功能。
- 不做生产部署，不改微信后台域名配置。

## 规则冲突说明

`.agents/rules/miniapp-change.md` 要求改动只在 `miniapp/`。本次 Task 6 改动 `server/`，
依据是用户在会话中明确要求「全部一起做」（含服务端删除邮箱路径、加限流两项）。
该授权仅限本次，Task 6 独立提交，可单独 revert。

---

## 前置事项

- [ ] **Step 0: 确认基线与工作区**

`git worktree list` 显示存在旧 worktree `D:/Pet10/.worktrees/miniapp-silent-login`
（分支 `codex/miniapp-silent-login`，基线 5619aa4，落后当前 main d84ed11）。
按 AGENTS.md「不要从旧 feature worktree 继续」，**不使用该 worktree**，从最新 `main` 新建分支。

`main` 上有 4 个文件的未提交改动（`.agents/rules/miniapp-change.md`、`docs/features/miniapp.md`、
`server/src/http/errorResponse.ts` 及其测试）。这些与本次改动不冲突，先单独提交这批改动再开工。

---

### Task 1: 401 自动恢复（修 bug，最高优先级）

**问题：** `apiClient.ts` 收到非 2xx 只抛错，全项目没有任何地方在 401 时清 token；
`hasAuthenticatedSession` 只判断 `Boolean(token)`。token 过期或 JWT 密钥轮换后，
用户被判定为「已登录」→ `prepareLaunch` 失败 → 停在「资源准备失败 / 重新准备」，
点多少次都同样失败，**用户永久卡死，只能删小程序重进**。

**Files:**
- Create: `miniapp/src/services/sessionRecovery.ts`
- Create: `miniapp/src/services/sessionRecovery.test.ts`
- Modify: `miniapp/src/services/apiClient.ts`
- Modify: `miniapp/src/app.tsx`

- [ ] **Step 1: 新建 `miniapp/src/services/sessionRecovery.ts`**

`apiClient` 不能直接 import `authApi`（`authApi` 已 import `apiClient`，会成环）。
用注册表打破循环：

```ts
let recover: (() => Promise<void>) | null = null
let inFlight: Promise<void> | null = null

export function registerSessionRecovery(handler: () => Promise<void>) {
  recover = handler
}

// 并发 401 只触发一次静默重登，其余等同一个 Promise
export function recoverSession() {
  if (!recover) return Promise.resolve(false)
  inFlight = inFlight ?? recover().finally(() => { inFlight = null })
  return inFlight.then(() => true, () => false)
}
```

- [ ] **Step 2: 修改 `apiClient.ts` —— 401 清 token、静默重登、重放一次**

把请求体抽成内部函数 `send()`，`apiRequest` 变为：

```ts
export async function apiRequest<T>(path, options = {}): Promise<T> {
  const response = await send<T>(path, options)
  if (response.statusCode === 401 && options.auth !== false && !options.isRetry) {
    clearAccessToken()
    if (await recoverSession()) {
      const retried = await send<T>(path, options)
      if (ok(retried)) return retried.data
      throw errorOf(retried)
    }
  }
  if (!ok(response)) throw errorOf(response)
  return response.data
}
```

要点：
- `isRetry` 内部标记，保证只重放一次，杜绝死循环。
- `auth: false` 的请求（登录接口本身）不参与恢复。
- 重登失败时保持已清空的 token，让页面回落到登录态而不是卡在「重新准备」。

- [ ] **Step 3: 在 `app.tsx` 注册恢复处理器**

在 App 组件外顶层调用一次，避免每次 render 重复注册：

```ts
registerSessionRecovery(() => authApi.loginWithWechat().then(() => undefined))
```

- [ ] **Step 4: 测试 `sessionRecovery.test.ts` + 补充 `apiClient` 测试**

用例：401 会清 token 并触发一次恢复后重放；重放成功返回数据；恢复失败时抛原错误；
重放仍 401 不再递归；并发两个 401 只触发一次 `recover`。

```powershell
npm test --prefix miniapp -- --run src/services
```

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/services miniapp/src/app.tsx
git commit -m "修复: 令牌失效后自动静默重登并重放请求，避免卡在资源准备失败"
```

---

### Task 2: 登录去掉确认弹窗，改为一次点击静默登录

**问题：** 弹窗文案承诺「读取你的微信头像和昵称」，但 `index.tsx:199` 调的是
`authApi.loginWithWechat()`（不传 profile），服务端因此写入 `displayName: '微信用户'`、
头像为空。两次点击换来零收益，且是一句假承诺。

**Files:**
- Modify: `miniapp/src/features/auth/MiniappLoginScreen.tsx`
- Modify: `miniapp/src/features/auth/MiniappLoginScreen.scss`（删除 modal 相关样式）
- Modify: `miniapp/src/features/auth/miniappLoginModal.test.ts`
- Modify: `miniapp/src/pages/index/index.tsx`

- [ ] **Step 1: 先改测试 `miniappLoginModal.test.ts`**

现有测试断言弹窗文案存在（`温馨提示`、`先让小多利认识你`、`微信一键登录`、`暂时不登录`），
这是当时的有意设计，本次推翻，测试同步重写为断言「无弹窗、一次点击即登录」：

```ts
it('logs in silently with a single tap and shows no confirmation modal', () => {
  const source = fs.readFileSync(loginScreenPath, 'utf8')

  expect(source).toContain('带我回家')
  expect(source).not.toContain('温馨提示')
  expect(source).not.toContain('微信一键登录')
  expect(source).not.toContain('暂时不登录')
  expect(source).not.toContain('modalOpen')
})
```

保留原有「不在登录页收集头像昵称」的两个用例（`chooseAvatar`/`nickname`/`hasProfile` 断言），
它们与方案 1 一致。运行预期 FAIL。

- [ ] **Step 2: 精简 `MiniappLoginScreen.tsx`**

删除 `modalOpen` state、整个 overlay/modal JSX 块（第 89-120 行）、`openWechatLogin`、
`confirmWechatLogin`；`onOpenWechatLogin` prop 一并从类型中移除。
「带我回家」按钮直接 `onClick={onWechatLogin}`。
`message` 渲染条件由 `{message && !modalOpen && ...}` 简化为 `{message && ...}`。
`MiniappLoginScreen.scss` 删除 `__overlay`、`__modal*`、`__wechat`、`__later`、`__close` 相关样式。

- [ ] **Step 3: 同步 `index.tsx`**

删除 `openWechatLogin` 函数（第 188-190 行）与传参。
`loginWithWechat` 保留现有 try/catch 结构不变（它已能在失败时回落登录态）。

- [ ] **Step 4: 运行测试**

```powershell
npm test --prefix miniapp -- --run src/features/auth src/config/homePageAuthGate.test.ts
```

预期 PASS。`homePageAuthGate.test.ts` 断言的 auth gate 结构未动，应保持通过。

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/features/auth miniapp/src/pages/index
git commit -m "优化: 登录去掉确认弹窗，一次点击静默完成微信登录"
```

---

### Task 3: 登录页并行预热已登录资源

**问题：** 登录页只预热 1 张图（`loginAssets`），`room-background.webp` 等 7 项要等登录成功后
才开始下载（`index.tsx:168-174`），登录与预热完全串行。

**Files:**
- Modify: `miniapp/src/pages/index/index.tsx`

- [ ] **Step 1: 未登录时后台预热完整资源**

把 `useEffect` 里的 `prepareLaunchAssets(loginAssets, undefined)` 改为
`prepareLaunchAssets(authenticatedLaunchAssets, undefined)`，不传 `setLaunchProgress`
（后台静默预热，不占用登录页进度条），失败静默忽略（保持现有 `.catch(() => undefined)`）。

登录成功后 `prepareLaunch` 仍会再跑一次 `prepareLaunchAssets`，此时图片已在
微信本地缓存中，`Taro.getImageInfo` 直接命中，进度条会很快跑满。

**不预取 `Taro.login()` 的 code：** code 有效期约 5 分钟，用户在登录页停留过久会失效，
预取反而引入一类新的失败。收益主要来自图片预热，这部分已经拿到。

- [ ] **Step 2: 提交**

```powershell
git add miniapp/src/pages/index
git commit -m "优化: 登录页后台预热首屏资源，登录后进度条直接命中缓存"
```

---

### Task 4: 邀请页自动静默登录

**问题：** `invite.tsx:66-76` 自己实现了一遍登录，且要求用户先点「微信登录后查看邀请」。
既然登录静默，从分享卡进来的用户应该直接看到接受/拒绝。

**Files:**
- Modify: `miniapp/src/pages/invite/invite.tsx`

- [ ] **Step 1: `useLoad` 后自动登录再拉邀请**

把现有 `useEffect([token])` 的条件 `if (token && getAccessToken())` 改为：
无 token 时先 `await authApi.loginWithWechat()`，再 `loadInvitation(token)`。
删除「微信登录后查看邀请」按钮分支（第 114-115 行）与手动 `loginWithWechat`。
自动登录失败时用 `setMessage` 展示失败原因，并保留一个「重试」按钮兜底
（不能只留一句错误文案，否则又是死角）。

从邀请卡进入本身即用户明确意图，静默建号在此场景可接受。

- [ ] **Step 2: 提交**

```powershell
git add miniapp/src/pages/invite
git commit -m "优化: 邀请页自动静默登录，打开分享卡直接展示邀请"
```

---

### Task 5: 「我的」页补全微信头像与昵称

**Files:**
- Create: `miniapp/src/services/wechatProfileAssets.ts`
- Create: `miniapp/src/features/main/miniappWechatProfile.test.ts`
- Modify: `miniapp/src/features/main/MiniappMeView.tsx`
- Modify: `miniapp/src/features/main/MiniappMeView.scss`
- Modify: `miniapp/src/services/authApi.ts`（抽出共用的头像转换）

- [ ] **Step 1: 抽出头像转 dataURL 工具 `wechatProfileAssets.ts`**

`authApi.ts` 的 `readWechatAvatar` 与 `journal-editor.tsx` 的 `photoToDataUrl` 已是同一套逻辑。
按 AI_RULES 分层，服务层新建：

```ts
const MAX_AVATAR_CHARS = 700_000  // 与服务端 sessionRoutes/authRoutes 的上限一致

export async function wechatAvatarToDataUrl(src: string): Promise<string> {
  if (src.startsWith('http') || src.startsWith('data:')) return src
  let path = src
  try {
    path = (await Taro.compressImage({ src, quality: 80 })).tempFilePath
  } catch {
    // 压缩失败时用原图
  }
  const base64 = Taro.getFileSystemManager().readFileSync(path, 'base64') as string
  const dataUrl = `data:image/jpeg;base64,${base64}`
  if (dataUrl.length > MAX_AVATAR_CHARS) throw new Error('头像太大，请换一张')
  return dataUrl
}
```

`authApi.ts` 改为复用它，删掉本地 `readWechatAvatar`。
`authApi.test.ts` 现有用例 mock 的是 `readFile`（回调式），改用 `readFileSync` 后需同步更新 mock。

- [ ] **Step 2: 「我的」页资料区加入微信头像与昵称入口**

在 `miniapp-me__profile` 区块下方新增一行「用微信资料补全」，含两个原生控件：

```tsx
<Button
  className="miniapp-me__wechat-avatar"
  openType="chooseAvatar"
  onChooseAvatar={(event) => void saveWechatAvatar(event.detail.avatarUrl)}
>
  用微信头像
</Button>
<Input
  className="miniapp-me__wechat-nickname"
  type="nickname"
  placeholder="用微信昵称"
  onBlur={(event) => void saveWechatNickname(event.detail.value)}
/>
```

`saveWechatAvatar`：`wechatAvatarToDataUrl` 转换后 `socialApi.updateProfile({ avatarUrl })`，
成功后 `setAvatarUrl`；失败 `showInfo` 提示。
`saveWechatNickname`：trim 后长度 2-12 才提交 `updateProfile({ displayName })`，成功后 `setNameDraft`。
两者都复用现有 `busy` 状态，避免并发写。

**注意：** `type="nickname"` 需在微信开发者工具真机或较新基础库下才会带出昵称，
模拟器可能退化为普通输入框。这属于平台行为，不是缺陷，验收时以真机为准。

- [ ] **Step 3: 测试 `miniappWechatProfile.test.ts`**

沿用本项目已有的「读源码断言」风格（同 `miniappLoginModal.test.ts`）：

```ts
expect(source).toContain('openType="chooseAvatar"')
expect(source).toContain('onChooseAvatar')
expect(source).toContain('type="nickname"')
```

另对 `wechatAvatarToDataUrl` 写真单元测试：http/data 直接返回、超限抛错、压缩失败回落原图。

- [ ] **Step 4: 运行测试**

```powershell
npm test --prefix miniapp -- --run src/features/main src/services
```

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/features/main miniapp/src/services
git commit -m "新增: 我的页支持用微信头像和昵称补全个人资料"
```

---

### Task 6: 服务端清理邮箱死路径 + 微信登录限流

**已确认为死代码：** 全仓搜索 `request-code`/`verify-code` 只命中 `authRoutes.ts` 自身，
无任何客户端调用。且 `docs/superpowers/plans/2026-08-26-remove-web-keep-miniapp.md`
确认小程序是唯一前端。同时该路径带两个问题：
- `authService.ts:66` 硬编码 `invites.consume('PET10-DEMO')`，与 `requestLoginCode` 校验过的
  `inviteCode` 无关，任何有效邀请码建号都会扣 `PET10-DEMO` 的次数。
- 6 位验证码校验无任何频率限制，可暴破。
- `mailMode: 'console'`（生产 example 里也是 console）会把验证码放进 `developmentCode` 响应字段。

**Files:**
- Delete: `server/src/services/authService.ts`、`server/src/services/authService.test.ts`
- Modify: `server/src/http/authRoutes.ts`、`server/src/app.ts`、`server/src/config.ts`、`server/src/config.test.ts`
- Modify: `server/src/repositories/contracts.ts`、`memoryRepositories.ts`、`postgresRepositories.ts`
- Create: `server/src/services/loginRateLimiter.ts` + 测试
- Modify: `server/src/http/authRoutes.test.ts`（新建，当前无此测试）

- [ ] **Step 1: `authRoutes.ts` 只保留微信登录 + 限流**

删除 `/request-code`、`/verify-code` 两条路由；service 入参类型收窄为
`{ loginWithWechat?(...) }`。加入按 IP 的限流：

```ts
if (!limiter.allow(clientIp(request))) throw new Error('rate_limit_exceeded')
```

`rate_limit_exceeded` 需在 `errorResponse.ts` 映射为 429。当前 `resolveErrorResponse`
把含 `limit` 的消息判为 400（`message.includes('limit')`），要在 `not_configured` 之后
插入 `message.includes('rate_limit') ? 429 :` 分支，并补 `errorResponse.test.ts` 用例。

- [ ] **Step 2: 新建 `loginRateLimiter.ts`**

复刻 `imageRateLimiter.ts` 的固定窗口实现（不复用它，语义不同且 image 版含 perDay 概念）。
默认 `perMinute: 10`，通过 `config` 暴露 `WECHAT_LOGIN_RATE_LIMIT_PER_MINUTE`（默认 10）。
注入 `now` 以便测试。

- [ ] **Step 3: 删除 authService 与仓储中的 loginCodes**

删除 `server/src/services/authService.ts` 及其测试。
`contracts.ts` 删除 `LoginCodeRepository` 接口与 `RepositoryBundle.loginCodes` 字段；
`memoryRepositories.ts` 删除 `loginCodes` Map 与 `loginCodeRepo`；
`postgresRepositories.ts` 删除 `loginCodes` 实现（第 84-94 行）。
`domain/models.ts` 的 `LoginCode` 类型一并删除。
**保留 `login_codes` 表与 `PET10-DEMO` 种子数据**（数据库迁移需单独确认）。

- [ ] **Step 4: `app.ts` 与 `config.ts` 同步**

`app.ts`：删除 `createAuthService` import 与调用，`/api/auth` 挂载改为：

```ts
app.use('/api/auth', createAuthRoutes({
  loginWithWechat: wechatAuthService
    ? (code, profile) => wechatAuthService.login(code, profile)
    : undefined
}))
```

`config.ts`：删除 `LOGIN_CODE_TTL_SECONDS`、`MAIL_MODE`、`mail`、`loginCodeTtlSeconds`。
**保留 `allowedEmails`**：`authMiddleware.ts` 仍用它约束历史邮箱 JWT（30 天内签发的仍有效），
移除会放宽现有校验。生产守卫（`config.ts:114`）改为只要求微信凭据：

```ts
if (parsed.NODE_ENV === 'production' && !(parsed.WECHAT_APP_ID && parsed.WECHAT_APP_SECRET)) {
  throw new Error('WECHAT_APP_ID/WECHAT_APP_SECRET is required in production')
}
```

同步更新 `config.test.ts`、`.env.example`、`.env.production.example`（删除 `MAIL_MODE`，
`ALLOWED_EMAILS` 保留并注明仅用于历史邮箱令牌）。

- [ ] **Step 5: 新建 `authRoutes.test.ts`**

用例：微信登录成功返回 token；未配置微信时返回 503（`wechat_login_not_configured`）；
超过限流返回 429；`/request-code`、`/verify-code` 返回 404（已删除）。

- [ ] **Step 6: 运行服务端测试与构建**

```powershell
npm run server:test; npm run server:build
```

- [ ] **Step 7: 提交**

```powershell
git add server .env.example .env.production.example
git commit -m "重构: 服务端移除邮箱验证码登录死路径并为微信登录接口加限流"
```

---

### Task 7: 文档同步

**Files:**
- Modify: `docs/features/miniapp.md`

- [ ] **Step 1: 更正登录与资料描述**

`miniapp.md:27` 现写「微信登录页支持用户主动选择微信头像并填写微信昵称」——
这与代码不符（登录页从不收集），且本次改为「我的」页补全，需改写为：

```markdown
- 微信登录一次点击静默完成，不收集头像昵称；新用户默认「微信用户」和默认头像。
- 「我的」页可用微信头像（`chooseAvatar`）和微信昵称（`type="nickname"`）补全资料，
  各需一次用户主动操作（微信平台限制，无法一键授权）。
- 令牌失效时客户端自动静默重登并重放请求，不再停留在资源准备失败页。
```

同步更新第 189 行验收清单项「微信登录可主动选择头像和填写昵称」。
新增服务端说明：仅保留 `/api/auth/wechat`，该接口按 IP 限流。

- [ ] **Step 2: 运行文档校验**

```powershell
node scripts/check-docs.mjs
```

注意 `check-docs.mjs` 会校验文档中反引号内的 `miniapp/src|server/src|docs|deploy|public`
路径必须真实存在——引用新文件时确保路径正确，引用已删除的 `authService.ts` 会报错。

- [ ] **Step 3: 提交**

```powershell
git add docs/features/miniapp.md
git commit -m "文档: 同步静默登录与我的页微信资料补全说明"
```

---

### Task 8: 全量验证与小程序重编译

- [ ] **Step 1: 全量验证**

```powershell
npm run verify:full
```

预期 `test:all`、`build:all`、`check:docs`、`check:assets` 全部通过。

- [ ] **Step 2: 按 miniapp-change 规则清缓存重编译**

```powershell
Remove-Item -Recurse -Force miniapp/dist -ErrorAction SilentlyContinue
$env:TARO_TAROT_ASSET_BASE_URL = "https://example.cos.ap-guangzhou.myqcloud.com/pet10-web/test"
npm run build:weapp --prefix miniapp
Remove-Item Env:TARO_TAROT_ASSET_BASE_URL
```

再用官方 CLI 清开发者工具缓存并重开项目：

```powershell
& "D:\Tencent\微信web开发者工具\cli.bat" cache --clean all --project "d:\Pet10\miniapp" --lang zh
```

- [ ] **Step 3: 按 AI_RULES 格式汇报**

需覆盖：修改文件、行为变化、自动验证命令与结果、预览方式、验收路径、重点检查、
未验证内容、回滚方式。

## 需用户真机验收的项（我无法自动验证）

1. **`type="nickname"` 是否带出微信昵称** —— 模拟器常退化为普通输入框，须真机确认。
2. **`chooseAvatar` 系统选择器** —— 须真机确认弹出与回填。
3. **401 自动恢复** —— 可在开发者工具用 Storage 面板把 `pet10_access_token` 改成
   无效字符串后重启小程序，预期自动静默重登进入首页，而非停在「资源准备失败」。
4. **登录一次点击** —— 确认点「带我回家」后不再出现「温馨提示」弹窗。

## 回滚方式

每个 Task 独立提交，可单独 `git revert`。Task 6（服务端）与前端改动无耦合，
可单独回滚而不影响 Task 1-5。

