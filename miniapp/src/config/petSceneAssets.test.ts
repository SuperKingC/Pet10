import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp pet scene assets', () => {
  it('bundles the PWA room background within the miniapp image budget', () => {
    const backgroundPath = resolve(miniappRoot(), 'src/assets/room-background-v11.jpg')
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )

    expect(existsSync(backgroundPath)).toBe(true)
    expect(statSync(backgroundPath).size).toBeLessThanOrEqual(180 * 1024)
    expect(componentSource).toContain("require('../assets/room-background-v11.jpg')")
  })

  it('renders the flow portrait with explicit box size instead of widthFix so it never flashes', () => {
    // widthFix 图在兄弟节点 setData 时被微信重测量：开关名片、切回小窝立绘都会闪一下；
    // 立绘主体必须显式宽高（flowHeight 240/330）+ aspectFill（衣柜场景 330 缩小一档让戴帽不出场景顶）
    const portraitSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappOutfitPortrait.tsx'), 'utf8')
    const statusCardSource = readFileSync(resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'), 'utf8')
    const wardrobeSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappWardrobePanel.tsx'), 'utf8')

    expect(portraitSource).toMatch(/outfit-portrait__image--flow" src=\{baseDisplay\} mode="aspectFill"/)
    expect(portraitSource).not.toMatch(/image--flow" src=\{baseDisplay\} mode="widthFix"/)
    expect(portraitSource).toContain('flowHeight')
    expect(statusCardSource).toContain('flowHeight={240}')
    expect(wardrobeSource).toContain('flowHeight={330}')
  })

  it('sleep pose ships via COS static assets and the nest scene wires the sleep act', () => {
    const sleepPosePath = resolve(miniappRoot(), '../public/wardrobe/xiaoduoli-sleep-v1.png')
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )
    const nestViewSource = readFileSync(
      resolve(miniappRoot(), 'src/features/main/MiniappNestView.tsx'),
      'utf8',
    )

    expect(existsSync(sleepPosePath)).toBe(true)
    expect(statSync(sleepPosePath).size).toBeLessThanOrEqual(180 * 1024)
    expect(componentSource).toContain("suitAssets.ensureFile(SLEEP_POSE_FILE)")
    expect(componentSource).toContain('pet-avatar-sleep')
    expect(nestViewSource).toContain('act={petAct.act}')
  })

  it('walk frames ship via COS and the fetch ball rides bundled assets', () => {
    // 闲逛用闭嘴 v1 帧，叼球才用大嘴 v2 帧（按 act 切换，闲逛不张嘴）
    const files = ['xiaoduoli-walk-a-v1.png', 'xiaoduoli-walk-b-v1.png', 'xiaoduoli-walk-a-v2.png', 'xiaoduoli-walk-b-v2.png']
    for (const fileName of files) {
      const assetPath = resolve(miniappRoot(), `../public/wardrobe/${fileName}`)
      expect(existsSync(assetPath), fileName).toBe(true)
      expect(statSync(assetPath).size, fileName).toBeLessThanOrEqual(180 * 1024)
    }
    // 叼球道具 = 照顾栏玩趣同款蓝色皮球，随包出件免 COS 加载
    const ballAssetPath = resolve(miniappRoot(), 'src/assets/items/item-ball-fetch-v1.png')
    expect(existsSync(ballAssetPath)).toBe(true)
    expect(statSync(ballAssetPath).size).toBeLessThanOrEqual(20 * 1024)
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )

    expect(componentSource).toContain('WANDER_FRAME_A_FILE')
    expect(componentSource).toContain('WANDER_FRAME_B_FILE')
    expect(componentSource).toContain('FETCH_FRAME_A_FILE')
    expect(componentSource).toContain('FETCH_FRAME_B_FILE')
    expect(componentSource).toContain('pet-move-mouth pet-move-mouth--closed')
    expect(componentSource).toContain('pet-move-mouth pet-move-mouth--open')
    expect(componentSource).toContain("act === 'wander' && (")
    // 球压在帧上层（球在前缩小让嘴可见）：张嘴包装层内的 carry 在帧之后渲染
    const openMouth = componentSource.slice(
      componentSource.indexOf('pet-move-mouth--open'),
      componentSource.indexOf('pet-move-mouth--open') + 800,
    )
    expect(openMouth.indexOf('pet-move-doll--carry')).toBeGreaterThan(openMouth.indexOf('pet-move-frame'))
    expect(componentSource).toContain("require('../assets/items/item-ball-fetch-v1.png')")
    expect(componentSource).toContain('pet-move-stage')
    expect(componentSource).toContain('pet-move-doll--carry')
  })

  it('turn choreography pauses before flipping and the fetch return fades in instead of popping', () => {
    // 掉头平滑化契约：到边先停步再翻面（scaleX 连续过 0 缓冲）；步态素材原生朝左（眼鼻在左），
    // 闲逛去程向右必须 scaleX(-1)，否则是倒着跑；叼娃场外换向后边走入边淡入（26%→30%）；
    // 娃娃与狗同步淡入不再瞬现；舞台 224×144、脚线 bottom 50px 落在墙脚线地面（y≈412）
    const sceneStyle = readFileSync(resolve(miniappRoot(), 'src/components/PetStatusCard.scss'), 'utf8')

    const stageBlock = sceneStyle.match(/\.pet-move-stage \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(stageBlock).toContain('bottom: 0;')
    expect(stageBlock).toContain('height: 175px;')
    // 舞台宽度按 act 分：闲逛 272（v1 画布 468）/叼球 300（v2 画布 514），狗显示高一致
    expect(sceneStyle).toContain('.pet-move-stage--wander { width: 272px; margin-left: -136px; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch { width: 300px; margin-left: -150px; }')
    // mouth-open 整体上移 14px：v2 帧构图头部更低，底对齐后视觉偏下看不全
    // mouth 层不在四边定位规则成员里，微信 image 又不吃推导尺寸——必须自身带绝对定位+显式宽高（022310f 后 fdd1c4e 无效的教训）
    // 切层动画写在包装 View 上（写在 Image 上会覆盖帧 B 淡化→两帧同屏八条腿）；层内帧 A/B 保持互斥淡化
    expect(sceneStyle).toContain('.pet-move-mouth { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-mouth--closed { right: auto; width: 273px; animation: pet-fetch-mouth-closed 11s step-end forwards; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-mouth--open { bottom: 14px; animation: pet-fetch-mouth-open 11s step-end forwards; }')

    const wanderBlock = sceneStyle.match(/@keyframes pet-wander-travel \{[\s\S]*?\n\}/)?.[0] ?? ''
    // 横穿全场、屏幕外掉头：中间（面朝左）→整只跑出左屏（±480≈舞台 272 全出画）→屏幕外停步掉头→
    // 冲刺横穿→整只跑出右屏→屏幕外掉头→跑回中间到位即收接站姿
    expect(wanderBlock).toContain('0% { transform: translateX(0) scaleX(1); }')
    expect(wanderBlock).toContain('22% { transform: translateX(-480px) scaleX(1); }')
    expect(wanderBlock).toContain('26% { transform: translateX(-480px) scaleX(1); }')
    expect(wanderBlock).toContain('32% { transform: translateX(-480px) scaleX(-1); }')
    expect(wanderBlock).toContain('60% { transform: translateX(480px) scaleX(-1); }')
    expect(wanderBlock).toContain('64% { transform: translateX(480px) scaleX(-1); }')
    expect(wanderBlock).toContain('70% { transform: translateX(480px) scaleX(1); }')
    expect(wanderBlock).toContain('100% { transform: translateX(0) scaleX(1); }')

    const fetchBlock = sceneStyle.match(/@keyframes pet-fetch-travel \{[\s\S]*?\n\}/)?.[0] ?? ''
    // 叼娃与闲逛同款出画掉头：无屏幕内淡出（自然裁切）、无屏幕内驻足，11s = NEST_PET_FETCH_MS
    expect(fetchBlock).toContain('22% { transform: translateX(-480px) scaleX(1); }')
    expect(fetchBlock).toContain('32% { transform: translateX(-480px) scaleX(-1); }')
    expect(fetchBlock).toContain('60% { transform: translateX(480px) scaleX(-1); }')
    expect(fetchBlock).toContain('70% { transform: translateX(480px) scaleX(1); }')
    expect(fetchBlock).toContain('88%, 100% { transform: translateX(0) scaleX(1); }')
    expect(fetchBlock).not.toContain('opacity')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-travel { animation: pet-fetch-travel 11s ease-in-out forwards; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-hop { animation: pet-fetch-hop 11s ease-in-out forwards; }')
    // 叼球浮动：球随跑动上下颠（0.42s 独立 bob 与步频同拍，叠在整体颠步之外）；双动画逗号并列
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-doll--carry { animation: pet-doll-carry-bob .42s ease-in-out infinite, pet-fetch-doll-carry 11s step-end forwards; }')
    expect(sceneStyle).not.toContain('pet-move-doll--drop')

    // 玩具球只保留叼着的一只（挂 bobber 压帧上层），抛出即消失、无落地停留段（放下球直接坐好）
    expect(sceneStyle).toContain('.pet-move-doll--carry { left: 8px; top: 71px; animation: pet-doll-carry-bob .42s ease-in-out infinite; }')
    const carryBob = sceneStyle.match(/@keyframes pet-doll-carry-bob \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(carryBob).toContain('50% { transform: translateY(3px); }')
    const dollCarry = sceneStyle.match(/@keyframes pet-fetch-doll-carry \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(dollCarry).toContain('30%, 87% { opacity: 1; }')
    expect(dollCarry).toContain('88%, 100% { opacity: 0; }')
    expect(sceneStyle).not.toContain('pet-fetch-doll-drop')

    // fetch 收尾定格：帧交替/颠步只跑 23 次（23×0.42s≈88%×11s 跑到位即停），forwards 停在 A 可见静止末态
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-frame { animation: pet-fetch-frame-a .42s linear 23 forwards; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-frame--b { opacity: 0; animation: pet-fetch-frame-b .42s linear 23 forwards; }')
    expect(sceneStyle).toContain('.pet-move-stage--fetch .pet-move-bobber { animation: pet-fetch-bob .42s ease-in-out 23 forwards; }')
    expect(sceneStyle).toMatch(/\.pet-move-bobber \{ animation: pet-move-bob \.42s ease-in-out infinite; transform-origin: 50% 100%; \}/)
    expect(sceneStyle).toContain('.pet-move-travel, .pet-move-hop, .pet-move-bobber { will-change: transform; }')
    // image 组件不吃四边推导尺寸（背景/娃娃/名牌图均显式宽高才正常）：步态帧必须显式撑满舞台，
    // 否则按微信 image 默认 300×225 渲染（巨大且向舞台右下溢出，四边定位修不掉）
    expect(sceneStyle).toContain('.pet-move-frame { width: 100%; height: 100%; will-change: opacity; animation: pet-move-frame-a .42s linear infinite; }')
    // 两帧互斥交替：A 常亮+B 叠加会透出「前面四条腿」重影（两帧腿部姿态不同），硬切又像两张图来回跳；
    // 改为 A/B 各自半周期隐身 + 8% 线性淡变（运动模糊式过渡），reduced-motion 双帧一并静止
    expect(sceneStyle).toContain('.pet-move-frame--b { opacity: 0; animation: pet-move-frame-b .42s linear infinite; }')
    const frameABlock = sceneStyle.match(/@keyframes pet-move-frame-a \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(frameABlock).toContain('0%, 42% { opacity: 0; }')
    expect(frameABlock).toContain('50%, 92% { opacity: 1; }')
    const frameBBlock = sceneStyle.match(/@keyframes pet-move-frame-b \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(frameBBlock).toContain('0%, 42% { opacity: 1; }')
    expect(frameBBlock).toContain('50%, 92% { opacity: 0; }')
    expect(sceneStyle).toContain('.pet-move-frame, .pet-move-bobber { animation: none; }')
  })
})
