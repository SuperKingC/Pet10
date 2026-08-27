# miniapp context

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
