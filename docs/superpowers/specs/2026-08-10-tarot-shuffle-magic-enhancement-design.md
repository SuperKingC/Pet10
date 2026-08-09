# 塔罗洗牌玄幻动效增强设计规格

## 目标

在不改变洗牌交互和塔罗流程的前提下，增强长按洗牌阶段的活动范围与仪式感。采用用户确认的 C 方案：牌组横向与纵向轨迹明显扩大，并在牌堆中心加入双层旋转法阵、低频星屑和旧金色流光。装饰必须服务于洗牌动作，不能遮挡牌背、进度条或下一步按钮。

本轮只修改洗牌阶段。切牌、扇形选牌、翻牌、牌库、随机规则和解读内容保持现状。

## 现有上下文

- `src/games/tarot/TarotGame.tsx` 使用十个 `.tarot-shuffle-deck__slot` 和内部 `.tarot-shuffle-deck__card` 渲染牌组，并通过长按更新 `shuffleProgress`。
- `src/styles.css` 的最终塔罗覆盖块已经提供左右交错关键帧、紫雾呼吸和牌背资源，但最大水平位移约 68px，中心装饰主要依赖两个伪元素，法阵层级和金色流光不够明确。
- `src/games/tarot/tarotRitualStyles.test.ts` 读取 CSS 和 TSX 源文件验证动效结构。本轮继续使用该测试锁定运动范围、装饰层和 reduced-motion 行为。
- 工作区包含用户尚未提交的塔罗改动。实现只增量修改本规格列出的三个文件，不还原或重写其他改动。

## 视觉方向

### 牌组运动

- 十张牌继续分成左右两组，使用现有牌背 `/tarot/ui/card-back.jpg`。
- 宽屏最大水平位移由约 68px 提升到 92px，最大垂直抬升提升到 34px，并使用 28px 左右的 `translateZ` 表现层级。
- 两组牌在最大展开时保持方向相反但节奏错开；回到中心前有一次轻微交错穿插，不能整组同时折返或瞬间跳位。
- 单循环时长保持低频，目标为 2.4 秒。每张牌使用负延迟错开波峰，使十张牌形成连续流动，而不是高频抖动。
- 静止时仍是一叠整齐牌堆。松开、离开或发生 `pointercancel` 后，所有牌在 240ms 内回到静止状态。

### 法阵与星屑

- 在洗牌按钮内部增加一个纯装饰的 `.tarot-shuffle-deck__aura`，并设置 `aria-hidden="true"`。
- aura 包含两个同心法阵层：外环慢速顺时针旋转，内环更慢地逆时针旋转。环线使用低饱和紫色和旧金色，不使用纯白高亮。
- 法阵只在长按时提升亮度并旋转；静止状态保留低透明度轮廓，让牌堆仍有仪式锚点。
- 星屑使用一个固定数量的装饰层实现，不随机创建 DOM，不随长按次数累积。星点沿法阵边缘做低频明暗和轻微径向漂移，禁止快速闪烁。
- 法阵位于牌组后方，星屑与金色扫光位于牌组周围。任何装饰都不得覆盖牌背主体的中央图案。

### 金色流光

- 使用 aura 或牌堆伪元素增加一条窄而柔和的旧金色弧形扫光。
- 扫光每个 2.4 秒循环只经过一次，在牌组接近最大展开时出现，随后衰减；不能持续照亮整个区域。
- 流光只使用 `transform`、`opacity` 和 `filter`，不动画修改布局属性。

## 结构与样式

### React 结构

在十张牌之前加入固定装饰结构：

```tsx
<span className="tarot-shuffle-deck__aura" aria-hidden="true">
  <i className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--outer" />
  <i className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--inner" />
  <i className="tarot-shuffle-deck__stardust" />
  <i className="tarot-shuffle-deck__gold-trace" />
</span>
```

装饰结构不参与点击和焦点顺序，统一使用 `pointer-events: none`。

### 运动区域

- `.tarot-shuffle-deck` 的宽度保持 `min(92vw, 360px)`，高度提升到足以容纳 34px 抬升和法阵外环，不得依赖父级横向滚动。
- 牌的宽高和 2:3 比例保持现状，扩大的是轨迹而不是牌面尺寸。
- 320px 至 380px 窄屏通过 CSS 自定义属性把最大水平位移降到 72px、垂直抬升降到 28px；360px 以上使用完整的 92px/34px 轨迹。
- 洗牌阶段的标题、进度条和按钮位置保持稳定。动画不能改变容器尺寸，不能造成页面上下跳动。

### 层级

- 法阵外环和内环位于所有牌后方。
- 紫雾和星屑可延伸到牌组四周，但层级低于牌面。
- 金色流光可以短暂经过牌边缘，不得覆盖牌背中心超过 20% 面积。
- 牌的 z 轴层次只通过 `translateZ`、阴影和固定层级表达，不在关键帧中修改 `z-index`。

## 交互与可访问性

- 保留 `pointerdown`、`pointerup`、`pointerleave` 和 `pointercancel`，不改变进度增长速度和达到 100% 后的下一步逻辑。
- 如果用户在牌堆外松手或系统取消触摸，计时器必须停止，动画必须回稳。
- `prefers-reduced-motion: reduce` 下停止法阵旋转、星屑漂移、流光和牌组循环；长按仍更新进度，牌堆使用静态微光反馈。
- 装饰元素全部 `aria-hidden`，洗牌按钮继续使用现有可访问名称。

## 文件边界

### 修改

- `src/games/tarot/TarotGame.tsx`：增加固定 aura 装饰结构，不改变洗牌状态或计时逻辑。
- `src/styles.css`：扩大最终生效的洗牌轨迹，增加双层法阵、星屑、金色流光、窄屏变量和 reduced-motion 覆盖。
- `src/games/tarot/tarotRitualStyles.test.ts`：增加结构、最大轨迹、装饰关键帧、窄屏降级和 reduced-motion 断言。

### 不修改

- 切牌、选牌和翻牌相关 JSX、状态与关键帧。
- `src/games/tarot/tarotDeck.ts`、`TarotCard.tsx` 和解读逻辑。
- 牌背和牌面图片资源。
- 其他游戏、聊天、服务端或资源生成代码。

## 验收标准

- 长按时左右两组牌的最大水平活动范围在宽屏达到约 92px，纵向抬升达到约 34px，比当前实现明显更开阔。
- 双层法阵、星屑和金色流光可见，运动频率低且层次清楚；牌背中央图案始终可辨。
- 松开或取消指针后不再继续累计进度，牌组与装饰在 240ms 内回到静止状态。
- 320px 宽度无横向滚动或按钮遮挡；窄屏自动使用约 72px/28px 的轨迹。
- `prefers-reduced-motion: reduce` 下没有循环旋转、漂移或闪烁，长按进度仍正常工作。
- 塔罗样式测试、完整前端测试、TypeScript 构建和 Vite 构建全部通过。

## 测试策略

先在 `tarotRitualStyles.test.ts` 写失败断言，要求 aura 结构、92px/34px 轨迹、外环与内环关键帧、星屑与金色流光关键帧、窄屏变量和 reduced-motion 禁用规则存在。确认失败原因是新行为尚未实现后，再最小化修改 TSX 和 CSS。实现后运行聚焦测试、完整前端测试与构建，并在 320px 和 390px 视口下检查无溢出和遮挡。
