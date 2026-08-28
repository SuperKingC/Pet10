import { Image, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useState } from 'react'
import type { PetAction } from '../../domain/types'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
import { unlockRoom } from '../../domain/xiaoduoliUnlock'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import { MiniappContributionBoard } from './MiniappContributionBoard'
import { MiniappNestLetter } from './MiniappNestLetter'
import { getNestSceneMode, type NestSceneMode } from './miniappViewModel'
import { socialApi, type MiniappContribution } from '../../services/socialApi'
import { reconcileStoredUnlock, writeUnlockState } from '../../services/xiaoduoliUnlockStorage'
import './MiniappNestView.scss'

const wardrobe = require('../../assets/nest/wardrobe.webp')
const photoWall = require('../../assets/nest/photo-wall.webp')
const tasks = require('../../assets/nest/tasks.webp')
interface MiniappNestViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  boxPhase: 'idle' | 'jumping'
  onAction(action: PetAction): void
  onOpenMemories(): void
  onSceneModeChange(mode: NestSceneMode): void
  onJumpFinished(): void
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
}: MiniappNestViewProps) {
  const [contributions, setContributions] = useState<MiniappContribution[]>([])
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

  const names = Object.fromEntries(
    (context?.rooms ?? []).flatMap((room) => [[room.partner.id, room.partner.displayName] as const]),
  )
  const sceneMode = getNestSceneMode(context, pet, roomId, unlock)

  useEffect(() => {
    onSceneModeChange(sceneMode)
  }, [onSceneModeChange, sceneMode])

  return (
    <View className="miniapp-nest">
      <View className="miniapp-page-header miniapp-nest__header">
        <Text className="miniapp-page-title miniapp-nest__title">小窝</Text>
        <Text className="miniapp-page-caption miniapp-nest__greeting">
          {sceneMode === 'active' ? '记录你们和小多利的共同生活。' : '记录你和小多利的共同生活。'}
        </Text>
      </View>

      <View className="miniapp-nest__scene">
        {sceneMode === 'active' && pet
          ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} />
          : sceneMode === 'empty' || sceneMode === 'locked'
            ? <MiniappNestLetter
                boxPhase={boxPhase}
                effectSeed={roomId || 'invite'}
                onJumpFinished={finishJump}
              />
            : <View className="miniapp-nest__loading" />}

        {sceneMode === 'active' && (
          <View className="miniapp-nest__shortcuts">
            <View className="miniapp-nest__shortcut">
              <Image src={wardrobe} mode="aspectFit" />
            </View>
            <View className="miniapp-nest__shortcut">
              <Image src={photoWall} mode="aspectFit" />
            </View>
            <View className="miniapp-nest__shortcut">
              <Image src={tasks} mode="aspectFit" />
            </View>
          </View>
        )}
      </View>

      {sceneMode === 'active' && pet && <PetActionBar onAction={onAction} />}

      {sceneMode === 'active' && <MiniappContributionBoard contributions={contributions} names={names} />}

    </View>
  )
}
