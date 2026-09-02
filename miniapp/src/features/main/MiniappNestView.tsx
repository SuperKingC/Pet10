import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { PetAction } from '../../domain/types'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
import type { ItemId } from '../../domain/nestTaskModel'
import { NEST_PET_FETCH_MS, NEST_PET_LIE_MS, NEST_PET_SLEEP_MS, NEST_PET_STAND_ACT, NEST_PET_WANDER_MS, nextLieDelayMs, nextWanderDelayMs, reduceNestPetAct, type NestPetActState } from '../../domain/nestPetAct'
import { unlockRoom } from '../../domain/xiaoduoliUnlock'
import { MOCK_WARDROBE_CATALOG, buildMockWardrobeView } from '../../domain/gmTestMode'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import { MiniappContributionBoard } from './MiniappContributionBoard'
import { MiniappNestLetter } from './MiniappNestLetter'
import { MiniappNestTaskPanel } from './MiniappNestTaskPanel'
import { MiniappPhotoWallPanel } from './MiniappPhotoWallPanel'
import { MiniappWardrobePanel } from './MiniappWardrobePanel'
import { getNestSceneMode, shouldLockNestPageScroll, type NestSceneMode } from './miniappViewModel'
import { socialApi, type MiniappContribution } from '../../services/socialApi'
import { wardrobeApi } from '../../services/wardrobeApi'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import { reconcileStoredUnlock, writeUnlockState } from '../../services/xiaoduoliUnlockStorage'
import { readTestOutfit } from '../../services/gmTestStorage'
import { outfitPiecesFromView, type WardrobeView } from '../../domain/wardrobeModel'
import './MiniappNestView.scss'

const wardrobe = require('../../assets/nest/wardrobe-v2.png')
const photoWall = require('../../assets/nest/photo-wall-v2.png')
const tasks = require('../../assets/nest/tasks-v2.png')
interface MiniappNestViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  boxPhase: 'idle' | 'jumping'
  /** feed 会带上气泡里选中的道具 id（牛奶/骨头） */
  onAction(action: PetAction, itemId?: ItemId): void
  onOpenMemories(): void
  onSceneModeChange(mode: NestSceneMode): void
  onJumpFinished(): void
  /** 空状态/锁定态点击底部邀请按钮时触发（打开选择合养好友弹窗） */
  onInvitePress?(): void
  /** 底部操作区（反馈文案 + 邀请/解锁按钮），锁定态时渲染进固定层 */
  footer?: ReactNode
  /** GM 本地测试模式：照顾动作/衣柜走本地模拟，不依赖服务端 */
  gmTest?: boolean
  /** GM 模拟解锁：强制锁定信纸场景播放盒子跳出动画；跳完不写真实解锁存储 */
  simulateUnlock?: boolean
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
  gmTest = false,
  simulateUnlock = false,
}: MiniappNestViewProps) {
  const [contributions, setContributions] = useState<MiniappContribution[]>([])
  const [taskPanelOpen, setTaskPanelOpen] = useState(false)
  const [wardrobePanelOpen, setWardrobePanelOpen] = useState(false)
  const [photoWallPanelOpen, setPhotoWallPanelOpen] = useState(false)
  const [wardrobeView, setWardrobeView] = useState<WardrobeView | null>(null)
  // 小窝行为幕：照顾动作驱动（睡觉→入睡、玩耍→出发叼娃），站立时按随机间隔自动闲逛一趟；
  // 判定收敛 domain/nestPetAct 纯函数，组件只持状态与定时器回收
  const [petAct, setPetAct] = useState<NestPetActState>(NEST_PET_STAND_ACT)

  const handlePetAction = useCallback((action: PetAction, itemId?: ItemId) => {
    setPetAct((current) => reduceNestPetAct(current, { action, now: Date.now() }))
    onAction(action, itemId)
  }, [onAction])

  // 睡觉/叼娃/趴下到点收幕回站姿
  useEffect(() => {
    if (petAct.act !== 'sleep' && petAct.act !== 'fetch' && petAct.act !== 'lie') return
    const totalMs = petAct.act === 'sleep' ? NEST_PET_SLEEP_MS : petAct.act === 'fetch' ? NEST_PET_FETCH_MS : NEST_PET_LIE_MS
    const timer = setTimeout(() => setPetAct(NEST_PET_STAND_ACT), totalMs)
    return () => clearTimeout(timer)
  }, [petAct.act, petAct.wakeAt])

  // 闲逛调度：站立时随机等待出发一趟；行进中到点收幕
  useEffect(() => {
    if (petAct.act === 'stand') {
      const timer = setTimeout(
        () => setPetAct({ act: 'wander', wakeAt: Date.now() + NEST_PET_WANDER_MS }),
        nextWanderDelayMs(Math.random),
      )
      return () => clearTimeout(timer)
    }
    if (petAct.act === 'wander') {
      const timer = setTimeout(() => setPetAct(NEST_PET_STAND_ACT), NEST_PET_WANDER_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [petAct.act])

  // 趴下调度：站立时独立随机等待趴下一趟（与闲逛各算各的，先到先得，被占时静默跳过本轮）
  useEffect(() => {
    if (petAct.act === 'stand') {
      const timer = setTimeout(
        () => setPetAct({ act: 'lie', wakeAt: Date.now() + NEST_PET_LIE_MS }),
        nextLieDelayMs(Math.random),
      )
      return () => clearTimeout(timer)
    }
    if (petAct.act === 'lie') {
      const timer = setTimeout(() => setPetAct(NEST_PET_STAND_ACT), NEST_PET_LIE_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [petAct.act])
  const [unlock, setUnlock] = useState(() => reconcileStoredUnlock(
    (context?.rooms ?? []).filter((room) => room.pet).map((room) => room.id),
  ))

  useEffect(() => {
    setUnlock(reconcileStoredUnlock(
      (context?.rooms ?? []).filter((room) => room.pet).map((room) => room.id),
    ))
  }, [context])

  const finishJump = useCallback(() => {
    // GM 模拟解锁：只播动画验收表现，不写真实解锁存储，可反复触发
    if (simulateUnlock) {
      onJumpFinished()
      return
    }
    setUnlock((current) => {
      const next = unlockRoom(current ?? { initialized: true, unlockedRoomIds: [] }, roomId)
      writeUnlockState(next)
      return next
    })
    onJumpFinished()
  }, [onJumpFinished, roomId, simulateUnlock])

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

  // 衣柜状态（当前套装 + 今日默契）：小窝立绘替换与底部默契卡共用；GET 顺带幂等结算当日默契。
  // GM 本地测试模式不发 API 请求：视图与穿戴来自本地模拟与本地持久化；素材仍从 COS 预取
  // （静态资源与 API 服务无关，取不到时 resolveSuitDisplay 回退原装立绘）
  const [suitAssetVersion, setSuitAssetVersion] = useState(0)
  const refreshWardrobe = useCallback(() => {
    const prefetchAssets = (keys: string[]) => {
      void suitAssets.ensureSuitAssets(keys)
        .then((assets) => { if (Object.keys(assets).length > 0) setSuitAssetVersion((version) => version + 1) })
    }
    if (gmTest) {
      setWardrobeView(buildMockWardrobeView(readTestOutfit()))
      prefetchAssets(MOCK_WARDROBE_CATALOG.map((item) => item.key))
      return
    }
    if (!roomId) return
    void wardrobeApi.get(roomId)
      .then((view) => {
        setWardrobeView(view)
        // 解锁套装静默预取云端素材，取回后触发一次重渲染换上立绘
        prefetchAssets(view.items.filter((item) => item.unlocked).map((item) => item.key))
      })
      .catch(() => setWardrobeView(null))
  }, [roomId, gmTest])

  useEffect(() => {
    refreshWardrobe()
  }, [refreshWardrobe])

  const names = Object.fromEntries(
    (context?.rooms ?? []).flatMap((room) => [[room.partner.id, room.partner.displayName] as const]),
  )
  const sceneMode = getNestSceneMode(context, pet, roomId, unlock, simulateUnlock)

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
            ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} outfitPieces={wardrobeView ? outfitPiecesFromView(wardrobeView) : undefined} act={petAct.act} />
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

        {sceneMode === 'active' && pet && <PetActionBar roomId={roomId} gmTest={gmTest} onAction={handlePetAction} />}

        {sceneMode === 'active' && <MiniappContributionBoard contributions={contributions} names={names} />}
      </View>
      {taskPanelOpen && (
        <View className="journal-anniv-overlay">
          <MiniappNestTaskPanel roomId={roomId} onClose={() => setTaskPanelOpen(false)} />
        </View>
      )}
      {wardrobePanelOpen && (
        <View className="journal-anniv-overlay">
          <MiniappWardrobePanel
            roomId={roomId}
            gmTest={gmTest}
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
