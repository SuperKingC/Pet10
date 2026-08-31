import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { wardrobeApi } from '../../services/wardrobeApi'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import { matchSummary, suitBadge, type WardrobeView } from '../../domain/wardrobeModel'
import './MiniappWardrobePanel.scss'

interface MiniappWardrobePanelProps {
  roomId: string
  onClose(): void
  /** 保存装扮/提交默契后通知外层刷新（小窝立绘与底部默契卡） */
  onChanged?(): void
}

const CLOUD_PENDING_HINT = '这件的画稿在云端，联网打开衣柜会自动取回来'

// 衣柜面板：上半实时预览 + 下半目录网格；默契换装每天一次，双方一致即达成。
// 解锁判定全部来自服务端，面板只展示与提交。
export function MiniappWardrobePanel({ roomId, onClose, onChanged }: MiniappWardrobePanelProps) {
  const [view, setView] = useState<WardrobeView | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [assetMap, setAssetMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(() => {
    if (!roomId) return
    void wardrobeApi.get(roomId).then((next) => {
      setView(next)
      // 解锁的套装静默预取云端素材（失败不提示，卡片回退「素材准备中」态）
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
  const currentImage = assetMap[currentKey] ?? suitAssets.getCachedSuitImage(currentKey)
  const assetReady = Boolean(currentImage)

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
      <View className="wardrobe-panel__top">
        <MiniappBackButton onClick={onClose} />
        <Text className="wardrobe-panel__title">衣柜</Text>
      </View>
      <Text className="wardrobe-panel__caption">给小多利换装扮，每天还能和对方玩一次「默契换装」。</Text>

      <View className="wardrobe-panel__preview">
        <View className="wardrobe-panel__preview-polaroid">
          {currentImage ? (
            <Image className="wardrobe-panel__preview-suit" src={currentImage} mode="aspectFit" />
          ) : (
            <>
              <Image className="wardrobe-panel__preview-fallback" src={suitAssets.resolveSuitPortrait('default')} mode="aspectFit" />
              <Text className="wardrobe-panel__preview-pending">画稿云端准备中…</Text>
            </>
          )}
          <Text className="wardrobe-panel__preview-name">{currentItem?.name ?? '原装小多利'}</Text>
        </View>
        <View className="wardrobe-panel__match">
          <Text className="wardrobe-panel__match-summary">{view ? matchSummary(view.match) : '…'}</Text>
          {view && view.match.streak > 0 && (
            <Text className="wardrobe-panel__match-streak">🔥 连胜 {view.match.streak} 天 · 最高 {view.match.bestStreak} 天</Text>
          )}
        </View>
      </View>

      <View className="wardrobe-grid">
        {view === null && <View className="wardrobe-grid__skeleton" />}
        {view !== null && view.items.map((item) => {
          const image = assetMap[item.key] ?? suitAssets.getCachedSuitImage(item.key)
          const badge = suitBadge(item)
          return (
            <View
              className={`wardrobe-card${item.key === currentKey ? ' wardrobe-card--selected' : ''}${item.unlocked ? '' : ' wardrobe-card--locked'}`}
              key={item.key}
              onClick={() => { if (item.unlocked) setSelectedKey(item.key) }}
            >
              {badge && <Text className="wardrobe-card__badge">{badge}</Text>}
              {item.unlocked ? (
                image ? (
                  <Image className="wardrobe-card__suit" src={image} mode="aspectFit" />
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
              {item.unlocked && item.key === equipped && <Text className="wardrobe-card__equipped">穿着中</Text>}
            </View>
          )
        })}
      </View>

      {view && !assetReady && currentItem?.unlocked && (
        <Text className="wardrobe-panel__hint">{CLOUD_PENDING_HINT}</Text>
      )}

      <View className="wardrobe-panel__actions">
        <View
          className={`wardrobe-panel__save${currentItem?.unlocked && assetReady ? '' : ' wardrobe-panel__save--disabled'}`}
          onClick={() => void save()}
        >
          <Text>{saving ? '保存中…' : '保存装扮'}</Text>
        </View>
        <View
          className={`wardrobe-panel__match-btn${view?.match.myPick || !currentItem?.unlocked ? ' wardrobe-panel__match-btn--disabled' : ''}`}
          onClick={() => void submitMatch()}
        >
          <Text>{view?.match.myPick ? '今日已提交' : submitting ? '提交中…' : '就选它，提交默契'}</Text>
        </View>
      </View>
    </View>
  )
}
