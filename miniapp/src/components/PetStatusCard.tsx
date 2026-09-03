import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PetState } from '../domain/types'
import { suitDisplayWidth, type OutfitPieces } from '../domain/wardrobeModel'
import { type NestPetAct } from '../domain/nestPetAct'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import { ACTION_BURST, ACTION_BURST_STAGGER_MS, DANMAKU_MAX_CONCURRENT, getDanmakuPlan, pickDanmakuText } from '../features/main/xiaoduoliDanmaku'
import { suitAssets } from '../services/wardrobeSuitAssets'
import { resolveAssetBaseUrl } from '../services/assetBaseUrl'
import './PetStatusCard.scss'

type Props = {
  pet: PetState
  onOpenMemories?: () => void
  /** 衣柜当前套装 key（旧用法：单套装；优先用 outfitPieces） */
  suitKey?: string | null
  /** 按类别完整穿戴（主体+配饰多层叠加）；缺省时回退 suitKey 单套装展示 */
  outfitPieces?: OutfitPieces
  /** 小窝行为幕：非站姿时立绘切换对应分镜（素材未就绪保持站姿不切换） */
  act?: NestPetAct
}
const roomBackground = require('../assets/room-background-v11.jpg')
// 睡姿/名片改随包：下载链路（ensureFile→直链回退）在开发者工具会因域名校验/代理失败导致狗不见、名片显旧
const sleepBundled = require('../assets/wardrobe/xiaoduoli-sleep-v1.png')
const cardEntryBundled = require('../assets/wardrobe/pet-card-entry-v3.png')
// 叼球道具：照顾栏玩趣同款蓝色皮球（随包资产，免 COS 加载），挂 bobber 跟随颠步
const ballAsset = require('../assets/items/item-ball-fetch-v1.png')
// 闲逛用闭嘴跑步态（v1），叼球才用大张嘴步态（v2，嘴缝夹球）——两套画布不同由 CSS 按 act 切舞台宽
const WANDER_FRAME_A_FILE = 'xiaoduoli-walk-a-v1.png'
const WANDER_FRAME_B_FILE = 'xiaoduoli-walk-b-v1.png'
const FETCH_FRAME_A_FILE = 'xiaoduoli-walk-a-v2.png'
const FETCH_FRAME_B_FILE = 'xiaoduoli-walk-b-v2.png'
// 趴下休息姿（闭眼单帧）与站姿眨眼眼层（眼组+眼窝底毛条带）走 COS 按需下载（不占包体），
// 未就绪时趴下静默跳过保持站姿、眨眼不叠层（原眼仍在，观感正常）
const LYING_POSE_FILE = 'xiaoduoli-lying-v1.png'
const SIT_EYES_FILE = 'xiaoduoli-sit-eyes-v1.png'
const SIT_UNDERLAY_FILE = 'xiaoduoli-sit-underlay-v1.png'
// 步态帧走 COS 按需下载（水彩大图不占包体），ensureFile 失败时回退 <Image> 直连 URL
const actAssetUrl = (file: string) => `${resolveAssetBaseUrl()}/wardrobe/${file}`
// 站姿眨眼：眼组条带在 436×700 立绘图盒内的定位与压扁支点（与 cut-xiaoduoli-sit-eye-layers.mjs 出件常量同源）；
// 图盒 149×240px → 缩放系数 149/436，条带显示尺寸与偏移按此换算写死进 SCSS
const SIT_BLINK_INTERVAL_MIN_MS = 2200
const SIT_BLINK_INTERVAL_MAX_MS = 6200
// 四项状态各自同色系渐变（深→浅），与经验条同一质感语言
const statuses = [
  ['饱食', 'hunger', '#f3a85d', '#f8c48d'],
  ['心情', 'mood', '#ed7e9a', '#f4aabd'],
  ['精力', 'energy', '#66b9ad', '#93d0c6'],
  ['健康', 'health', '#82a9e9', '#adc7f0'],
] as const

interface DanmakuItem {
  id: number
  text: string
  /** 场景内纵向位置（百分比） */
  top: number
  /** 漂过整个场景的耗时（秒） */
  duration: number
  /** 起漂延迟（秒）：连发流错峰用，0 = 立即 */
  delay: number
}

/** 弹幕横幅在场景上半部漂浮（避开小多利头顶以下区域） */
const DANMAKU_TOP_RANGE = [8, 38] as const

/** 眨眼间隔：2.2~6.2s 随机（注入 random 便于测试） */
export function nextSitBlinkDelayMs(random: () => number): number {
  return Math.round(
    SIT_BLINK_INTERVAL_MIN_MS + random() * (SIT_BLINK_INTERVAL_MAX_MS - SIT_BLINK_INTERVAL_MIN_MS),
  )
}

export function PetStatusCard({ pet, onOpenMemories, suitKey, outfitPieces, act = 'stand' }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  // flow 模式立绘按固定高度换算宽度（图盒=容器盒，配饰百分比定位与图对齐）；高度与当前 .pet-avatar-image 240px 盒一致。
  // 主体服装走切件叠加后画布恒为原装 436/700 比例，宽度按 default 换算。
  // 立绘必须显式宽高（flowHeight）而非 widthFix：兄弟节点 setData 时微信会重测量 widthFix 图，开关名片/切回小窝立绘就闪一下
  // 注意内联宽度必须显式 rpx：Taro 只转换样式表里的 px，内联 px 会按设备像素渲染（=双倍 rpx），立绘撑出盒底被场景裁脚
  const outfitWidth = outfitPieces ? suitDisplayWidth('default', 240) : null
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([])
  const [sleepSrc, setSleepSrc] = useState<string | null>(null)
  const [moveAssets, setMoveAssets] = useState<{
    wanderA: string; wanderB: string; fetchA: string; fetchB: string; doll: string
  } | null>(null)
  const [cardEntrySrc, setCardEntrySrc] = useState<string | null>(null)
  const [cardEntryLoaded, setCardEntryLoaded] = useState(false)
  const sleeping = act === 'sleep'
  const lying = act === 'lie'
  const moving = act === 'wander' || act === 'fetch'
  // 三张行进素材齐了才播分镜；没就绪时保持站姿，动作静默跳过
  const movingVisible = moving && moveAssets !== null
  // 趴姿素材就绪才切趴下幕；未就绪保持站姿（动作静默跳过）
  const [lyingSrc, setLyingSrc] = useState<string | null>(null)
  const lyingVisible = lying && lyingSrc !== null
  // 眨眼眼层（眼组+眼窝底毛）：就绪后站立时按随机间隔压扁眨眼；未就绪不叠层
  const [sitEyeAssets, setSitEyeAssets] = useState<{ eyes: string; underlay: string } | null>(null)
  const [blinkTick, setBlinkTick] = useState(0)

  useEffect(() => {
    // 睡姿随包：不再走下载缓存（开发者工具下载链路易失败导致狗不见）
    setSleepSrc(sleepBundled)
  }, [])

  useEffect(() => {
    // 名片入口随包：同上（下载失败会一直显示 CSS 兜底旧卡面）
    setCardEntrySrc(cardEntryBundled)
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      suitAssets.ensureFile(LYING_POSE_FILE),
      suitAssets.ensureFile(SIT_EYES_FILE),
      suitAssets.ensureFile(SIT_UNDERLAY_FILE),
    ])
      .then(([lie, eyes, underlay]) => {
        if (cancelled) return
        setLyingSrc(lie ?? actAssetUrl(LYING_POSE_FILE))
        setSitEyeAssets({ eyes: eyes ?? actAssetUrl(SIT_EYES_FILE), underlay: underlay ?? actAssetUrl(SIT_UNDERLAY_FILE) })
      })
      .catch(() => { if (!cancelled) {
        setLyingSrc(actAssetUrl(LYING_POSE_FILE))
        setSitEyeAssets({ eyes: actAssetUrl(SIT_EYES_FILE), underlay: actAssetUrl(SIT_UNDERLAY_FILE) })
      } })
    return () => { cancelled = true }
  }, [])

  // 眨眼调度：站立且眼层就绪时按 2.2~6.2s 随机间隔触发一次压扁动画（key 换挡重放动画；
  // 非 stand 行为幕期间暂停——趴下/睡觉本身闭眼、行进帧无眼层对位）
  useEffect(() => {
    if (act !== 'stand' || !sitEyeAssets) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return
        setBlinkTick((tick) => tick + 1)
        schedule()
      }, nextSitBlinkDelayMs(Math.random))
    }
    schedule()
    return () => { alive = false; clearTimeout(timer) }
  }, [act, sitEyeAssets])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      suitAssets.ensureFile(WANDER_FRAME_A_FILE),
      suitAssets.ensureFile(WANDER_FRAME_B_FILE),
      suitAssets.ensureFile(FETCH_FRAME_A_FILE),
      suitAssets.ensureFile(FETCH_FRAME_B_FILE),
    ])
      .then(([wa, wb, fa, fb]) => {
        if (cancelled) return
        setMoveAssets({
          wanderA: wa ?? actAssetUrl(WANDER_FRAME_A_FILE),
          wanderB: wb ?? actAssetUrl(WANDER_FRAME_B_FILE),
          fetchA: fa ?? actAssetUrl(FETCH_FRAME_A_FILE),
          fetchB: fb ?? actAssetUrl(FETCH_FRAME_B_FILE),
          doll: ballAsset,
        })
      })
      .catch(() => { if (!cancelled) setMoveAssets({
        wanderA: actAssetUrl(WANDER_FRAME_A_FILE),
        wanderB: actAssetUrl(WANDER_FRAME_B_FILE),
        fetchA: actAssetUrl(FETCH_FRAME_A_FILE),
        fetchB: actAssetUrl(FETCH_FRAME_B_FILE),
        doll: ballAsset,
      }) })
    return () => { cancelled = true }
  }, [])

  // 立绘固定元素：memo 掉，避免换飘字重渲染时叠穿层 widthFix 图重测量导致衣服闪现
  const piecesKey = outfitPieces ? `${outfitPieces.body}|${outfitPieces.hat}|${outfitPieces.scarf}|${outfitPieces.bag}` : ''
  const portrait = useMemo(
    () => (outfitPieces
      ? <MiniappOutfitPortrait pieces={outfitPieces} flowHeight={240} />
      : <MiniappOutfitPortrait suitKey={suitKey} />),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [piecesKey, suitKey]
  )
  // 背景元素固定不变：memo 掉，避免换飘字重渲染时触发图片重测量
  const backdrop = useMemo(
    () => <Image className="pet-card-background" src={roomBackground} mode="aspectFill" />,
    [],
  )

  // 弹幕：按心情计划周期飘 + 状态刷新（喂食/玩耍等）时连发（reduced-motion 由 CSS visibility 兜底）
  const plan = useMemo(() => getDanmakuPlan(pet), [pet])
  const danmakuIdRef = useRef(0)
  const danmakuIndexRef = useRef(0)
  const removeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const lastPetRef = useRef(pet)

  useEffect(() => () => {
    removeTimersRef.current.forEach(clearTimeout)
    removeTimersRef.current = []
  }, [])

  const spawnDanmaku = useCallback((count: number, staggerMs = 0) => {
    if (count <= 0) return
    const items: DanmakuItem[] = []
    for (let i = 0; i < count; i++) {
      const id = ++danmakuIdRef.current
      const item: DanmakuItem = {
        id,
        text: pickDanmakuText(pet, danmakuIndexRef.current++),
        top: DANMAKU_TOP_RANGE[0] + ((id * 53) % (DANMAKU_TOP_RANGE[1] - DANMAKU_TOP_RANGE[0])),
        duration: 6 + (id % 4),
        delay: staggerMs > 0 ? (i * staggerMs) / 1000 : 0,
      }
      removeTimersRef.current.push(setTimeout(() => {
        setDanmaku((current) => current.filter((entry) => entry.id !== id))
      }, item.delay * 1000 + item.duration * 1000 + 100))
      items.push(item)
    }
    setDanmaku((current) => [...current, ...items])
  }, [pet])

  // 状态刷新（照顾按钮动作后返回新 pet）→ 10 条错峰弹幕流庆祝
  useEffect(() => {
    if (lastPetRef.current === pet) return
    lastPetRef.current = pet
    spawnDanmaku(ACTION_BURST, ACTION_BURST_STAGGER_MS)
  }, [pet, spawnDanmaku])

  // 周期弹幕：按情绪档位定频率（plan.active 死判断已修——此前周期弹幕从未触发过，只有动作连发在飘）；
  // 睡觉时不飘弹幕只留 Zzz；趴下/行进行为幕不妨碍弹幕（弹幕在场景上半部，与狗错开）；首条 2s 内出现
  useEffect(() => {
    if (sleeping) return
    const first = setTimeout(() => spawnDanmaku(1), 2000)
    const timer = setInterval(() => spawnDanmaku(1), plan.intervalMs)
    return () => { clearTimeout(first); clearInterval(timer) }
  }, [plan, sleeping, spawnDanmaku])

  return (
    <View className="pet-status-card">
      <View className="pet-card-scene">
        {backdrop}
        {danmaku.slice(-DANMAKU_MAX_CONCURRENT).map((item) => (
          <Text
            key={item.id}
            className="pet-danmaku"
            style={{ top: `${item.top}%`, animationDuration: `${item.duration}s`, animationDelay: `${item.delay}s` }}
          >
            {item.text}
          </Text>
        ))}
        <Text className="pet-level">Lv.{pet.level}</Text>
        <View className="pet-avatar-image" style={outfitWidth ? { width: `${outfitWidth}rpx` } : undefined}>
          <View className={`pet-avatar-stand${sleeping || movingVisible || lyingVisible ? ' pet-avatar-stand--hidden' : ''} pet-avatar-stand--breathing`}>
            {portrait}
            {/* 站姿眨眼：眼窝底毛层常驻盖住原眼（静止时逐像素同底图不可见），眼组层按随机间隔
                整组压扁成闭眼线；A/B 两条同款动画类交替触发重播（不重挂 image，避免 COS 图重新加载闪烁） */}
            {sitEyeAssets && (
              <View className="pet-sit-blink" aria-hidden>
                <Image className="pet-sit-blink__underlay" src={sitEyeAssets.underlay} mode="scaleToFill" fadeIn={false} />
                <View className={`pet-sit-blink__group pet-sit-blink__group--${blinkTick % 2 ? 'b' : 'a'}`}>
                  <Image className="pet-sit-blink__eyes" src={sitEyeAssets.eyes} mode="scaleToFill" fadeIn={false} />
                </View>
              </View>
            )}
          </View>
          {/* 趴下休息幕：趴姿闭眼单帧交叉淡入（素材未就绪保持站姿），以底边为轴轻呼吸，到点回站姿 */}
          {lyingSrc && (
            <Image
              className={`pet-avatar-lying${lyingVisible ? ' pet-avatar-lying--on' : ''}`}
              src={lyingSrc}
              mode="aspectFit"
            />
          )}
          {moveAssets && act !== 'sleep' && (
            <View className={`pet-move-stage pet-move-stage--${act}`} aria-hidden>
              <View className="pet-move-travel">
                <View className="pet-move-hop">
                  <View className="pet-move-bobber">
                    {/* mouth 双层包装 View 按分镜进度切层（CSS step-end）；层内帧 A/B 保持各自的互斥淡化动画——
                        切层动画不能直接写在 Image 上，会覆盖帧 B 的淡化导致两帧同屏（八条腿叠影）。
                        闲逛恒闭嘴层；叼球 0~30% 闭嘴去程、30~88% 大嘴 v2 叼球、88% 后闭嘴收口放球 */}
                    {act === 'wander' && (
                      <>
                        <Image className="pet-move-frame" src={moveAssets.wanderA} mode="aspectFit" />
                        <Image className="pet-move-frame pet-move-frame--b" src={moveAssets.wanderB} mode="aspectFit" />
                      </>
                    )}
                    {act === 'fetch' && (
                      <>
                        <View className="pet-move-mouth pet-move-mouth--closed">
                          <Image className="pet-move-frame" src={moveAssets.wanderA} mode="aspectFit" />
                          <Image className="pet-move-frame pet-move-frame--b" src={moveAssets.wanderB} mode="aspectFit" />
                        </View>
                        <View className="pet-move-mouth pet-move-mouth--open">
                          <Image className="pet-move-frame" src={moveAssets.fetchA} mode="aspectFit" />
                          <Image className="pet-move-frame pet-move-frame--b" src={moveAssets.fetchB} mode="aspectFit" />
                          {/* 球在张嘴层内：随该层一起出现/消失，压在帧上层（缩小让嘴可见） */}
                          <Image className="pet-move-doll pet-move-doll--carry" src={moveAssets.doll} mode="aspectFit" />
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
          {sleepSrc && (
            <Image
              className={`pet-avatar-sleep${sleeping ? ' pet-avatar-sleep--on' : ''}`}
              src={sleepSrc}
              mode="aspectFit"
            />
          )}
          {sleeping && (
            <View className="pet-sleep-zzz" aria-hidden>
              <Text className="pet-sleep-zzz__z pet-sleep-zzz__z--1">z</Text>
              <Text className="pet-sleep-zzz__z pet-sleep-zzz__z--2">Z</Text>
              <Text className="pet-sleep-zzz__z pet-sleep-zzz__z--3">Z</Text>
            </View>
          )}
        </View>
        {/* 小多利名牌：纯展示（名片弹窗已按 2026-09-01 反馈移除），手绘卡通小卡叠宠物名 */}
        <View className="pet-name-card" aria-label="小多利名牌">
          {cardEntrySrc && (
            <Image
              className={`pet-name-card__art${cardEntryLoaded ? ' pet-name-card__art--on' : ''}`}
              src={cardEntrySrc}
              mode="aspectFill"
              fadeIn={false}
              onLoad={() => setCardEntryLoaded(true)}
            />
          )}
          <Text className="pet-name-card__name">{pet.name}</Text>
        </View>
        {onOpenMemories && (
          <View className="pet-memory-button" onClick={onOpenMemories}>
            <Text>记忆</Text>
          </View>
        )}
      </View>
      <View className="pet-card-experience">
        <View className="experience-meta"><Text>成长经验</Text><Text>{pet.experience}/{pet.experienceToNextLevel}</Text></View>
        <View className="experience-track"><View style={{ width: `${experiencePercent}%` }} /></View>
        <View className="status-grid">
          {statuses.map(([label, key, tone, toneLight]) => (
            <View className="status-item" key={key}>
              <View className="status-meta"><Text>{label}</Text><Text>{pet[key]}</Text></View>
              <View className="status-track"><View style={{ width: `${pet[key]}%`, background: `linear-gradient(90deg, ${tone}, ${toneLight})` }} /></View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
