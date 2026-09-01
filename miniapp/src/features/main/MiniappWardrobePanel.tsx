import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { wardrobeApi } from '../../services/wardrobeApi'
import { suitAssets, type SuitFiles } from '../../services/wardrobeSuitAssets'
import { matchSummary, suitBadge, type WardrobeView } from '../../domain/wardrobeModel'
import { MiniappOutfitPortrait } from './MiniappOutfitPortrait'
import './MiniappWardrobePanel.scss'

interface MiniappWardrobePanelProps {
  roomId: string
  onClose(): void
  /** 保存装扮/提交默契后通知外层刷新（小窝立绘与底部默契卡） */
  onChanged?(): void
}

const CLOUD_PENDING_HINT = '这件的画稿在云端，联网打开衣柜会自动取回来'

const DECOR_INTERIOR_FILE = 'wardrobe-interior-v2.jpg'

// 衣柜面板：左侧「试衣间」拍立得舞台实时预览，右侧默契换装气泡；下方服装挂杆网格。
// 默契换装每天一次，双方一致即达成。解锁判定全部来自服务端，面板只展示与提交。
export function MiniappWardrobePanel({ roomId, onClose, onChanged }: MiniappWardrobePanelProps) {
  const [view, setView] = useState<WardrobeView | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [assetMap, setAssetMap] = useState<Record<string, SuitFiles>>({})
  const [backdropSrc, setBackdropSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // 内景装饰大图走 COS 按需下载（不占包体），失败回退面板渐变底
    let cancelled = false
    void suitAssets.ensureFile(DECOR_INTERIOR_FILE)
      .then((path) => { if (!cancelled && path) setBackdropSrc(path) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  const refresh = useCallback(() => {
    if (!roomId) return
    void wardrobeApi.get(roomId).then((next) => {
      setView(next)
      // 解锁套装静默预取云端素材（服装特写+立绘），失败不提示，卡片回退「云端准备中」态
      void suitAssets.ensureSuitAssets(next.items.filter((item) => item.unlocked).map((item) => item.key))
        .then((assets) => setAssetMap((current) => ({ ...current, ...assets })))
    }).catch(() => setView(null))
  }, [roomId])

  useEffect(() => {
    setView(null)
    refresh()
  }, [refresh])

  const equipped = view?.equipped ?? 'default'
  const currentKey = selectedKey ?? equipped
  const currentItem = view?.items.find((item) => item.key === currentKey)
  const currentFiles = assetMap[currentKey] ?? suitAssets.getCachedSuitFiles(currentKey)
  const assetReady = Boolean(currentFiles)
  const unlockedCount = view ? view.items.filter((item) => item.unlocked).length : 0

  const save = async () => {
    if (!roomId || !view || saving || !currentItem?.unlocked) return
    setSaving(true)
    try {
      await wardrobeApi.setEquipped(roomId, currentItem.key)
      Taro.showToast({ title: '换好啦！', icon: 'none' })
      onChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message.includes('locked') ? '这套还没解锁哦' : '没保存上，再试试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const submitMatch = async () => {
    if (!roomId || !view || submitting || !currentItem?.unlocked || view.match.myPick) return
    setSubmitting(true)
    try {
      const match = await wardrobeApi.submitMatchPick(roomId, currentItem.key)
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

  return (
    <View className="wardrobe-panel">
      {backdropSrc && <Image className="wardrobe-panel__backdrop" src={backdropSrc} mode="widthFix" />}
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
      {/* 试衣间场景：小多利直接站在衣柜内景的地板上（内景大图即舞台，聚光灯/星星/名牌浮层） */}
      <View className="wardrobe-scene">
        <View className="wardrobe-scene__portrait">
          <MiniappOutfitPortrait suitKey={currentItem?.unlocked ? currentKey : 'default'} />
        </View>
        {!assetReady && currentItem?.unlocked && (
          <Text className="wardrobe-scene__pending">画稿云端准备中…</Text>
        )}
        <View className="wardrobe-scene__name">
          <Text>{currentItem?.name ?? '原装小多利'}</Text>
        </View>
        <View className="wardrobe-scene__spark wardrobe-scene__spark--a" />
        <View className="wardrobe-scene__spark wardrobe-scene__spark--b" />
      </View>

      <View className="wardrobe-match">
        <View className="wardrobe-match__tail" />
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
        <View className="wardrobe-grid">
          {view === null && <View className="wardrobe-grid__skeleton" />}
          {view !== null && view.items.map((item) => {
            // 原装小多利没有服装素材文件，卡片直接展示原装立绘
            const iconSrc = item.key === 'default'
              ? suitAssets.resolveSuitDisplay('default')
              : (assetMap[item.key] ?? suitAssets.getCachedSuitFiles(item.key))?.icon
            const badge = suitBadge(item)
            const isSelected = item.key === currentKey
            return (
              <View
                className={[
                  'wardrobe-card',
                  isSelected ? 'wardrobe-card--selected' : '',
                  item.unlocked ? '' : 'wardrobe-card--locked'
                ].join(' ')}
                key={item.key}
                onClick={() => { if (item.unlocked) setSelectedKey(item.key) }}
              >
                {item.unlocked && item.key === equipped && (
                  <View className="wardrobe-card__ribbon"><Text>穿着中</Text></View>
                )}
                {badge && <Text className="wardrobe-card__badge">{badge}</Text>}
                {isSelected && item.unlocked && (
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
                    <Text className="wardrobe-card__lock">🔒</Text>
                  </View>
                )}
                <Text className="wardrobe-card__name">{item.name}</Text>
                {!item.unlocked && <Text className="wardrobe-card__condition">{item.conditionText}</Text>}
              </View>
            )
          })}
        </View>
      </View>

      {view && !assetReady && currentItem?.unlocked && (
        <Text className="wardrobe-panel__hint">{CLOUD_PENDING_HINT}</Text>
      )}

      <View className="wardrobe-panel__actions">
        <View
          hoverClass="wardrobe-btn--press"
          hoverStayTime={120}
          className={`wardrobe-btn wardrobe-btn--save${currentItem?.unlocked ? '' : ' wardrobe-btn--disabled'}`}
          onClick={() => void save()}
        >
          <Text>{saving ? '保存中…' : '保存装扮'}</Text>
        </View>
        <View
          hoverClass="wardrobe-btn--press"
          hoverStayTime={120}
          className={`wardrobe-btn wardrobe-btn--match${view?.match.myPick || !currentItem?.unlocked ? ' wardrobe-btn--disabled' : ''}`}
          onClick={() => void submitMatch()}
        >
          <Text>{view?.match.myPick ? '今日已提交' : submitting ? '提交中…' : '就选它，提交默契'}</Text>
        </View>
      </View>
    </View>
  )
}
