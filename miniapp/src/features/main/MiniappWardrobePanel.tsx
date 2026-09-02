import { useCallback, useEffect, useState } from 'react'
import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { wardrobeApi } from '../../services/wardrobeApi'
import { readTestOutfit, writeTestOutfit } from '../../services/gmTestStorage'
import { buildMockWardrobeView } from '../../domain/gmTestMode'
import { suitAssets, type SuitFiles } from '../../services/wardrobeSuitAssets'
import {
  EMPTY_OUTFIT,
  matchSummary,
  outfitPiecesFromView,
  suitBadge,
  suitCategory,
  suitDisplayWidth,
  wardrobePages,
  type OutfitPieces,
  type SuitCategory,
  type SuitKey,
  type WardrobeView
} from '../../domain/wardrobeModel'
import { MiniappOutfitPortrait } from './MiniappOutfitPortrait'
import './MiniappWardrobePanel.scss'

const CLOUD_PENDING_HINT = '画稿在云端，联网打开衣柜会自动取回来'

/** 内景大图走 COS 按需下载：优先华丽舞台内景 v3，未上 COS 时回退 v2，再回退面板渐变底 */
const DECOR_INTERIOR_FILES = ['wardrobe-interior-v3.jpg', 'wardrobe-interior-v2.jpg']

const lockBadge = require('../../assets/wardrobe/lock-badge-v1.png')

interface MiniappWardrobePanelProps {
  roomId: string
  /** GM 本地测试模式：目录/解锁/保存全走本地模拟，不请求服务端 */
  gmTest?: boolean
  onClose(): void
  /** 保存装扮/提交默契后通知外层刷新（小窝立绘与底部默契卡） */
  onChanged?(): void
}

// 衣柜面板：「华丽舞台」试衣间场景 + 按类别穿戴（主体服装单选 + 配饰单件制：帽/巾/包互斥）。
// 默契换装每天一次，双方主体一致即达成。解锁判定全部来自服务端，面板只展示与提交；
// GM 本地测试模式（gmTest）例外：目录/解锁来自本地模拟，保存写本地持久化。
export function MiniappWardrobePanel({ roomId, gmTest = false, onClose, onChanged }: MiniappWardrobePanelProps) {
  const [view, setView] = useState<WardrobeView | null>(null)
  const [pieces, setPieces] = useState<OutfitPieces>(EMPTY_OUTFIT)
  const [assetMap, setAssetMap] = useState<Record<string, SuitFiles>>({})
  const [backdropSrc, setBackdropSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeKind, setActiveKind] = useState<SuitCategory>('body')

  useEffect(() => {
    let cancelled = false
    const tryLoad = async (index: number): Promise<void> => {
      if (cancelled || index >= DECOR_INTERIOR_FILES.length) return
      try {
        const file = DECOR_INTERIOR_FILES[index]
        const path = await suitAssets.ensureFile(file)
        if (path) {
          if (!cancelled) setBackdropSrc(path)
        } else {
          await tryLoad(index + 1)
        }
      } catch {
        await tryLoad(index + 1)
      }
    }
    void tryLoad(0)
    return () => { cancelled = true }
  }, [])

  const refresh = useCallback(() => {
    // GM 本地测试模式：模拟视图（全部解锁）+ 本地持久化的穿戴；素材仍从 COS 预取
    if (gmTest) {
      const pieces = readTestOutfit()
      const next = buildMockWardrobeView(pieces)
      setView(next)
      setPieces(pieces)
      void suitAssets.ensureSuitAssets(next.items.map((item) => item.key))
        .then((assets) => setAssetMap((current) => ({ ...current, ...assets })))
      return
    }
    if (!roomId) return
    void wardrobeApi.get(roomId).then((next) => {
      setView(next)
      setPieces(outfitPiecesFromView(next))
      // 全量静默预取（含未解锁）：锁定套装也要能看到真实样子（置灰展示）
      void suitAssets.ensureSuitAssets(next.items.map((item) => item.key))
        .then((assets) => setAssetMap((current) => ({ ...current, ...assets })))
    }).catch(() => setView(null))
  }, [roomId, gmTest])

  useEffect(() => {
    setView(null)
    setPieces(EMPTY_OUTFIT)
    refresh()
  }, [refresh])

  const unlockedCount = view ? view.items.filter((item) => item.unlocked).length : 0
  const bodyFiles = assetMap[pieces.body] ?? suitAssets.getCachedSuitFiles(pieces.body)
  // 主体服装=切件叠加：切件就位才算就绪（未就绪先显示原装立绘+提示）
  const assetReady = pieces.body === 'default' || Boolean(bodyFiles?.layer)

  const save = async () => {
    if (!roomId || !view || saving) return
    setSaving(true)
    try {
      // GM 本地测试模式：只写本地持久化，外层据此刷新小窝立绘
      if (gmTest) {
        writeTestOutfit(pieces)
        Taro.showToast({ title: '已换上（本地测试）', icon: 'none' })
        onChanged?.()
        return
      }
      await wardrobeApi.setEquipped(roomId, pieces)
      Taro.showToast({ title: '换好啦！', icon: 'none' })
      onChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message.includes('locked') ? '有件还没解锁哦' : '没保存上，再试试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const submitMatch = async () => {
    if (!roomId || !view || submitting || view.match.myPick) return
    setSubmitting(true)
    try {
      // GM 本地测试模式：只在本地登记今日选择（无服务端结算）
      if (gmTest) {
        setView((current) => (current ? { ...current, match: { ...current.match, myPick: pieces.body } } : current))
        Taro.showToast({ title: '已登记（本地测试，不走服务端）', icon: 'none' })
        return
      }
      const match = await wardrobeApi.submitMatchPick(roomId, pieces.body)
      Taro.showToast({
        title: match.matchedToday ? `心有灵犀！连胜 ${match.streak} 天` : '已提交，等 TA 揭晓',
        icon: 'none'
      })
      onChanged?.()
      refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({
        title: message.includes('already_picked') ? '今天已经提交过啦'
          : message.includes('locked') ? '这套还没解锁哦'
          : '没提交上，再试试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const togglePiece = (key: string, unlocked: boolean, conditionText: string) => {
    const category = suitCategory(key as SuitKey)
    if (!unlocked) {
      Taro.showToast({ title: conditionText || '还没解锁哦', icon: 'none' })
      return
    }
    if (category === 'body') {
      // 再点已穿的主体服装=脱下（回到裸狗）；目录已无「原装小多利」卡
      setPieces((current) => ({ ...current, body: current.body === key ? 'default' : (key as SuitKey) }))
      return
    }
    // 配饰单件制：三类配饰互斥，选新件自动摘下其它（主体服装与配饰各只能选一件）
    const wearing = pieces[category as Exclude<SuitCategory, 'body'>] === key
    setPieces((current) => ({ ...current, hat: null, scarf: null, bag: null, [category]: wearing ? null : (key as SuitKey) }))
  }

  const renderItem = (item: WardrobeView['items'][number], index: number) => {
    const category = suitCategory(item.key)
    const isBody = category === 'body'
    const worn = isBody ? pieces.body === item.key : pieces[category as Exclude<SuitCategory, 'body'>] === item.key
    const files = assetMap[item.key] ?? suitAssets.getCachedSuitFiles(item.key)
    const iconSrc = item.key === 'default'
      ? suitAssets.resolveSuitDisplay('default')
      : files?.icon
    const badge = suitBadge(item)
    return (
      <View
        className={[
          'wardrobe-card',
          worn && item.unlocked ? 'wardrobe-card--selected' : '',
          item.unlocked ? '' : 'wardrobe-card--locked'
        ].join(' ')}
        key={item.key}
        style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
        onClick={() => togglePiece(item.key, item.unlocked, item.conditionText)}
      >
        {worn && item.unlocked && (
          <View className="wardrobe-card__ribbon"><Text>{isBody ? '穿着中' : '已佩戴'}</Text></View>
        )}
        {badge && <Text className="wardrobe-card__badge">{badge}</Text>}
        {worn && item.unlocked && (
          <View className="wardrobe-card__tick"><Text>✓</Text></View>
        )}
        {item.unlocked ? (
          iconSrc ? (
            <Image className="wardrobe-card__suit" src={iconSrc} mode="aspectFit" />
          ) : (
            <View className="wardrobe-card__suit wardrobe-card__suit--pending">
              <Text className="wardrobe-card__pending-text">云端准备中</Text>
            </View>
          )
        ) : (
          <View className="wardrobe-card__suit wardrobe-card__suit--locked">
            {iconSrc && <Image className="wardrobe-card__suit-img" src={iconSrc} mode="aspectFit" />}
            <Image className="wardrobe-card__lock-badge" src={lockBadge} mode="aspectFit" />
          </View>
        )}
        <Text className="wardrobe-card__name">{item.name}</Text>
        {!item.unlocked && <Text className="wardrobe-card__condition">{item.conditionText}</Text>}
      </View>
    )
  }

  // 目录分页：标签页（服饰/配饰）+ Swiper 联动，每页最多 6 件（2×3）完整显示，
  // 同类超出 6 件切块成多页左右滑（wardrobeModel.wardrobePages）
  const pages = view ? wardrobePages(view.items) : []
  const activeIndex = Math.max(0, pages.findIndex((page) => page.kind === activeKind))
  const onPageChange = (event: { detail: { current: number } }) => {
    const kind = pages[event.detail.current]?.kind
    if (kind && kind !== activeKind) setActiveKind(kind)
  }

  return (
    <View className="wardrobe-panel">
      {backdropSrc && <Image className="wardrobe-panel__backdrop" src={backdropSrc} mode="widthFix" />}
      <View className="wardrobe-panel__backdrop-fade" />
      <View className="wardrobe-panel__top">
        <MiniappBackButton onClick={onClose} />
        <Text className="wardrobe-panel__title">衣柜</Text>
        {view && (
          <View className="wardrobe-panel__count">
            <View className="wardrobe-panel__count-dots">
              {view.items.map((item) => (
                <View
                  key={item.key}
                  className={`wardrobe-panel__count-dot${item.unlocked ? ' wardrobe-panel__count-dot--on' : ''}`}
                />
              ))}
            </View>
            <Text>已解锁 {unlockedCount}/{view.items.length}</Text>
          </View>
        )}
      </View>

      {/* 试衣间场景：小多利站上华丽舞台（内景即舞台，聚光柔光+名牌浮层）。
          立绘盒恒为原装 436/700 比例（主体服装走切件叠加），高度 330 缩小一档让戴帽不出场景顶 */}
      <View className="wardrobe-scene">
        <View className="wardrobe-scene__portrait" style={{ width: `${suitDisplayWidth('default', 330)}rpx` }}>
          <MiniappOutfitPortrait pieces={pieces} flowHeight={330} />
        </View>
        {!assetReady && (
          <Text className="wardrobe-scene__pending">画稿云端准备中…</Text>
        )}
        <View className="wardrobe-scene__spark wardrobe-scene__spark--a" />
        <View className="wardrobe-scene__spark wardrobe-scene__spark--b" />
      </View>

      <View className="wardrobe-match">
        <View className="wardrobe-match__head">
          <Text className="wardrobe-match__title">今日默契换装</Text>
          {view && view.match.streak > 0 && (
            <View className="wardrobe-match__flame"><Text>🔥×{view.match.streak}</Text></View>
          )}
        </View>
        <Text className="wardrobe-match__summary">{view ? matchSummary(view.match) : '…'}</Text>
        {view && view.match.streak > 0 && (
          <View className="wardrobe-match__streak-row">
            <View className="wardrobe-match__chip"><Text>当前 {view.match.streak} 天</Text></View>
            <View className="wardrobe-match__chip wardrobe-match__chip--ghost"><Text>最高 {view.match.bestStreak} 天</Text></View>
          </View>
        )}
      </View>

      <View className="wardrobe-rack">
        <View className="wardrobe-rack__pole" />
        {view !== null && (
          <View className="wardrobe-tabs">
            <View
              hoverClass="wardrobe-tab--press"
              hoverStayTime={120}
              className={`wardrobe-tab${activeKind === 'body' ? ' wardrobe-tab--on' : ''}`}
              onClick={() => setActiveKind('body')}
            >
              <Text>🐾 服饰</Text>
            </View>
            <View
              hoverClass="wardrobe-tab--press"
              hoverStayTime={120}
              className={`wardrobe-tab${activeKind === 'accessory' ? ' wardrobe-tab--on' : ''}`}
              onClick={() => setActiveKind('accessory')}
            >
              <Text>🎀 配饰</Text>
            </View>
            <Text className="wardrobe-tabs__hint">{activeKind === 'body' ? '选一件穿上，再点脱下' : '选一件配饰，再点摘下'}</Text>
          </View>
        )}
        {view === null && (
          <View className="wardrobe-grid">
            <View className="wardrobe-grid__skeleton" />
          </View>
        )}
        {view !== null && (
          <Swiper
            className="wardrobe-pager"
            style={{ height: activeKind === 'body' ? '516rpx' : '306rpx' }}
            current={activeIndex}
            onChange={onPageChange}
          >
            {pages.map((page, pageIndex) => (
              <SwiperItem key={`${page.kind}-${pageIndex}`}>
                <View className="wardrobe-page">
                  <View className="wardrobe-grid__cards">
                    {page.items.map(renderItem)}
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        )}
        {/* 自绘翻页指示点：与卡片分离下移，不互挡 */}
        {view !== null && pages.length > 1 && (
          <View className="wardrobe-pager__dots">
            {pages.map((_, pageIndex) => (
              <View
                key={pageIndex}
                className={`wardrobe-pager__dot${pageIndex === activeIndex ? ' wardrobe-pager__dot--on' : ''}`}
              />
            ))}
          </View>
        )}
      </View>

      {view && !assetReady && (
        <Text className="wardrobe-panel__hint">{CLOUD_PENDING_HINT}</Text>
      )}

      <View className="wardrobe-panel__actions">
        <View
          hoverClass="wardrobe-btn--press"
          hoverStayTime={120}
          className={`wardrobe-btn wardrobe-btn--save${view ? '' : ' wardrobe-btn--disabled'}`}
          onClick={() => void save()}
        >
          <Text>{saving ? '保存中…' : '保存装扮'}</Text>
        </View>
        <View
          hoverClass="wardrobe-btn--press"
          hoverStayTime={120}
          className={`wardrobe-btn wardrobe-btn--match${view?.match.myPick ? ' wardrobe-btn--disabled' : ''}`}
          onClick={() => void submitMatch()}
        >
          <Text>{view?.match.myPick ? '今日已提交' : submitting ? '提交中…' : '就选它，提交默契'}</Text>
        </View>
      </View>
    </View>
  )
}
