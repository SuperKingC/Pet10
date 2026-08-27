# docs context

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
