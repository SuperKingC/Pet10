import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PetState } from '../domain/types'
import { suitDisplayWidth, type OutfitPieces } from '../domain/wardrobeModel'
import { type NestPetAct } from '../domain/nestPetAct'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import { DANMAKU_MAX_CONCURRENT, getDanmakuPlan, pickDanmakuText } from '../features/main/xiaoduoliDanmaku'
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
// 叼球道具：照顾栏玩趣同款蓝色皮球（随包资产，免 COS 加载），挂 bobber 跟随颠步
const ballAsset = require('../assets/items/item-ball-fetch-v1.png')
// 睡姿/行进幕底图走 COS 按需下载（水彩大图不占包体），未就绪时保持站姿不切换
const SLEEP_POSE_FILE = 'xiaoduoli-sleep-v1.png'
const WALK_FRAME_A_FILE = 'xiaoduoli-walk-a-v1.png'
const WALK_FRAME_B_FILE = 'xiaoduoli-walk-b-v1.png'
// 名片入口小卡走 COS 按需下载（同路径图会被工具缓存，换图必须升文件名），未就绪时同款 CSS 卡面兜底
const CARD_ENTRY_FILE = 'pet-card-entry-v2.png'
// ensureFile 的下载链路（downloadFile+saveFile）在部分环境会失败（系统代理拦截 localhost、IDE 域名校验私有设置覆盖等），
// 失败时回退 <Image> 直连 URL：image 组件不受 downloadFile 域名校验约束，本地静态服务/COS 均可直接显示
const actAssetUrl = (file: string) => `${resolveAssetBaseUrl()}/wardrobe/${file}`
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
}

/** 弹幕横幅在场景上半部漂浮（避开小多利头顶以下区域） */
const DANMAKU_TOP_RANGE = [8, 38] as const

export function PetStatusCard({ pet, onOpenMemories, suitKey, outfitPieces, act = 'stand' }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  // flow 模式立绘按固定高度换算宽度（图盒=容器盒，配饰百分比定位与图对齐）；高度与当前 .pet-avatar-image 240px 盒一致。
  // 主体服装走切件叠加后画布恒为原装 436/700 比例，宽度按 default 换算。
  // 立绘必须显式宽高（flowHeight）而非 widthFix：兄弟节点 setData 时微信会重测量 widthFix 图，开关名片/切回小窝立绘就闪一下
  // 注意内联宽度必须显式 rpx：Taro 只转换样式表里的 px，内联 px 会按设备像素渲染（=双倍 rpx），立绘撑出盒底被场景裁脚
  const outfitWidth = outfitPieces ? suitDisplayWidth('default', 240) : null
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([])
  const [sleepSrc, setSleepSrc] = useState<string | null>(null)
  const [moveAssets, setMoveAssets] = useState<{ frameA: string; frameB: string; doll: string } | null>(null)
  const [cardEntrySrc, setCardEntrySrc] = useState<string | null>(null)
  const [cardEntryLoaded, setCardEntryLoaded] = useState(false)
  const sleeping = act === 'sleep'
  const moving = act === 'wander' || act === 'fetch'
  // 三张行进素材齐了才播分镜；没就绪时保持站姿，动作静默跳过
  const movingVisible = moving && moveAssets !== null

  useEffect(() => {
    let cancelled = false
    void suitAssets.ensureFile(SLEEP_POSE_FILE)
      .then((path) => { if (!cancelled) setSleepSrc(path ?? actAssetUrl(SLEEP_POSE_FILE)) })
      .catch(() => { if (!cancelled) setSleepSrc(actAssetUrl(SLEEP_POSE_FILE)) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    void suitAssets.ensureFile(CARD_ENTRY_FILE)
      .then((path) => { if (!cancelled) setCardEntrySrc(path ?? actAssetUrl(CARD_ENTRY_FILE)) })
      .catch(() => { if (!cancelled) setCardEntrySrc(actAssetUrl(CARD_ENTRY_FILE)) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      suitAssets.ensureFile(WALK_FRAME_A_FILE),
      suitAssets.ensureFile(WALK_FRAME_B_FILE),
    ])
      .then(([frameA, frameB]) => {
        if (cancelled) return
        setMoveAssets({
          frameA: frameA ?? actAssetUrl(WALK_FRAME_A_FILE),
          frameB: frameB ?? actAssetUrl(WALK_FRAME_B_FILE),
          doll: ballAsset,
        })
      })
      .catch(() => { if (!cancelled) setMoveAssets({
        frameA: actAssetUrl(WALK_FRAME_A_FILE),
        frameB: actAssetUrl(WALK_FRAME_B_FILE),
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

  const spawnDanmaku = useCallback((count: number) => {
    if (count <= 0) return
    const items: DanmakuItem[] = []
    for (let i = 0; i < count; i++) {
      const id = ++danmakuIdRef.current
      const item: DanmakuItem = {
        id,
        text: pickDanmakuText(pet, danmakuIndexRef.current++),
        top: DANMAKU_TOP_RANGE[0] + ((id * 53) % (DANMAKU_TOP_RANGE[1] - DANMAKU_TOP_RANGE[0])),
        duration: 6 + (id % 4),
      }
      removeTimersRef.current.push(setTimeout(() => {
        setDanmaku((current) => current.filter((entry) => entry.id !== id))
      }, item.duration * 1000 + 100))
      items.push(item)
    }
    setDanmaku((current) => [...current, ...items])
  }, [pet])

  // 状态刷新（动作后服务端返回新 pet）→ 连发庆祝弹幕
  useEffect(() => {
    if (lastPetRef.current === pet) return
    lastPetRef.current = pet
    spawnDanmaku(getDanmakuPlan(pet).burst)
  }, [pet, spawnDanmaku])

  // 周期弹幕：按情绪档位定频率；睡觉时不飘弹幕，只留 Zzz；首条 2s 内出现让用户立刻看到
  useEffect(() => {
    if (!plan.active || sleeping) return
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
            style={{ top: `${item.top}%`, animationDuration: `${item.duration}s` }}
          >
            {item.text}
          </Text>
        ))}
        <Text className="pet-level">Lv.{pet.level}</Text>
        <View className="pet-avatar-image" style={outfitWidth ? { width: `${outfitWidth}rpx` } : undefined}>
          <View className={`pet-avatar-stand${sleeping || movingVisible ? ' pet-avatar-stand--hidden' : ''}`}>
            {portrait}
          </View>
          {moveAssets && act !== 'sleep' && (
            <View className={`pet-move-stage pet-move-stage--${act}`} aria-hidden>
              <View className="pet-move-travel">
                <View className="pet-move-hop">
                  <View className="pet-move-bobber">
                    <Image className="pet-move-frame" src={moveAssets.frameA} mode="aspectFit" />
                    <Image className="pet-move-frame pet-move-frame--b" src={moveAssets.frameB} mode="aspectFit" />
                    {/* 叼着的球挂进 bobber 且压在帧上层：叼在张开的嘴前，跟随颠步/轻摇一起动 */}
                    <Image className="pet-move-doll pet-move-doll--carry" src={moveAssets.doll} mode="aspectFit" />
                  </View>
                </View>
                {/* 落地的玩偶留在 travel 层不随颠步：抛出弹地后停留再淡出 */}
                <Image className="pet-move-doll pet-move-doll--drop" src={moveAssets.doll} mode="aspectFit" />
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
