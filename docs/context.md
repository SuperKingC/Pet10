# docs context

## 2026-08-28（游戏中心页首插画换趴窝小多利）

- **原因**：验收反馈——一起玩页首右侧改用小多利趴在窝垫上的插画。
- **修改**：
  - `docs/features/miniapp.md`：游戏中心描述「站立小多利插画」改为「小多利趴在窝垫上的插画（`journal/puppy-cushion.png`）」
  - `docs/assets/asset-manifest.json`：`puppy-cushion.png` 用途补充游戏中心页首复用
  - `miniapp/src/features/main/MiniappGamesPage.tsx`：页首右侧 `puppyImage` 改引 `journal/puppy-cushion.png`（复用既有 runtime 图，无新增资源）

## 2026-08-28（返回按钮改细箭头无外圈）

- **原因**：同步验收反馈——统一返回按钮去掉外圈与粗描边，只留细箭头。
- **修改**：
  - `docs/features/miniapp.md`：统一返回按钮条目改为「无底色深棕细左箭头」

## 2026-08-28（统一全小程序返回按钮）

- **原因**：同步返回按钮统一说明。
- **修改**：
  - `docs/features/miniapp.md`：主界面补充新增统一返回按钮条目；写日记顶栏描述改「统一返回按钮」
  - `miniapp/src/components/MiniappBackButton.tsx/.scss`：新增共享返回按钮组件，替换写日记/纪念日/今日运势/游戏中心/五子棋 5 处自绘返回

## 2026-08-28（信纸三轮：正文不分段与信封收窄上移）

- **原因**：同步信纸版式调整说明。
- **修改**：
  - `docs/features/miniapp.md`：信纸描述补「不分段」
  - `MiniappNestLetter.tsx/.scss`：正文四句合并整段；卡片 658×600→620×540rpx 居中；正文区左右各放宽一字

## 2026-08-28（爪印菜单质感改版 + 游戏中心整页化）

- **原因**：同步小程序爪印菜单视觉动效改版与「游戏」入口由居中弹窗改为整页游戏中心。二轮反馈：弹出动画更动感（强弹簧 + 标题落入 + 88rpx 行程错帧）、图标缩小（124rpx 底座/84rpx icon）、底座烤漆质感（镜面高光 + 内圈白描边）、移除关闭按钮、游戏页打开从上往下逐列入场。
- **修改**：
  - `docs/features/miniapp.md`：爪印菜单三入口描述（烤漆质感方形底座、一行最多四格网格从左到右排布不足一行靠左、不设关闭按钮、强弹簧上滑 + 错帧动画、`prefers-reduced-motion` 降级）；「游戏」入口改为整页游戏中心（「一起玩小游戏」标题 + 小多利插画 + 五子棋卡片 + 敬请期待 + 逐列入场动画），`navigation/gobang.png` 用途同步，代码入口补 `MiniappGamesPage.tsx`
  - `miniapp/src/features/main/`：新增 `MiniappGamesPage.tsx/.scss`，删除 `MiniappGamesModal.tsx/.scss`；`MiniappPawMenu.tsx/.scss` 动效与底座改版、移除关闭按钮

## 2026-08-28（信纸文案二轮：预告改领养提示）

- **原因**：同步信纸文案二轮修改——拖鞋句定稿「等你」，信件下方功能预告行改为领养警示文案。
- **修改**：
  - `docs/features/miniapp.md`：无好友小窝描述「下方功能预告」改「下方领养提示（小多利独一无二、只能养一只且不能遗弃、请慎重选择一起养的对象）」
  - `MiniappNestLetter.tsx`：底部提示行同步替换；第二段结尾定稿；第四段定为「如果你们愿意，初见那天就是我新的开始。这一次，不会再有人把我送走了。」

## 2026-08-28（信纸正文文案优化）

- **原因**：同步小窝信纸正文文案优化说明。
- **修改**：
  - `MiniappNestLetter.tsx`：四段正文人称与断句微调——信直接写给「你」（原「主人…她的拖鞋」与弃养设定矛盾），长句拆短；称呼「给还没来的家人：」、落款与底部预告不变，字数持平，样式未改

## 2026-08-27（小多利探头：原图直出 + 眼部木偶拆解）

- **原因**：旧抠图补痕 + 矢量重绘被否；整片眼贴式眨眼/瞟眼被反馈不像。改为 body 原图直出 + 眼部木偶拆解三层（眼眶/瞳孔/眼睑），眨眼=眼睑淡入+瞳孔压扁，瞟眼=瞳孔在眼眶内滑动。
- **修改**：
  - `docs/features/assets-and-performance.md`：角色动画素材规则（出生即分层优先 / 原图直出 + 覆盖件；禁止修补式反抠）
  - `docs/features/miniapp.md`：箱中待机描述与资源表更新（body 446×314 原图直出；eyes/pupils/lids 眼部三层）
  - `docs/assets/asset-manifest.json`：用途同步；layered.svg 源删除（矢量试点归档于 git 历史）

## 2026-08-27（信纸去滚动、整封平铺）

- **原因**：同步信件取消滚动、整封平铺与文案精简的说明。
- **修改**：
  - `docs/features/miniapp.md`：信纸描述改为「整封信完整平铺在白纸净区内，不滚动」

## 2026-08-27（信纸文字超框修复与内容下移）

- **原因**：同步 scroll-view 忽略 `right` 收缩导致文字超出纸面、内容整体偏上的修复。
- **修改**：
  - `MiniappNestLetter.scss`：正文改显式宽度 403rpx 卡住文本范围；`.nest-letter` 顶部加 28rpx 使内容下移

## 2026-08-27（小窝邀请页布局微调）

- **原因**：同步信件字号/信纸高度/小狗尺寸与整体上移的调整。
- **修改**：
  - `miniapp` 样式：信纸 545rpx、正文 28-30rpx、箱中场景 400rpx、小窝页间距收紧；功能文档无量化描述，不改

## 2026-08-27（小窝信纸九宫格换图）

- **原因**：同步小窝信纸替换为分层纸叠新图并改九宫格渲染的说明。
- **修改**：
  - `docs/features/miniapp.md`：信纸描述改九宫格切片渲染；资源表 `letter-paper.png` 换为 9 块切片行
  - `docs/assets/asset-manifest.json`：新增 9 块切片与 `design-assets/nest/letter-paper-source.png`（source-only）

## 2026-08-27（箱中待机分层行为系统）

- **原因**：同步箱中待机改为无眼底图 + 眼睛覆盖层、领域层种子化时间线的说明。
- **修改**：
  - `docs/features/miniapp.md`：补充待机分层行为描述；资源表 peek 换为 body/eyes 两行
  - `docs/assets/asset-manifest.json`：新增 `xiaoduoli-body.png`、`xiaoduoli-eyes.png`；peek 改为 `design-assets/nest/xiaoduoli-peek-source.png`（source-only）

## 2026-08-27（箱中动画还原到最初探头）

- **原因**：同步待机恢复为纸箱探头左顾右盼，去掉整图分层说明。
- **修改**：
  - `docs/features/miniapp.md`：探头左顾右盼；资源表去掉 idle
  - `docs/assets/asset-manifest.json`：移除 idle
  - `docs/features/assets-and-performance.md`：邀请纸箱图层

## 2026-08-27（恢复探头并露出头顶）

- **原因**：同步箱中整图沿箱沿分层探头、画面下移露出头顶。
- **修改**：
  - `docs/features/miniapp.md`：上层探头左顾右盼，下层纸箱不动

## 2026-08-27（箱中改为不透明整图）

- **原因**：同步待机改为单张不透明箱中整图，去掉分层透明图。
- **修改**：
  - `docs/features/miniapp.md`：整图待机、资源表与验收项
  - `docs/assets/asset-manifest.json`：登记 idle，移除 front/body/blink/head/paws
  - `docs/features/assets-and-performance.md`：邀请箱中整图

## 2026-08-27（箱中层级与透明边缘）

- **原因**：同步纸箱后壁/前沿分层、上半身透明底与 `widthFix`。
- **修改**：
  - `docs/features/miniapp.md`：夹在后壁与前沿之间；资源表更新尺寸体积
  - `docs/assets/asset-manifest.json`：登记 `xiaoduoli-box-front.png`
  - `docs/features/assets-and-performance.md`：纸箱后壁与前沿

## 2026-08-27（预览复用已有微信开发者工具窗口）

- **原因**：验证时不要在已有窗口之外再开一个开发者工具窗口。
- **修改**：
  - `docs/features/miniapp.md`：开发命令补充「已打开则复用，未打开才启动一次」

## 2026-08-27（箱中补上半身并改回连续位移）

- **原因**：同步箱中待机改为带身体的连续位移，去掉 12 帧序列。
- **修改**：
  - `docs/features/miniapp.md`：上半身探头、60 帧位移
  - `docs/assets/asset-manifest.json`：登记 body/blink，删除 idle-00～11
  - `docs/features/assets-and-performance.md`：箱中上半身图层

## 2026-08-27（箱中待机改为 12 帧序列）

- **原因**：同步箱中待机改为 12 帧序列播放。
- **修改**：
  - `docs/features/miniapp.md`：10 帧/秒、12 帧循环及资源表
  - `docs/assets/asset-manifest.json`：登记 idle-00～11
  - `docs/features/assets-and-performance.md`：序列帧随小程序包分发

## 2026-08-27（箱中待机去掉整头切脸）

- **原因**：同步待机改为单头位移 + 短眨眼叠层。
- **修改**：
  - `docs/features/miniapp.md`：一张头图层做位移/旋转，眨眼短叠层

## 2026-08-27（消息空态小多利放大）

- **原因**：同步消息空态插画更大、文字紧跟其下的说明。
- **修改**：
  - `docs/features/miniapp.md`：空态插画约屏宽一半，文字紧跟插画下方

## 2026-08-27（箱中待机改为连续缓动）

- **原因**：同步箱中待机由切帧改为连续缓动、表情交叉淡入。
- **修改**：
  - `docs/features/miniapp.md`：探头用连续缓动，表情交叉淡入

## 2026-08-27（箱中探头分层：头、眼、眨眼）

- **原因**：同步箱中待机改为探头、转眼、眨眼分层动画及新图层。
- **修改**：
  - `docs/features/miniapp.md`：探头/眨眼/转眼说明与资源表
  - `docs/features/assets-and-performance.md`：邀请探头表情图层
  - `docs/assets/asset-manifest.json`：登记 paws 与四帧头图

## 2026-08-27（今日日记上半区略增高）

- **原因**：同步今日日记拍立得区略增高、运势与底栏间距接近消息页。
- **修改**：
  - `docs/features/miniapp.md`：按钮距卡片底边不变，上半区略增高

## 2026-08-27（邀请界面改为箱中张望，接受后只换按钮）

- **原因**：同步邀请界面箱中张望、去掉绿植空态资源、接受邀请后只换底部按钮的说明。
- **修改**：
  - `docs/features/miniapp.md`：邀请界面与待解锁共用箱子动画
  - `docs/assets/asset-manifest.json`：删除 empty-puppy 等五张空态图

## 2026-08-27（周历略放大并统一小记背景色）

- **原因**：同步小记周历略放大、页面背景与其它主界面同为 `#fff8ee`。
- **修改**：
  - `docs/features/miniapp.md`：补充小记背景色说明

## 2026-08-27（接受邀请后箱中解锁小多利）

- **原因**：同步小窝待解锁流程、按钮文案和纸箱图层资源。
- **修改**：
  - `docs/features/miniapp.md`：接受邀请后箱中待解锁，点按钮跳出
  - `docs/features/assets-and-performance.md`：登记纸箱图层和 source-only 原图
  - `docs/assets/asset-manifest.json`：新增 `xiaoduoli-box.png`、`xiaoduoli-peek.png` 与原图

## 2026-08-27（缩小写日记按钮让运势首屏可见）

- **原因**：同步小记按钮收矮、今日卡按内容高度、运势首屏可见的说明。
- **修改**：
  - `docs/features/miniapp.md`：去掉「今日日记卡随剩余高度增高」，改为运势首屏可见

## 2026-08-26（写日记页按参考图重排）

- **原因**：同步写日记覆盖层的顶栏、白卡片和工具栏布局说明。
- **修改**：
  - `docs/features/miniapp.md`：写日记覆盖层自带顶栏、白卡片和庭院背景；默认拍立得改为奔跑小狗

## 2026-08-26（小记统一间距并放大今日卡）

- **原因**：同步小记统一 32rpx 间距、今日卡增高、运势紧跟其下的说明。
- **修改**：
  - `docs/features/miniapp.md`：不再写运势贴底，改为统一间距与今日卡随剩余高度增高

## 2026-08-26（小记按参考图贴底并修纪念日闪白）

- **原因**：同步小记布局、运势贴底和纪念日当前页打开的行为说明。
- **修改**：
  - `docs/features/miniapp.md`：小记简介、周历白卡片、查看、运势贴底；写日记/纪念日都在当前页全屏打开；补充代码入口

## 2026-08-26（消息页去掉绿植）

- **原因**：消息页不再使用标题右侧绿植，同步清单和功能说明。
- **修改**：
  - `docs/assets/asset-manifest.json`：删除 `messages-plant.png`
  - `docs/features/miniapp.md`：去掉消息页绿植描述和资源表行

## 2026-08-26（消息页空态按图一重排）

- **原因**：消息页改成图一布局，空态插画用图二切图，需同步功能说明和资源清单。
- **修改**：
  - `docs/assets/asset-manifest.json`：`messages-empty.jpg` 改为 `messages-empty.png`，新增 `messages-plant.png`
  - `docs/features/miniapp.md`：消息页空态布局与切图尺寸；消息页保留副文案
  - `docs/features/assets-and-performance.md`：本地打包资源包含消息空态插画
