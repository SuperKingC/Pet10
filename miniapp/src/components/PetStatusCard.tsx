import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PetState } from '../domain/types'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import { getXiaoduoliSpeech } from '../features/main/xiaoduoliSpeech'
import { DANMAKU_MAX_CONCURRENT, getDanmakuPlan, pickDanmakuText } from '../features/main/xiaoduoliDanmaku'
import { suitAssets } from '../services/wardrobeSuitAssets'
import './PetStatusCard.scss'

type Props = {
  pet: PetState
  onOpenMemories?: () => void
  /** 衣柜当前套装 key（空/default 显示原装小多利） */
  suitKey?: string | null
  /** 点「小多利」名片打开名片弹窗 */
  onOpenCard?: () => void
  /** 小窝行为幕：睡觉动作后为 true，立绘交叉淡入为四脚朝天睡姿 */
  sleeping?: boolean
}
const roomBackground = require('../assets/room-background-v5.jpg')
// 睡姿底图走 COS 按需下载（水彩大图不占包体），未就绪时保持站姿不切换
const SLEEP_POSE_FILE = 'xiaoduoli-sleep-v1.png'
// 四项状态各自同色系渐变（深→浅），与经验条同一质感语言
const statuses = [
  ['饱食', 'hunger', '#f3a85d', '#f8c48d'],
  ['心情', 'mood', '#ed7e9a', '#f4aabd'],
  ['精力', 'energy', '#66b9ad', '#93d0c6'],
  ['健康', 'health', '#82a9e9', '#adc7f0'],
] as const

// 闲聊飘字轮播间隔：与气泡动画节奏错开，读得完再换下一句
const SPEECH_ROTATE_MS = 6000

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

export function PetStatusCard({ pet, onOpenMemories, suitKey, onOpenCard, sleeping }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  const [speechIndex, setSpeechIndex] = useState(0)
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([])
  const [sleepSrc, setSleepSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void suitAssets.ensureFile(SLEEP_POSE_FILE)
      .then((path) => { if (!cancelled && path) setSleepSrc(path) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setSpeechIndex((index) => index + 1), SPEECH_ROTATE_MS)
    return () => clearInterval(timer)
  }, [])
  // 睡觉时飘字定格为「Zzz……」，不再轮播闲聊
  const speech = sleeping ? 'Zzz……' : getXiaoduoliSpeech(pet, speechIndex)

  // 背景元素固定不变：memo 掉，避免换飘字重渲染时触发图片重测量
  const backdrop = useMemo(
    () => <Image className="pet-card-background" src={roomBackground} mode="aspectFill" />,
    [],
  )

  // 弹幕：按心情计划周期飘 + 状态刷新（喂食/玩耍等）时连发；reduced-motion 不启用
  const plan = useMemo(() => getDanmakuPlan(pet), [pet])
  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ), [])
  const danmakuIdRef = useRef(0)
  const danmakuIndexRef = useRef(0)
  const removeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const lastPetRef = useRef(pet)

  useEffect(() => () => {
    removeTimersRef.current.forEach(clearTimeout)
    removeTimersRef.current = []
  }, [])

  const spawnDanmaku = useCallback((count: number) => {
    if (reducedMotion || count <= 0) return
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
  }, [pet, reducedMotion])

  // 状态刷新（动作后服务端返回新 pet）→ 连发庆祝弹幕
  useEffect(() => {
    if (lastPetRef.current === pet) return
    lastPetRef.current = pet
    spawnDanmaku(getDanmakuPlan(pet).burst)
  }, [pet, spawnDanmaku])

  // 周期弹幕：按情绪档位定频率；睡觉时不飘弹幕，只留 Zzz
  useEffect(() => {
    if (!plan.active || reducedMotion || sleeping) return
    const timer = setInterval(() => spawnDanmaku(1), plan.intervalMs)
    return () => clearInterval(timer)
  }, [plan, reducedMotion, sleeping, spawnDanmaku])

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
        <View className="pet-avatar-image">
          <View className={`pet-avatar-stand${sleeping ? ' pet-avatar-stand--hidden' : ''}`}>
            <MiniappOutfitPortrait suitKey={suitKey} />
          </View>
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
        {/* 气泡常驻不重挂载：换文案只替换文本，避免重挂载引起背景闪动 */}
        <View className="pet-speech">
          <Text className="pet-speech__text">{speech}</Text>
        </View>
        <View
          className="pet-name-card"
          hoverClass="pet-name-card--hover"
          hoverStayTime={80}
          onClick={onOpenCard}
        >
          <Text className="pet-name-card__name">{pet.name}</Text>
          <Text className="pet-name-card__hint">名片</Text>
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
