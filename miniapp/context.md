# miniapp context

## 2026-08-28（游戏中心页首插画换趴窝小多利并放大）

- **原因**：验收反馈——页首右侧站立小多利换成小多利趴在窝垫上的那张插画；随后反馈图标要更大。
- **修改**：
  - `MiniappGamesPage.tsx`：页首右侧 `puppyImage` 由 `assets/xiaoduoli.png` 改引 `assets/journal/puppy-cushion.png`（480×280 横构图，复用既有 runtime 图，无新增资源）
  - `MiniappGamesPage.scss`：`__puppy` 132×96 → 192×112（源码 px 按 designWidth 750 以 1:1 转为 rpx），并加 `margin-left: -40px / margin-right: -6px` 向标题区借宽、向右出血（图框比例=图片 1.714 消除 aspectFit 留白），标题与简介仍单行
- **验证**：miniapp vitest 全量通过；清 `dist` 重编译成功；CLI `cache --clean all` 后模拟器预览

## 2026-08-28（返回按钮改细箭头无外圈）

- **原因**：验收反馈——圆形白底 + 描边 + 投影太醒目，只要一个箭头，不要那么粗、不要外面的圈。
- **修改**：
  - `MiniappBackButton.scss`：去掉底色/描边/圆/投影，箭头描边 6→4rpx、图标 22→20rpx，按压反馈改为仅透明度变淡；外框仍 72rpx 保住命中区域
  - `MiniappBackButton.tsx/.test.ts`：注释与断言同步「arrow-only、无 border-radius:50%/box-shadow/background」
- **验证**：聚焦测试 3/3、全量 200/200 通过；重编译 dist + CLI 清缓存

## 2026-08-28（统一全小程序返回按钮）

- **原因**：5 处返回入口各写各的——写日记顶栏是裸 `‹` 文本、纪念日面板是纯文字「返回」、今日运势页是方圆角按钮、游戏中心/五子棋是奶油底圆形按钮（米底上几乎看不见），观感不一致且不醒目。
- **修改**：
  - 新增 `components/MiniappBackButton.tsx/.scss`：白底圆形 + 暖棕描边（`#e8bd91`）+ 深棕加粗左箭头（CSS 边框旋转绘制），72rpx 命中区域、投影、按压反馈、`aria-label="返回"`
  - `JournalEditorForm`、`JournalAnniversaryPanel`、`MiniappFortuneView`、`MiniappGamesPage`、`MiniappGobangPanel` 改用统一组件；删除各自旧返回样式；运势页占位Spacer 同步 72rpx 保持标题居中
  - 新增 `components/MiniappBackButton.test.ts` 锁定统一实现（组件形态 + 5 处接入 + 旧样式清除）
- **验证**：miniapp vitest 全量 200/200；清 `dist` 重编译（占位 TARO_TAROT_ASSET_BASE_URL）成功，`common.wxss` 含 `miniapp-back-button` 且旧返回类已移除；CLI `cache --clean all` 成功

## 2026-08-28（信纸三轮：正文不分段与信封收窄上移）

- **原因**：验收反馈——正文不要分段；文字范围左右各加一个字；信封整体宽缩短一点；下半部分（除底部栏）上移一点。
- **修改**：
  - `MiniappNestLetter.tsx`：四句正文 `join('')` 合并为整段文字，单个 `__paragraph` 渲染（称呼、落款、领养提示不变）
  - `MiniappNestLetter.scss`：卡片由通栏 658×600rpx 改为 620×540rpx 居中（下部随高度上移 60rpx）；正文区左 118→92rpx、宽 455→469rpx（左右各放宽一字 26rpx）；`__paragraph` 去 `margin-bottom`，`__sign` 补 `margin-top: 8rpx`；九宫格切片行列不变（59/1fr/197、110/1fr/231），中列中行自适应
- **验证**：miniapp vitest 全量 197/197；清缓存重编译 dist；CLI 清缓存

## 2026-08-28（爪印菜单质感改版 + 游戏入口改整页游戏中心）

- **原因**：验收反馈——下拉栏弹出动画要更强，图标底座改方形高级质感并按一行最多四格排布（不足一行靠左）；「游戏」不再用弹窗，改为参考图风格的整页游戏中心。二轮反馈：弹出动画仍不够明显要更动感、图标偏大、底座质感再升级、去掉关闭按钮、游戏页打开要加从上往下逐列入场动画。
- **修改**：
  - `MiniappPawMenu.scss`：底座 152rpx 圆形改 124rpx 圆角方形（30rpx 圆角；镜面高光 radial + 155° 暖色渐变 + 内圈 2rpx 白描边 + 内底影 + 双层外投影），icon 100→84rpx；入口行四列网格 `repeat(4, 1fr)` 从左到右、不足一行靠左；弹出整栏 `translateY(100%)` 上滑加强到 .46s cubic-bezier(.3,1.44,.48,1)，入口 pop 加大行程 88rpx + scale(.6) + .52s 弹簧、.07s 步进（含第 4 格），标题改从上方 -26rpx 落入；关闭整栏下滑收起；`prefers-reduced-motion` 降级；`CLOSE_ANIMATION_MS` 180→240
  - `MiniappPawMenu.tsx`：移除右上角「×」关闭按钮（点遮罩或再点爪印关闭），header 改单列标题栈
  - 新增 `MiniappGamesPage.tsx/.scss`：整页游戏中心（fixed、z-index 32、标题「一起玩小游戏」+ 站立小多利 + 五子棋卡片「开始游戏」+「更多游戏敬请期待😈」）；打开动画从上往下逐列入场——header 从 -36rpx 落入、卡片 76rpx + scale(.92) 弹簧上浮按 nth-child 错帧（.14s 起每张 +.12s）、尾注后置淡入；卡片底座 110rpx/26rpx 圆角与爪印菜单同款质感；删除 `MiniappGamesModal.tsx/.scss`
  - `pages/index/index.tsx`：`gamesOpen` 渲染整页游戏中心；进入五子棋不再关闭游戏中心（z 34 棋盘盖在 z 32 游戏中心上，关棋盘即回游戏中心）
  - `miniappPresentation.test.ts`：游戏中心断言改为整页（无 `MiniappModal`、`z-index: 32`、首页渲染 `MiniappGamesPage`）+ 入场编排断言（header/卡片 keyframes 与错帧延迟）；爪印菜单断言含方形底 30rpx、四列网格、无关闭按钮、新弹簧曲线与 88rpx 行程
- **文档**：`docs/features/miniapp.md` 爪印菜单与游戏中心描述、gobang.png 用途、代码入口
- **验证**：miniapp vitest 全量 197/197；清缓存重编译 dist（产物含 games-card-in/paw-entry-pop 等新动画）；每轮经 `cli close` + `cli auto` 重开加载最新编译、页面渲染正常。动画观感与菜单/游戏中心视觉待人工在模拟器点爪印按钮验收（本机 DevTools 合成点击/按键均不生效，自动化端口未开放）

## 2026-08-28（信纸文案二轮：拖鞋句定稿、预告改领养提示）

- **原因**：验收反馈——①拖鞋句定为「枕着你的拖鞋等你」；②信件下方功能预告改为领养警示文案；③第四段重写定稿为「不会再被送走」版本。
- **修改**：`MiniappNestLetter.tsx`：第二段结尾定稿「你出门时，我就枕着你的拖鞋等你。」；第四段改为「如果你们愿意，初见那天就是我新的开始。这一次，不会再有人把我送走了。」；底部提示行由「成为好友后：共享聊天 · 每日暗号 · 初见纪念」改为「小多利是独一无二的，只能养一只，请认真选择一起养的对象」（28 字，22rpx 居中会折两行）
- **文档**：`docs/features/miniapp.md` 无好友小窝描述「下方功能预告」改「下方领养提示」
- **验证**：miniapp vitest 全量、清缓存重编译 dist、CLI 清缓存

## 2026-08-28（信纸正文文案优化）

- **原因**：验收反馈——优化小窝信封（信纸）上的正文文案。
- **修改**：`MiniappNestLetter.tsx` 四段正文微调：①第二段「主人出门时，我会枕着她的拖鞋等你」改「你出门时，我就枕着你的拖鞋等门」——收信人是还没来的家人，且小多利设定被弃养、没有现任主人，原句第三人称矛盾；②第三段破折号长句拆成两句，「能装下」改「装得下」；③第一段「我被遗弃过一次」改「我曾被遗弃过一次」，第四段补「在门口」。称呼、落款、底部预告未动，正文总字数 129→130，版式与样式不变。
- **验证**：miniapp vitest 全量 195/195；清缓存重编译 dist 并校验 `dist/pages/index/index.js` 含全部新句、无旧句「主人出门时」

## 2026-08-27（运势栏上移对齐消息页底距）

- **原因**：验收反馈——今日运势栏太贴近底部栏，要上移一点。
- **修改**：`MiniappJournalView.scss` 页面底部内边距 2px→10px（与消息页底部留白一致），运势栏随整体上移 8px；庭院下移量随后按观感再调至 -85rpx
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存

## 2026-08-27（庭院与卡片底位微调）

- **原因**：验收反馈——小狗还要再往上一点、卡片底边再上提一点。
- **修改**：`JournalEditorForm.scss` 庭院下移量 -110→-70rpx（图上移 40），页面底部留白 300→330rpx（卡片底边上提 30）
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存

## 2026-08-27（GM 删除测试好友、小窝去好友名芯片、消息栏好友态修复）

- **原因**：验收反馈——①GM 工具只能加测试好友不能删；②GM 添加好友后小窝顶部出现「好友名 · Lv」芯片行；③有好友时消息栏界面有问题。
- **修改**：
  - 服务端 `gmService.removeFriends`：按用户名前缀 `gm_friend_` 识别 GM 假用户，只删这些关系与假账号（走 `users.deleteById`，Postgres 按外键级联清理关系、房间、宠物与会话数据）；新路由 `DELETE /api/gm/friends`；`RelationshipRepository` 补 `removeById`（memory/postgres 两套实现）
  - 小程序 `gmApi.removeFriends`；GM 弹窗改双按钮（添加/删除测试好友），增删成功后经新增的 `onDataChanged` 回调触发 `loadContext(roomId)` 即时刷新首页上下文（当前房间被删时服务端自动回退到剩余房间）
  - `MiniappNestView` 移除 `miniapp-nest__rooms` 芯片块与 `onSelectRoom` 链路（index 的 `selectRoom` 包装一并删除），房间切换保留在消息页会话列表
  - 消息栏修复：新展示函数 `getMessagePresentation(message, viewerId, friendName)` 按 `senderId` 区分发送者——自己=右侧「我」，好友=左侧好友昵称，小多利=左侧「小多利」（无 senderId 的历史消息保持旧「我」行为）；删除硬编码「共享房间」按钮（该入口与当前房间的会话行重复指向同一房间）
  - 测试：server gmService/gmRoutes 新增删除用例（含真实好友不被误删）；miniapp viewModel 新增 getMessagePresentation 用例；presentation 新增 GM 双操作断言、「消息页无重复房间入口」断言与小窝无芯片断言
- **顺带**：修正上「庭院下移」迭代遗留——页面底部留白改 300rpx 时 presentation 断言仍停在 260rpx，基线本就红一例；已对齐为 300rpx
- **验证**：server vitest 全量 160/160（连跑两轮）+ tsc 构建通过；miniapp vitest 194/194；清缓存重编译 dist 与 CLI 清缓存见下一记录

## 2026-08-27（清缓存重编译与 CLI 清缓存·GM/小窝/消息批次）

- **原因**：miniapp-change 规则要求每次修改后清缓存重编译，保证 DevTools 预览最新产物。
- **执行**：删除 `miniapp/dist` → `npm run build:weapp`（TARO_TAROT_ASSET_BASE_URL 本地占位）→ 对已开窗口 CLI `cache --clean all`
- **结果**：构建成功；dist 校验——`pages/index/index.js` 含 `gm/friends`、`friendName`、`删除测试好友`，解码后无 `共享房间`；全部 wxss 无 `miniapp-room-chip`/`nest__rooms`；IDE cleancache 成功

## 2026-08-27（庭院下移让小狗落进露出带）

- **原因**：验收反馈——固定一屏后露出的 260rpx 只是插画底部空草地+狗爪尖，小狗身体仍被卡片压住。
- **修改**：`JournalEditorForm.scss` 庭院图 `bottom: 0`→`-110rpx`（把插画底部约 110rpx 空草地移出屏幕，小狗整体下落进可见带）；页面底部留白 260→300rpx；卡片纵向 gap 20→16、polaroid 边距收紧补回正文空间；textarea 最低 80→60rpx
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；小狗露出完整度待 DevTools 验收

## 2026-08-27（写日记卡片上移露出庭院小狗）

- **原因**：验收反馈——固定一屏后白卡片压住了底部庭院的小狗插画，要求多露出来。
- **修改**：`JournalEditorForm.scss` 页面底部留白 160→260rpx；卡片内 nav/日期/心情行/拍立得/缩略图/工具栏/地点/删除全部 `flex-shrink: 0` 定高不可压缩，正文 textarea 最低 120→80rpx（唯一弹性区）
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；小狗露出比例待 DevTools 验收，不够再上调底部留白

## 2026-08-27（小记与写日记固定一屏）

- **原因**：验收反馈——日记文本变多会把今日日记卡撑高，盖住今日运势栏；两个页面都要求整体固定不滚动，只有日记文字区可以滚动。
- **修改**：
  - `MiniappJournalView.tsx/.scss`：容器 `min-height`→固定 `height: calc(100vh - 220px)` + `overflow: hidden`；body/今日块 `flex:1 + min-height:0` 裁剪「查看」展开的历史卡片；stage 固定 292rpx；正文 `Text` 改 `ScrollView scrollY`（去掉 7 行 clamp，保留 `word-break: break-all`），运势条恒在底部可见
  - `JournalEditorForm.scss`：覆盖层 `overflow` auto→hidden；页面改 flex 列布局占满一屏（底部庭院露出约 160rpx，卡片压住上部）；卡片 `flex:1` 定高，正文 textarea 成唯一弹性区（`flex:1`、min 120rpx，内容多时框内滚动），缩略图行/地点输入出现时压缩正文区而非撑高卡片
  - 更新展示层断言（height/overflow/scrollY/stage 292/textarea flex）与 `docs/features/miniapp.md`
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；小屏机型（如 SE）写日记页 textarea 会被压得更矮，待真机确认可接受

## 2026-08-27（写提示入框与照片大图预览）

- **原因**：验收反馈——「点这里放今天的照片」绝对定位在框下方，压住了工具栏；顺带确认多图能力并要求能查看大图。
- **修改**：
  - `JournalEditorForm.scss`：空态图高度收到 290rpx（300 宽原比例），提示改为框内静态流式排版，总高仍在 326 外框内，不再遮挡工具栏
  - `JournalEditorForm.tsx`：新增 `previewPhotos`（`Taro.previewImage`）；点有照片的主图弹「查看大图/更换照片」ActionSheet，点缩略图直接从该张预览大图，缩略图 × 加 `stopPropagation` 防止误触发预览
  - 更新展示层断言与 `docs/features/miniapp.md`
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；预览交互待 DevTools 验收

## 2026-08-27（日记邮票放大且切换不跳变）

- **原因**：验收反馈——今日日记卡与写日记页默认邮票要再大一点（写日记页尤其），且换成自己的照片后尺寸突然变大；要求两态尺寸一致。
- **修改**：
  - `JournalEditorForm.scss`：拍立得区统一 300×326 外框——空态奔跑邮票 aspectFit 居中、提示文字绝对定位框下（不占高）；上传照片白框 272 内衬 + 14/14/40 边衬（外径同为 300×326），倾角 +6°
  - `MiniappJournalView.scss`：今日日记卡默认邮票 260×276→280×292，上传照片白框 264 内衬 + 8/8/20（外径同为 280×292），倾角 -6°
  - 更新展示层断言（polaroid 300 / user 272 / today 280）与 `docs/features/miniapp.md`
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；切换不跳变待 DevTools 验收

## 2026-08-27（日记正文多行与上传照片倾角对齐邮票）

- **原因**：验收反馈——①今日日记卡正文只显示一行：测试输入"1111…"是无空格长串，CSS 默认不拆串导致溢出，且 clamp 只有 3 行；②写日记页上传照片后“方向变了”。曾试过把默认邮票切边做叠加相框，用户要求还原为整图展示。
- **根因（倾角实测）**：两张默认邮票自带约 ±6° 且方向相反的倾斜——`polaroid-sit` 约 -6.3°（逆时针，小记列表用），`polaroid-run` 约 +6.2°（顺时针，写日记页用）；而上传照片的白框固定 -6°，在写日记页与默认奔跑邮票反向，看起来就是“方向变了”。
- **修改**：
  - `MiniappJournalView.tsx/.scss`：正文 `-webkit-line-clamp` 3→7 并加 `word-break: break-all`；stage 最低 300rpx；上传照片恢复白框拍立得整图展示，倾角保持 -6°（与坐姿邮票一致）
  - `JournalEditorForm.tsx/.scss`：上传照片恢复白框拍立得，倾角 -6°→+6°（与奔跑邮票一致）；未放照片仍是奔跑小狗+提示
  - 邮票切边方案已完整还原：删除 `tools/build-stamp-frame.mjs`、`journal/stamp-frame.png` 与清单/文档登记
  - 更新展示层断言（clamp 7、break-all、stage 300）
- **验证**：vitest 全量、清缓存重编译 dist、CLI 清缓存；倾角观感待 DevTools 验收

## 2026-08-27（写日记排版轻整理·方案一）

- **原因**：验收反馈讨论排版——心情文字与表情大图重复、默认拍立得喧宾夺主、天气无当前值显示、工具栏“+”与相册重复。
- **修改**：
  - `JournalEditorForm.tsx/.scss`：日期行只留日期；天气按钮动态显示当前天气图标；表情图 108→120rpx；未放照片时拍立得 360→240rpx 并加「点这里放今天的照片」提示（放照片后仍是 300rpx 白框拍立得）；删除工具栏“+”（与相册重复）
  - 更新 `miniappPresentation.test.ts` 断言与 `docs/features/miniapp.md`
- **验证**：vitest、清缓存重编译 dist、CLI 清缓存，现有窗口验收

## 2026-08-27（小多利探头：原图直出 + 眼部木偶拆解）

- **原因**：旧抠图补痕 + 矢量重绘画风未被接受；整片眼贴的眨眼（压扁）和瞟眼（连毛色平移）被反馈"不太像"。最终方案 = 身体层原图直出（不修补），眼部做木偶拆解三层：眼眶（瞳孔原位以采样虹膜色填充）、瞳孔圆盘、闭眼眼睑，静止时逐像素隐形。
- **修改**：
  - `tools/build-xiaoduoli-parts.mjs`：出 body + 眼眶/瞳孔/眼睑四件（零依赖，全部从 `xiaoduoli-peek-source.png` 确定性裁切/采样）；瞳孔支点自动写入 `xiaoduoli-box-parts.generated.scss`；删除矢量源、`make-xiaoduoli-eyes.mjs` 与 `@resvg/resvg-js` devDep
  - `XiaoduoliBoxScene.tsx`：眼部三层 Image（眼眶/瞳孔/眼睑），显式 `mode="scaleToFill"`
  - `XiaoduoliBoxScene.scss`：body/eyes/pupils/lids 显式 `left:0;top:0;width:332rpx;height:233rpx`（不用 inset/百分比，规避运行时差异），puppet 加 `overflow:hidden`；眨眼改为「眼睑淡入 0.55 + 瞳孔 scaleY 0.1」组合，瞟眼改为瞳孔在眼眶内滑动 ±1.3%
  - 运行时曾出现眼睛异常放大：定位为 IDE 陈旧缓存（旧眼条被拉伸满幅）+ CSS 兼容加固；重建清缓存后以红框探针确认元素盒模型正确
- **验证**：三态合成预览（静止/眨眼/瞟眼）本地目检通过；vitest 全量、`check:assets`、`check:docs`、dist 重建；DevTools 小窝页验收待用户确认

## 2026-08-27（信纸正文右移下移微调）

- **原因**：验收反馈——信件正文整体偏左偏上，再往右、往下挪一点。
- **修改**：`MiniappNestLetter.scss` 正文净区 上 74→90 / 左 95→118 / 宽 468→455rpx（右缘保持不出纸面），换行行数不变，仍无需滚动

## 2026-08-27（信纸去滚动、整封平铺）

- **原因**：验收反馈——信件不要滚动，正文要按参考框占满白纸。整封信原文约 200 字，可读字号下塞不进矮卡，去滚动后必然溢出，因此同步精简了文案。
- **修改**：
  - `MiniappNestLetter.tsx`：`ScrollView` 改普通 `View`（不滚动）；信件文案由 3 段约 187 字精简为 4 段约 133 字，保留弃养、粘人、拖鞋等门、窝装下两人、邀请、初见纪念全部关键情节
  - `MiniappNestLetter.scss`：卡片 545→600rpx；正文净区上 74/左 95/宽 468rpx（658−95×2），字号 26-28rpx；落款右缩 110rpx 避开小信封
  - `XiaoduoliBoxScene.scss`：场景 400→390rpx，保证预告与按钮完整露出首屏
  - 过程发现微信 IDE 对 dist 的 wxss 有陈旧缓存（JS 新 WXSS 旧），touch wxss 强制刷新；`miniappPresentation.test.ts` 同步 puppet 332rpx 断言
  - 189/189 测试通过；模拟器验收：全文无滚动、落款不压装饰、按钮完整露出

## 2026-08-27（日记邮票区分与心情表情图选择）

- **原因**：验收反馈——今日日记卡与写日记页默认拍立得用了同一张奔跑小狗（应有两种）；写日记心情靠弹窗文字选择，想用工程内四张小多利表情图大图点选。
- **修改**：
  - `MiniappJournalView.tsx`：今日日记卡默认拍立得 polaroid-run → polaroid-sit（坐姿）；写日记页保留奔跑小狗
  - `JournalEditorForm.tsx`：心情改为卡片内四张表情图（moods/mood-1 难过、mood-2 平静、mood-3 开心、mood-4 兴奋）直接点选，108rpx 大图 + 选中高亮；移除原 ActionSheet 心情入口与工具栏「心情」按钮（天气/相册/地点不变）
  - `JournalEditorForm.scss`：新增 `.journal-editor__moods` 选择行样式，删除废弃 `--mood` 图标配色
  - 登记 moods 四图进 asset-manifest.json 与 `docs/features/miniapp.md`；更新展示层测试断言
  - 重新构建（占位 TARO_TAROT_ASSET_BASE_URL）+ CLI 清缓存，现有窗口验收

## 2026-08-27（信纸文字超框修复与内容下移）

- **原因**：scroll-view 按容器宽度拉满、忽略 `right` 收缩，正文一直顶到卡片右缘被裁（文字超框）；同时整块内容偏上。
- **修改**：
  - `MiniappNestLetter.scss`：`.nest-letter__body` 去掉 `right`，改显式 `width: 403rpx`（658 卡宽 − 左 100 − 右 155）卡住文本范围；`.nest-letter` 顶部加 28rpx 内边距使红框内容整体下移
  - 重新构建 + CLI 清缓存；模拟器验收（文本与右侧装饰留出净隙）

## 2026-08-27（小窝邀请页布局微调）

- **原因**：验收反馈——信件文字偏小、信纸偏矮、顶部小狗偏大、内容整体偏低。
- **修改**：
  - `MiniappNestLetter.scss`：信纸卡 501→545rpx；正文净区 inset 改为上 95/左 100/右 155/下 165rpx（下缘仍在小信封顶 388rpx 之上）；字号 greeting 26→30、段落 24→28、落款 22→26rpx
  - `XiaoduoliBoxScene.scss`：场景 480→400rpx，puppy 层与 puppet 398×280→332×233rpx（等比缩放，眼层百分比定位不变）
  - `MiniappNestView.scss`：`.miniapp-nest` 间距 10→6px；底部 tab 栏不动
  - 重新构建 + CLI 清缓存，开发者工具复用窗口验收通过

## 2026-08-27（启动遇 user_not_found 清令牌退回登录页）

- **原因**：在其他设备注销账号后，本机仍持有旧令牌，启动准备请求返回 404 `user_not_found`，页面卡死在准备页且"重新准备"永远失败（401 静默重登不覆盖 404）。
- **修改**：
  - `domain/sessionState.ts` 新增 `isAccountMissingError`；`pages/index/index.tsx` 启动失败分支命中该错误时清令牌、退回登录页并提示"账号已注销，请重新登录"
  - 补 `sessionState.test.ts` 用例；更新 `docs/features/miniapp.md`

## 2026-08-27（修脚印下拉栏开合时消息页闪烁）

- **原因**：`MiniappPawMenu` 关闭时卸载根节点、打开时重挂。Taro 对页面根孩子数组的插入/删除会整树重新序列化并整包 `setData`（`updateChildNodes` 全量替换 `cn`），消息页节点最多（ScrollView、Input、多张图片），数据整体重新应用就闪一下：打开闪一次、关闭动画结束卸载再闪一次。
- **修改**：
  - `MiniappPawMenu.tsx`：根节点常驻不卸载；关闭仍先播 180ms 退出动画，结束后只加 `miniapp-paw-menu--hidden`（`display: none`）。开合的 `setData` 从整页变为仅菜单自身子树
  - `MiniappPawMenu.scss`：新增 `--hidden` 隐藏类
  - `miniappPresentation.test.ts`：新增「根节点常驻 + 隐藏类」结构测试
  - 暗号/游戏/塔罗等居中弹窗仍是条件挂载，开合理论上也有同类整页重序列化，用户未报告，本次不动

## 2026-08-27（小窝信纸换图并改九宫格渲染）

- **原因**：新信纸设计图（分层纸叠 + 右上木夹 + 右下爪印爱心小信封）整体近方形，若沿用整图 `widthFix` 会强行决定卡片高度且装饰随图缩放；改为九宫格切片，四角固定不变形、边缘单轴拉伸、中心净区随卡片伸缩，正文始终落在白纸净区。
- **修改**：
  - 新增 `tools/make-letter-paper-slices.mjs`：原图归档到 `design-assets/nest/letter-paper-source.png`（2508px 降到 1280px，满足单文件 1MB 预算），alpha 裁边后切出 9 块 `letter-paper-{tl,tc,tr,ml,mc,mr,bl,bc,br}.png`（720px 内容宽，合计约 268KB），并输出 `tools/letter-debug-*.png` 标定图校准切线（上行 22% 罩住木夹下端，右列 30%、下行 46% 罩住爪印与小信封）
  - `MiniappNestLetter.tsx/.scss`：整图 `widthFix` 改为 9 个 `<Image>` 网格铺排（列 59/1fr/197rpx，行 110/1fr/231rpx，卡片高 501rpx），正文绝对定位在净区（上 105 / 左 100 / 右 155 / 下 125rpx），避开爪印与小信封
  - 删除 `letter-paper.png`；更新 `docs/assets/asset-manifest.json` 与 `docs/features/miniapp.md`

## 2026-08-27（箱中待机改为分层行为系统）

- **原因**：整图 peek 循环表情单一、不可编排；改为无眼底图 + 眼睛覆盖层，由领域层种子化时间线驱动待机行为，不引入动画运行库。
- **修改**：
  - 新增 `domain/xiaoduoliBehavior.ts`：FNV-1a 种子哈希 + RNG，生成待机时间线（眨眼 200ms / 双眨 380ms / 瞟 750ms / 看 1700ms / 小跳 900ms，间隔 1800–6000ms）
  - 新增 `features/main/useXiaoduoliIdleBehavior.ts` 调度 Hook；`XiaoduoliBoxScene` 改为 box/body/eyes/standing 分层，跳出仍用 `xiaoduoli.png` 与 `createUnlockEffects` 彩带星光
  - `tools/make-xiaoduoli-eyes.mjs`：从 `design-assets/nest/xiaoduoli-peek-source.png` 边缘插值修补眼底、差值抠出眼层
  - `xiaoduoli-peek.png` 移出运行时（转存 `design-assets/nest/xiaoduoli-peek-source.png`，source-only）；更新 manifest、`miniappPresentation.test.ts` 与 `docs/features/miniapp.md`

## 2026-08-27（清缓存并重新编译）

- **原因**：现有微信开发者工具窗口未刷到最新产物。
- **修改**：
  - 删除 `miniapp/dist` 后执行 `npm run build:weapp`（`TARO_TAROT_ASSET_BASE_URL` 用本地占位 COS 目录）
  - 对已打开的 `pet10-miniapp` 窗口执行 CLI `cache --clean all`，未 `open`/`close`/`quit`

## 2026-08-27（箱中动画还原到最初探头）

- **原因**：后续分层/整图改动丢掉了一开始的左顾右盼。
- **修改**：
  - 待机恢复为纸箱 + `xiaoduoli-peek.png`，`xiaoduoli-peek` 3.2s 左右探头
  - 删除 `xiaoduoli-box-idle.png`；跳出仍用同一张 peek 图

## 2026-08-27（恢复探头并露出头顶）

- **原因**：整图只剩呼吸；容器偏上裁掉头顶。
- **修改**：
  - 同一张 idle 整图用 View 背景沿箱沿裁开：上层探头左顾右盼，下层箱子不动（不新增图片）
  - 场景加高到 560rpx，整图收窄下移，露出头顶

## 2026-08-27（箱中改为不透明整图）

- **原因**：微信 Image 会把透明 PNG 画成棋盘格矩形；再拆后壁/前沿会错位并多占资源。
- **修改**：
  - 待机改用 `xiaoduoli-box-idle.png`（516×540，120KB，页色铺底、层级画在图里）
  - 删除运行时分层图：front/body/blink/head*/paws
  - 跳出仍用空箱 `xiaoduoli-box.png` + `xiaoduoli-peek.png`

## 2026-08-27（箱中层级与透明边缘）

- **原因**：上半身图盖住整只纸箱，且图后露出棋盘格矩形硬边。
- **修改**：
  - 重抠 `xiaoduoli-box-body.png` / `xiaoduoli-box-body-blink.png` 透明底（289×360 / 288×360，≤122KB）
  - 新增 `xiaoduoli-box-front.png` 前沿遮挡；待机夹在后壁与前沿之间
  - 身体图改为 `widthFix`，不再把 Image 拉满矩形；开口 clip 对齐箱沿

## 2026-08-27（箱中补上半身并改回连续位移）

- **原因**：12 帧/秒序列既不如之前丝滑，又只有头没有身体。
- **修改**：
  - 新增 `xiaoduoli-box-body.png` / `xiaoduoli-box-body-blink.png`（头+胸+肩+前爪，≤166KB）
  - 待机改回 60 帧 CSS 探头/转头/呼吸，眨眼短叠层
  - 删除 idle-00～11 序列帧与 `xiaoduoliBoxIdle.ts`

## 2026-08-27（箱中待机改为 12 帧序列）

- **原因**：CSS 换脸不够丝滑；按序列帧方案预合成探头/眨眼/转头，10 帧/秒直接播。
- **修改**：
  - 烘焙 `xiaoduoli-idle-00.png`～`11.png`（220×192，33–41KB）
  - `xiaoduoliBoxIdle.ts`：帧序号；`XiaoduoliBoxScene` 叠放切帧，跳出仍用 `peek.png`
  - 头/爪图层只作烘焙素材，运行时不再引用

## 2026-08-27（箱中待机去掉整头切脸）

- **原因**：左右脸溶解仍会叠影、发顿；商业养成角色用骨骼或眼珠分层，不会整头换图。
- **修改**：
  - 待机只保留正视头图做位移/旋转/呼吸/轻摆；眨眼用闭眼图短叠层
  - 不再引用 `xiaoduoli-head-left/right.png`
  - 跳出/信件/解锁按钮未改

## 2026-08-27（消息空态小多利放大）

- **原因**：无消息时抱信封小多利偏小，需对齐参考图尺寸及下方文字位置。
- **修改**：
  - `MiniappMessagesView.scss`：空态插画 `236px` → `360px`，与标题间距 `8px` → `20px`
  - `miniappPresentation.test.ts`：锁定插画宽度与间距

## 2026-08-27（箱中待机改为连续缓动）

- **原因**：整头切帧 + `step-end` 会一顿一顿，不够丝滑。
- **修改**：
  - `XiaoduoliBoxScene`：外层呼吸、里层探头转头（嵌套 transform）；表情线性交叉淡入；眨眼叠在头上短淡入；爪子随探头轻压
  - 去掉 `step-end` 和长停留关键帧；循环 7.2s
  - 跳出/信件/解锁按钮未改

## 2026-08-27（箱中探头分层：头、眼、眨眼）

- **原因**：整张探头图左右摆看起来假；爪子应钉在箱沿，头探出探进，眼睛先瞟再转头，并要眨眼。
- **修改**：
  - 新增 `nest/xiaoduoli-paws.png` 与四帧头图（正视/左/右/眨眼），均 ≤180KB
  - `XiaoduoliBoxScene`：待机用头层 `translateY` 探头 + 表情帧切换；爪子静止；`xiaoduoli-peek.png` 只用于跳出
  - 跳出 1.2s、信件和解锁按钮未改
  - 更新 `miniappPresentation.test.ts`

## 2026-08-27（今日日记上半区略增高）

- **原因**：红框拍立得+文案要再大一点，运势再靠近底栏约 2px，按钮大小和距卡片底边不变。
- **修改**：
  - `MiniappJournalView.scss`：拍立得/舞台增高约 20rpx；页面底边距 8px→2px
  - 按钮仍 112×80rpx，今日卡 `padding-bottom: 18rpx` 不变
  - 更新测试与 `docs/features/miniapp.md`

## 2026-08-27（邀请界面改为箱中张望，接受后只换按钮）

- **原因**：默认邀请界面就应是小多利在箱子里左顾右盼；去掉狗屋/绿植空态。好友接受后画面不变，底部按钮改成解锁，点了才跳出。
- **修改**：
  - `MiniappNestLetter` 用 `XiaoduoliBoxScene` 替换植物场景；删除 `empty-puppy/bed/house/plant/toy-ball`
  - 空态与待解锁共用邀请布局；首页底部按钮在 locked 时换成「玩家已接受邀请解锁小多利~」
  - `XiaoduoliBoxScene` 去掉房间背景和卡片内解锁按钮

## 2026-08-27（周历略放大并统一小记背景色）

- **原因**：周历卡要再大一点、内部间距拉开；小记背景要和其它界面同色。
- **修改**：
  - `MiniappJournalView.scss`：周历 padding `24rpx 18rpx 16rpx`，日期格与行距加大
  - 去掉渐变底，背景改为 `#fff8ee`
  - 更新测试与 `docs/features/miniapp.md`

## 2026-08-27（接受邀请后箱中解锁小多利）

- **原因**：好友接受邀请后，小窝要先看到小多利在箱子里左顾右盼；点「玩家已接受邀请解锁小多利~」才跳出并带彩带星光。
- **修改**：
  - `domain/xiaoduoliUnlock.ts`：解锁状态、按钮文案、跳出时长、彩带星光参数
  - `services/xiaoduoliUnlockStorage.ts`：本机记录已解锁房间和待解锁房间
  - `XiaoduoliBoxScene.tsx/.scss`：箱中张望循环、跳出、彩带星光
  - `MiniappNestView.tsx`：`locked` 场景；邀请页接受后写入 pending
  - 图层 `nest/xiaoduoli-box.png`、`nest/xiaoduoli-peek.png`

## 2026-08-27（缩小写日记按钮让运势首屏可见）

- **原因**：写日记/拍照记录按钮过高，今日日记卡被拉高，今日运势被底栏挡住，需要滑动才看见。
- **修改**：
  - `MiniappJournalView.scss`：按钮插图 148×110→112×80，按钮内边距收紧；今日卡不再 `flex: 1` 拉高
  - 拍立得和卡片内边距略收，让运势上移到首屏
  - 更新测试与 `docs/features/miniapp.md`

## 2026-08-27（回退登录错误规范化）

- **原因**：登录失败是开发者工具未登录微信，不是代码问题；撤回刚加上、尚未接入业务的错误规范化文件。
- **修改**：
  - 删除 `miniapp/src/services/unknownError.ts`
  - 删除 `miniapp/src/services/unknownError.test.ts`
  - `authApi.ts` / `apiClient.ts` 未被改动，无需回滚

## 2026-08-26（写日记页按参考图重排）

- **原因**：写日记布局要对齐参考图：顶栏「写日记 + 保存」、白卡片、日期/心情、拍立得、底部四按钮工具栏。
- **修改**：
  - `journalModel.ts`：新增心情/天气选项与 `journalMoodDisplay` / `parseJournalMoodTitle`
  - `JournalEditorForm.tsx/.scss`：顶栏改为返回 / 写日记 / 保存；正文收入白卡片；默认拍立得改用 `polaroid-run.png`；工具栏为天气、心情、相册、地点和 +
  - 更新 `journalModel.test.ts`、`miniappPresentation.test.ts`

## 2026-08-26（小记统一间距并放大今日卡）

- **原因**：简介与分页、日历与今日日记太近；今日日记与运势太远；今日日记框和运势框要再大一点，按钮尺寸保持。
- **修改**：
  - `MiniappJournalView.scss`：统一 `--journal-gap: 32rpx`；去掉运势 `margin-top: auto`
  - 今日日记卡 `flex: 1` 吃掉剩余高度，内边距和拍立得加大；运势 `padding: 22rpx 24rpx`、`min-height: 96rpx`
  - 按钮插图仍为 148×110rpx
  - 更新测试与 `docs/features/miniapp.md`

## 2026-08-26（小记按参考图贴底并修纪念日闪白）

- **原因**：布局要对齐参考图；写日记/拍照记录插图再大一点；今日运势贴在内容区最下方；点纪念日会让顶栏「小多利宠物伙伴」闪白消失。
- **修改**：
  - `MiniappJournalView.tsx/.scss`：标题下加简介；周历收入白卡片；「查看」收起多余日记；按钮插图改为 148×110rpx；运势 `margin-top: auto` 贴底
  - 纪念日改为当前页全屏 `JournalAnniversaryPanel`，不再 `navigateTo`，顶栏保持「小多利宠物伙伴」
  - 独立纪念日页改为面板壳层，config 与首页同色
  - 更新 `miniappPresentation.test.ts`、`docs/features/miniapp.md`

## 2026-08-26（恢复标题下简介）

- **原因**：去掉简介后页面信息偏空，仍希望保留标题下介绍。
- **修改**：
  - 小窝/消息/我的/纪念日恢复标题下简介；小记仍用标题下分页，不加文案简介
  - 主页上移间距保持不变
  - 更新测试与 `docs/features/miniapp.md`

## 2026-08-26（小记标题左对齐与写日记样式修复）

- **原因**：小记标题应与其它页一样靠左；写日记页未产出 `journal-editor.wxss`，开发者工具报 ENOENT。
- **修改**：
  - `MiniappJournalView.scss`：标题 `text-align: left`，分页仍 `justify-content: center`
  - `journal-editor.tsx/.scss`：重新引入表单样式并写出页面 wxss，避免编译找不到文件

## 2026-08-26（小记分页、写日记顶栏与底部背景）

- **原因**：日记/纪念日要居中放在小记下方；今日卡和按钮要更大；点写日记顶栏会闪白；底部不要图一垫子块，改用图二庭院。
- **修改**：
  - `MiniappJournalView`：标题下居中分页；放大今日卡与按钮；写日记改为当前页全屏，不再 `navigateTo`
  - 抽出 `JournalEditorForm`；底部 `editor-yard.jpg`（750×750，45KB）；去掉垫子小狗装饰
  - `journal-editor.config.ts`：顶栏颜色与首页同为 `#fff8ee` / 「小多利宠物伙伴」
  - 更新测试、`asset-manifest.json`、`docs/features/miniapp.md`

## 2026-08-26（消息页去掉绿植）

- **原因**：用户确认消息页不需要标题右侧绿植。
- **修改**：
  - `MiniappMessagesView.tsx/.scss`：移除绿植图片和相关样式，标题区只保留「消息」和副文案
  - 删除 `miniapp/src/assets/messages-plant.png`
  - 更新 `miniappPresentation.test.ts`

## 2026-08-26（消息页空态按图一重排）

- **原因**：消息页要改成图一布局，空态插画用图二抱信封小狗切图。
- **修改**：
  - `messages-empty.png`：由图二去底后量化为 520×411 / 89KB 透明 PNG
  - 使用已有 `messages-plant.png` 作为标题右侧绿植
  - `MiniappMessagesView.tsx/.scss`：标题+副文案+绿植；无好友会话时展示圆角空态卡（插画/说明/去邀请好友）
  - `miniappViewModel.ts`：`hasFriendConversations` 只把 `pair` 当好友会话，个人房不再挡住空态
  - 更新 `miniappPresentation.test.ts`、`miniappViewModel.test.ts`

## 2026-08-26（去掉标题简介并上移）

- **原因**：标题（小窝、消息等）下的简介占用空间，标题和内容离顶栏偏远。
- **修改**：
  - 去掉小窝/消息/我的标题下简介，以及纪念日页「把重要的日子记下来。」
  - `index.scss`：主页上边距 16px→4px，页头 padding 收紧为 2px 2px 4px
  - 各 Tab 内容与标题间距收紧；小记负边距与页头对齐；纪念日子页同样上移
  - 更新 `miniappMainLayout.test.ts`、`miniappPresentation.test.ts`、`docs/features/miniapp.md`

## 2026-08-26（小记排版收紧）

- **原因**：写日记/拍照记录按钮过大，点赞分享多余，今日运势需下滑才看见，点写日记会把顶栏改成「写日记」。
- **修改**：
  - `MiniappJournalView.tsx/.scss`：标题与分页同一行；拍立得和按钮缩小（图标 56×40rpx，按钮横排）；去掉点赞/分享；运势紧跟今日卡；正文三行截断
  - `journal-editor.config.ts`：顶栏标题改回「小多利宠物伙伴」
  - `index.tsx`：移除日记分享标题状态
  - 更新 `miniappPresentation.test.ts`、`docs/features/miniapp.md`

## 2026-08-26（小窝空态修正）

- **原因**：空态明显错误——素材带「玩具球/绿叶」标签、右侧边桌裁切、图标横排散落不像图二。
- **修改**：
  - 重裁无标签素材；删除 `empty-plant-small/side-table/leaves`
  - 场景改为图二：左狗屋、中小狗坐窝、右绿植、脚边球；`overflow:hidden`
  - 信纸 `widthFix`；更新测试与 manifest

## 2026-08-26（小记重构）

- **原因**：按设计图一重排小记，并把图二、图三切成可点击的默认小狗照片与按钮插画。
- **修改**：
  - 新增 `miniapp/src/assets/journal/`：`polaroid-run.png`（420×406，103KB）、`polaroid-sit.png`（420×373，90KB）、`action-write.png`（320×270，45KB）、`action-photo.png`（359×219，65KB）、`puppy-cushion.png`（480×280，73KB）
  - `journalModel.ts`：月份改为 `2026年8月`，新增 `journalDateLabel`、`journalDisplayPhotos`
  - `MiniappJournalView.tsx/.scss`：今日日记卡改为拍立得 + 文案 + 切图按钮；点击默认照片或「拍照记录」选图后进入编辑器
  - `journal-editor.tsx/.scss`：日期行 + 发布按钮，默认坐姿拍立得可点击换图，底部垫子小狗装饰
  - 更新 `miniappPresentation.test.ts`、`journalModel.test.ts`、`docs/assets/asset-manifest.json`、`docs/features/miniapp.md`、`docs/features/assets-and-performance.md`

## 2026-08-26

- **原因**：无好友小窝空态接入图一信纸与其它素材。
- **修改**：后续已在「小窝空态修正」中清理错误裁切与散落布局。
