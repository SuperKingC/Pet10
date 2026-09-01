import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { PetAction } from '../../domain/types'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
import { NEST_PET_SLEEP_MS, NEST_PET_STAND_ACT, reduceNestPetAct, type NestPetActState } from '../../domain/nestPetAct'
import { unlockRoom } from '../../domain/xiaoduoliUnlock'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import { MiniappContributionBoard } from './MiniappContributionBoard'
import { MiniappNestLetter } from './MiniappNestLetter'
import { MiniappNestTaskPanel } from './MiniappNestTaskPanel'
import { MiniappPhotoWallPanel } from './MiniappPhotoWallPanel'
import { MiniappWardrobePanel } from './MiniappWardrobePanel'
import { MiniappPetCardModal } from './MiniappPetCardModal'
import { getNestSceneMode, shouldLockNestPageScroll, type NestSceneMode } from './miniappViewModel'
import { socialApi, type MiniappContribution } from '../../services/socialApi'
import { wardrobeApi } from '../../services/wardrobeApi'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import { reconcileStoredUnlock, writeUnlockState } from '../../services/xiaoduoliUnlockStorage'
import type { WardrobeView } from '../../domain/wardrobeModel'
import './MiniappNestView.scss'

const wardrobe = require('../../assets/nest/wardrobe-v2.png')
const photoWall = require('../../assets/nest/photo-wall-v2.png')
const tasks = require('../../assets/nest/tasks-v2.png')
interface MiniappNestViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  boxPhase: 'idle' | 'jumping'
  onAction(action: PetAction): void
  onOpenMemories(): void
  onSceneModeChange(mode: NestSceneMode): void
  onJumpFinished(): void
  /** 空状态/锁定态点击底部邀请按钮时触发（打开选择合养好友弹窗） */
  onInvitePress?(): void
  /** 底部操作区（反馈文案 + 邀请/解锁按钮），锁定态时渲染进固定层 */
  footer?: ReactNode
}

export function MiniappNestView({
  context,
  pet,
  roomId,
  boxPhase,
  onAction,
  onOpenMemories,
  onSceneModeChange,
  onJumpFinished,
  onInvitePress,
  footer,
}: MiniappNestViewProps) {
  const [contributions, setContributions] = useState<MiniappContribution[]>([])
  const [taskPanelOpen, setTaskPanelOpen] = useState(false)
  const [wardrobePanelOpen, setWardrobePanelOpen] = useState(false)
  const [photoWallPanelOpen, setPhotoWallPanelOpen] = useState(false)
  const [petCardOpen, setPetCardOpen] = useState(false)
  const [wardrobeView, setWardrobeView] = useState<WardrobeView | null>(null)
  // 小窝行为幕：照顾动作驱动（睡觉 → 入睡 20s，其余动作唤醒），纯函数判定 + 组件侧定时器回收
  const [petAct, setPetAct] = useState<NestPetActState>(NEST_PET_STAND_ACT)
  const petSleeping = petAct.act === 'sleep'

  const handlePetAction = useCallback((action: PetAction) => {
    setPetAct((current) => reduceNestPetAct(current, { action, now: Date.now() }))
    onAction(action)
  }, [onAction])

  useEffect(() => {
    if (!petSleeping) return
    const timer = setTimeout(() => setPetAct(NEST_PET_STAND_ACT), NEST_PET_SLEEP_MS)
    return () => clearTimeout(timer)
  }, [petSleeping, petAct.wakeAt])
  const [unlock, setUnlock] = useState(() => reconcileStoredUnlock(
    (context?.rooms ?? []).filter((room) => room.pet).map((room) => room.id),
  ))

  useEffect(() => {
    setUnlock(reconcileStoredUnlock(
      (context?.rooms ?? []).filter((room) => room.pet).map((room) => room.id),
    ))
  }, [context])

  const finishJump = useCallback(() => {
    setUnlock((current) => {
      const next = unlockRoom(current ?? { initialized: true, unlockedRoomIds: [] }, roomId)
      writeUnlockState(next)
      return next
    })
    onJumpFinished()
  }, [onJumpFinished, roomId])

  useEffect(() => {
    if (!roomId) {
      setContributions([])
      return
    }
    let cancelled = false
    void socialApi.listContributions(roomId)
      .then((result) => { if (!cancelled) setContributions(result) })
      .catch(() => { if (!cancelled) setContributions([]) })
    return () => { cancelled = true }
  }, [roomId])

  // 衣柜状态（当前套装 + 今日默契）：小窝立绘替换与底部默契卡共用；GET 顺带幂等结算当日默契
  const [suitAssetVersion, setSuitAssetVersion] = useState(0)
  const refreshWardrobe = useCallback(() => {
    if (!roomId) return
    void wardrobeApi.get(roomId)
      .then((view) => {
        setWardrobeView(view)
        // 解锁套装静默预取云端素材，取回后触发一次重渲染换上立绘
        void suitAssets.ensureSuitAssets(view.items.filter((item) => item.unlocked).map((item) => item.key))
          .then((assets) => { if (Object.keys(assets).length > 0) setSuitAssetVersion((version) => version + 1) })
      })
      .catch(() => setWardrobeView(null))
  }, [roomId])

  useEffect(() => {
    refreshWardrobe()
  }, [refreshWardrobe])

  const names = Object.fromEntries(
    (context?.rooms ?? []).flatMap((room) => [[room.partner.id, room.partner.displayName] as const]),
  )
  const sceneMode = getNestSceneMode(context, pet, roomId, unlock)
  // 名片上的铲屎官署名：当前账号 + 共养好友
  const petCardOwners = [
    context?.user.displayName,
    context?.rooms.find((room) => room.id === roomId)?.partner.displayName,
  ].filter((name): name is string => Boolean(name && name.trim()))

  useEffect(() => {
    onSceneModeChange(sceneMode)
  }, [onSceneModeChange, sceneMode])

  const nestHeader = (
    <View className="miniapp-page-header miniapp-nest__header">
      <Text className="miniapp-page-title miniapp-nest__title">小窝</Text>
    </View>
  )

  if (shouldLockNestPageScroll(sceneMode)) {
    return (
      <View className="nest-lock-layer">
        <View className="miniapp-nest">
          {nestHeader}
          <View className="miniapp-nest__scene">
            <MiniappNestLetter
              boxPhase={boxPhase}
              effectSeed={roomId || 'invite'}
              onJumpFinished={finishJump}
            />
          </View>
        </View>
        {footer}
      </View>
    )
  }

  return (
    <>
      <View className="miniapp-nest">
        {nestHeader}
        <View className="miniapp-nest__scene">
          {sceneMode === 'active' && pet
            ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} suitKey={wardrobeView?.equipped ?? 'default'} onOpenCard={() => setPetCardOpen(true)} sleeping={petSleeping} />
            : <View className="miniapp-nest__loading" />}

          {sceneMode === 'active' && (
            <View className="miniapp-nest__shortcuts">
              <View className="miniapp-nest__shortcut" onClick={() => setWardrobePanelOpen(true)}>
                <Image src={wardrobe} mode="aspectFit" />
              </View>
              <View className="miniapp-nest__shortcut" onClick={() => setPhotoWallPanelOpen(true)}>
                <Image src={photoWall} mode="aspectFit" />
              </View>
              <View className="miniapp-nest__shortcut" onClick={() => setTaskPanelOpen(true)}>
                <Image src={tasks} mode="aspectFit" />
              </View>
            </View>
          )}
        </View>

        {sceneMode === 'active' && pet && <PetActionBar roomId={roomId} onAction={handlePetAction} />}

        {sceneMode === 'active' && <MiniappContributionBoard contributions={contributions} names={names} />}
      </View>
      {sceneMode === 'active' && pet && (
        <MiniappPetCardModal
          open={petCardOpen}
          pet={pet}
          owners={petCardOwners}
          onClose={() => setPetCardOpen(false)}
        />
      )}
      {taskPanelOpen && (
        <View className="journal-anniv-overlay">
          <MiniappNestTaskPanel roomId={roomId} onClose={() => setTaskPanelOpen(false)} />
        </View>
      )}
      {wardrobePanelOpen && (
        <View className="journal-anniv-overlay">
          <MiniappWardrobePanel
            roomId={roomId}
            onClose={() => setWardrobePanelOpen(false)}
            onChanged={refreshWardrobe}
          />
        </View>
      )}
      {photoWallPanelOpen && (
        <View className="journal-anniv-overlay">
          <MiniappPhotoWallPanel roomId={roomId} onClose={() => setPhotoWallPanelOpen(false)} />
        </View>
      )}
      {footer}
    </>
  )
}
